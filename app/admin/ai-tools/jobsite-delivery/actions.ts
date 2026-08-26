"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireManagerPortalProfile } from "@/lib/auth";
import { DELIVERY_NOTES_PREFIX, DELIVERY_TASK_PREFIX, parseDeliveryRequest, type SavedDeliveryRequest } from "@/lib/delivery-requests";
import { createAdminClient } from "@/lib/supabase/admin";

const requestSchema = z.object({
  storeName: z.string().trim().min(2).max(160),
  orderNumber: z.string().trim().max(160),
  pickupAddress: z.string().trim().min(8).max(300),
  pickupCoordinates: z.string().trim().max(100),
  jobsiteName: z.string().trim().max(160),
  jobsiteAddress: z.string().trim().min(8).max(300),
  jobsiteCoordinates: z.string().trim().max(100),
  pickupContactName: z.string().trim().max(160),
  pickupPhone: z.string().trim().max(40),
  dropoffContactName: z.string().trim().max(160),
  dropoffPhone: z.string().trim().max(40),
  itemDescription: z.string().trim().max(300),
  weightPounds: z.number().positive().max(50),
  scheduledPickupAt: z.iso.datetime().nullable(),
  vehicle: z.enum(["small", "car", "pickup", "van"]),
  speed: z.enum(["flexible", "same-day", "rush"]),
  estimate: z.object({
    estimatedRoadMiles: z.number().nonnegative().max(1000),
    total: z.number().nonnegative().max(100000),
    serviceFee: z.number().nonnegative().max(10000),
  }),
  providerQuote: z.object({
    provider: z.literal("Uber Direct"),
    quoteId: z.string().trim().min(3).max(200),
    total: z.number().nonnegative().max(100000),
    currency: z.string().trim().length(3),
    pickupMinutes: z.number().nonnegative().max(1440).nullable(),
    durationMinutes: z.number().nonnegative().max(1440).nullable(),
    expiresAt: z.iso.datetime(),
  }).optional(),
});

export type DeliveryRequestInput = z.infer<typeof requestSchema>;

export async function saveDeliveryRequestAction(input: DeliveryRequestInput) {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Please complete the store, both addresses, and package details." };

  const { user, profile, access } = await requireManagerPortalProfile();
  if (!access.aiTools) return { ok: false as const, error: "AI Tools access is required." };

  const reference = `DLV-${Date.now().toString().slice(-6)}`;
  const createdAt = new Date().toISOString();
  const request: SavedDeliveryRequest = {
    reference,
    userId: user.id,
    customerName: profile?.full_name || "AvantiaBuild customer",
    customerEmail: user.email || profile?.email || "",
    customerPhone: profile?.phone || user.phone || "",
    ...parsed.data,
    status: "new",
    createdAt,
  };

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("aura_tasks").insert({
    title: `Delivery request · ${reference} · ${request.storeName}`,
    notes: `${DELIVERY_NOTES_PREFIX}${JSON.stringify(request)}`,
    priority: request.speed === "rush" ? "urgent" : request.speed === "same-day" ? "high" : "normal",
    status: "open",
    source_item_key: `${DELIVERY_TASK_PREFIX}${reference.toLowerCase()}`,
  }).select("id").single<{ id: string }>();
  if (error || !data) return { ok: false as const, error: "The delivery request could not be saved. Try again." };

  revalidatePath("/admin/ai-tools/jobsite-delivery");
  revalidatePath("/owner/aura");
  return { ok: true as const, reference, taskId: data.id };
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "quoted", "dispatched", "completed", "cancelled"]),
});

export async function updateDeliveryStatusAction(input: { id: string; status: SavedDeliveryRequest["status"] }) {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid delivery status update." };
  const { access } = await requireManagerPortalProfile();
  if (!access.aiTools) return { ok: false as const, error: "AI Tools access is required." };

  const supabase = createAdminClient();
  const { data, error: loadError } = await supabase
    .from("aura_tasks")
    .select("id,notes,source_item_key")
    .eq("id", parsed.data.id)
    .like("source_item_key", `${DELIVERY_TASK_PREFIX}%`)
    .maybeSingle<{ id: string; notes: string | null; source_item_key: string | null }>();
  if (loadError || !data) return { ok: false as const, error: "Delivery request not found." };

  const request = parseDeliveryRequest(data.notes);
  if (!request) return { ok: false as const, error: "Delivery request data is invalid." };
  const taskStatus = parsed.data.status === "completed" ? "done" : parsed.data.status === "cancelled" ? "cancelled" : "open";
  const { error } = await supabase
    .from("aura_tasks")
    .update({ notes: `${DELIVERY_NOTES_PREFIX}${JSON.stringify({ ...request, status: parsed.data.status })}`, status: taskStatus })
    .eq("id", data.id);
  if (error) return { ok: false as const, error: "The delivery status could not be updated." };

  revalidatePath("/admin/ai-tools/jobsite-delivery");
  revalidatePath("/owner/aura");
  return { ok: true as const };
}
