import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionWithProfile } from "@/lib/auth";
import { DELIVERY_NOTES_PREFIX, DELIVERY_TASK_PREFIX, parseDeliveryRequest } from "@/lib/delivery-requests";
import { managerCapabilities } from "@/lib/owner-identity";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

const scheduleSchema = z.object({
  taskId: z.string().uuid(),
  confirmed: z.literal(true),
});

function e164(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (value.trim().startsWith("+") && digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

export async function POST(request: Request) {
  try {
    const { user, profile, supabase } = await getSessionWithProfile();
    if (!user || !supabase) return NextResponse.json({ ok: false, error: "Manager sign-in is required." }, { status: 401 });
    const access = managerCapabilities({
      email: user.email || profile?.email || null,
      role: profile?.role,
      approvalStatus: profile?.approval_status,
      isActive: profile?.is_active,
    });
    if (!access.aiTools) return NextResponse.json({ ok: false, error: "Manager AI Tools access is required." }, { status: 403 });

    const parsed = scheduleSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Confirm this delivery before scheduling it." }, { status: 400 });

    const admin = createAdminClient();
    const { data: task, error: taskError } = await admin
      .from("aura_tasks")
      .select("id,notes,source_item_key")
      .eq("id", parsed.data.taskId)
      .like("source_item_key", `${DELIVERY_TASK_PREFIX}%`)
      .maybeSingle<{ id: string; notes: string | null; source_item_key: string | null }>();
    const deliveryRequest = parseDeliveryRequest(task?.notes || null);
    if (taskError || !task || !deliveryRequest) return NextResponse.json({ ok: false, error: "Delivery request not found." }, { status: 404 });
    if (deliveryRequest.providerDelivery?.deliveryId) return NextResponse.json({ ok: false, error: "This request already has an Uber delivery." }, { status: 409 });
    if (!deliveryRequest.providerQuote || new Date(deliveryRequest.providerQuote.expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ ok: false, error: "The Uber quote expired. Get a new live price and save the request again." }, { status: 409 });
    }

    const pickupPhone = e164(deliveryRequest.pickupPhone || "");
    const dropoffPhone = e164(deliveryRequest.dropoffPhone || "");
    if (!deliveryRequest.pickupContactName || !pickupPhone || !deliveryRequest.dropoffContactName || !dropoffPhone || !deliveryRequest.itemDescription) {
      return NextResponse.json({ ok: false, error: "Add valid pickup and jobsite contacts, US phone numbers, and an item description." }, { status: 400 });
    }

    const scheduledPickupAt = deliveryRequest.scheduledPickupAt && new Date(deliveryRequest.scheduledPickupAt).getTime() > Date.now() + 10 * 60 * 1000
      ? deliveryRequest.scheduledPickupAt
      : null;
    const { data, error } = await supabase.functions.invoke("uber-direct-quote", {
      body: {
        action: "create",
        quoteId: deliveryRequest.providerQuote.quoteId,
        pickupAddress: deliveryRequest.pickupAddress,
        pickupName: deliveryRequest.pickupContactName,
        pickupPhone,
        dropoffAddress: deliveryRequest.jobsiteAddress,
        dropoffName: deliveryRequest.dropoffContactName,
        dropoffPhone,
        itemDescription: deliveryRequest.itemDescription,
        weightPounds: deliveryRequest.weightPounds || 20,
        scheduledPickupAt,
      },
    });
    if (error || !data?.ok || !data.delivery?.deliveryId) {
      return NextResponse.json({ ok: false, error: data?.error || "Uber could not schedule this delivery." }, { status: 502 });
    }

    const providerDelivery = {
      provider: "Uber Direct" as const,
      deliveryId: String(data.delivery.deliveryId),
      trackingUrl: typeof data.delivery.trackingUrl === "string" ? data.delivery.trackingUrl : null,
      status: typeof data.delivery.status === "string" ? data.delivery.status : "pending",
      fee: Number.isFinite(data.delivery.fee) ? Number(data.delivery.fee) : null,
      currency: typeof data.delivery.currency === "string" ? data.delivery.currency : deliveryRequest.providerQuote.currency,
      createdAt: new Date().toISOString(),
    };
    const { error: updateError } = await admin.from("aura_tasks").update({
      notes: `${DELIVERY_NOTES_PREFIX}${JSON.stringify({ ...deliveryRequest, providerDelivery, status: "dispatched" })}`,
      status: "open",
    }).eq("id", task.id);
    if (updateError) return NextResponse.json({ ok: false, error: "Uber accepted the delivery, but Avantia could not save its tracking record. Contact the owner immediately." }, { status: 500 });

    return NextResponse.json({ ok: true, delivery: providerDelivery }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Uber could not schedule this delivery." }, { status: 502 });
  }
}
