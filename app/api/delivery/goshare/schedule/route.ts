import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionWithProfile } from "@/lib/auth";
import { DELIVERY_NOTES_PREFIX, DELIVERY_TASK_PREFIX, parseDeliveryRequest } from "@/lib/delivery-requests";
import { createGoShareDelivery, GoShareError } from "@/lib/goshare";
import { captureOperationalError } from "@/lib/monitoring/capture-operational-error";
import { managerCapabilities } from "@/lib/owner-identity";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

const scheduleSchema = z.object({ taskId: z.string().uuid(), confirmed: z.literal(true) });
const vehicles = ["small", "car", "pickup", "van", "box-truck"] as const;

export async function POST(request: Request) {
  let lockedTaskId: string | null = null;
  try {
    const { user, profile } = await getSessionWithProfile();
    if (!user) return NextResponse.json({ ok: false, error: "Manager sign-in is required." }, { status: 401 });
    const access = managerCapabilities({ email: user.email || profile?.email || null, role: profile?.role, approvalStatus: profile?.approval_status, isActive: profile?.is_active });
    if (!access.aiTools) return NextResponse.json({ ok: false, error: "Manager AI Tools access is required." }, { status: 403 });
    const parsed = scheduleSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Confirm this delivery before booking it." }, { status: 400 });

    const admin = createAdminClient();
    const { data: task, error: taskError } = await admin.from("aura_tasks").select("id,notes,source_item_key").eq("id", parsed.data.taskId).like("source_item_key", `${DELIVERY_TASK_PREFIX}%`).maybeSingle<{ id: string; notes: string | null; source_item_key: string | null }>();
    const deliveryRequest = parseDeliveryRequest(task?.notes || null);
    if (taskError || !task || !deliveryRequest) return NextResponse.json({ ok: false, error: "Delivery request not found." }, { status: 404 });
    if (deliveryRequest.providerDelivery?.deliveryId) return NextResponse.json({ ok: false, error: "This request already has a provider delivery." }, { status: 409 });
    if (!deliveryRequest.providerQuote || deliveryRequest.providerQuote.provider !== "GoShare" || new Date(deliveryRequest.providerQuote.expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ ok: false, error: "The GoShare estimate expired. Get a new live price and save the request again." }, { status: 409 });
    }
    if (!deliveryRequest.pickupLocation || !deliveryRequest.jobsiteLocation || !deliveryRequest.itemDescription || !deliveryRequest.pickupContactName || !deliveryRequest.pickupPhone || !deliveryRequest.dropoffContactName || !deliveryRequest.dropoffPhone) {
      return NextResponse.json({ ok: false, error: "Choose both address suggestions and add pickup and jobsite contacts before booking." }, { status: 400 });
    }

    const vehicle = vehicles.find((value) => value === deliveryRequest.vehicle) || "pickup";
    const { error: lockError } = await admin.from("delivery_booking_locks").insert({ task_id: task.id, provider: "GoShare", status: "booking" });
    if (lockError) return NextResponse.json({ ok: false, error: "This request is already being booked or was previously sent to a provider." }, { status: 409 });
    lockedTaskId = task.id;

    const delivery = await createGoShareDelivery({
      pickupAddress: deliveryRequest.pickupAddress,
      pickupLocation: deliveryRequest.pickupLocation,
      dropoffAddress: deliveryRequest.jobsiteAddress,
      dropoffLocation: deliveryRequest.jobsiteLocation,
      pickupName: deliveryRequest.pickupContactName,
      pickupPhone: deliveryRequest.pickupPhone,
      dropoffName: deliveryRequest.dropoffContactName,
      dropoffPhone: deliveryRequest.dropoffPhone,
      itemDescription: deliveryRequest.itemDescription,
      packageQuantity: deliveryRequest.packageQuantity || 1,
      weightPerPackage: deliveryRequest.weightPerPackage || 20,
      lengthInches: deliveryRequest.lengthInches,
      widthInches: deliveryRequest.widthInches,
      heightInches: deliveryRequest.heightInches,
      vehicle,
      scheduledPickupAt: deliveryRequest.scheduledPickupAt,
      loadUnloadRequired: deliveryRequest.loadUnloadRequired,
      orderNumber: deliveryRequest.orderNumber,
      reference: deliveryRequest.reference,
    });

    const providerDelivery = { provider: "GoShare" as const, deliveryId: delivery.deliveryId, trackingUrl: delivery.trackingUrl, status: delivery.status, fee: delivery.fee, currency: delivery.currency, createdAt: new Date().toISOString() };
    const { error: updateError } = await admin.from("aura_tasks").update({ notes: `${DELIVERY_NOTES_PREFIX}${JSON.stringify({ ...deliveryRequest, providerDelivery, status: "dispatched" })}`, status: "open" }).eq("id", task.id);
    await admin.from("delivery_booking_locks").update({ status: "accepted", provider_delivery_id: delivery.deliveryId, updated_at: new Date().toISOString() }).eq("task_id", task.id);
    if (updateError) return NextResponse.json({ ok: false, error: "GoShare accepted the delivery, but Avantia could not save its tracking record. Contact the owner immediately." }, { status: 500 });
    return NextResponse.json({ ok: true, delivery: providerDelivery }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (lockedTaskId) {
      const admin = createAdminClient();
      await admin.from("delivery_booking_locks").update({ status: "uncertain", updated_at: new Date().toISOString() }).eq("task_id", lockedTaskId);
    }
    await captureOperationalError(error, { feature: "delivery", operation: "schedule-delivery", provider: "goshare", safeCode: error instanceof GoShareError ? error.code : "goshare-schedule-failed" });
    if (error instanceof GoShareError) return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: 502 });
    return NextResponse.json({ ok: false, error: "GoShare could not book this delivery." }, { status: 502 });
  }
}
