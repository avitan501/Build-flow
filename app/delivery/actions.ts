"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionWithProfile } from "@/lib/auth";
import { DELIVERY_NOTES_PREFIX, DELIVERY_TASK_PREFIX, type SavedDeliveryRequest } from "@/lib/delivery-requests";
import { createAdminClient } from "@/lib/supabase/admin";

const requestSchema = z.object({
  storeName: z.string().trim().min(2).max(160),
  orderNumber: z.string().trim().max(160),
  pickupAddress: z.string().trim().max(300),
  pickupCoordinates: z.string().trim().min(3).max(100),
  jobsiteName: z.string().trim().max(160),
  jobsiteAddress: z.string().trim().max(300),
  jobsiteCoordinates: z.string().trim().min(3).max(100),
  vehicle: z.enum(["small", "car", "pickup", "van"]),
  speed: z.enum(["flexible", "same-day", "rush"]),
  estimate: z.object({
    estimatedRoadMiles: z.number().nonnegative().max(1000),
    total: z.number().nonnegative().max(100000),
    serviceFee: z.number().nonnegative().max(10000),
  }),
});

export type DeliveryRequestInput = z.infer<typeof requestSchema>;

export async function saveDeliveryRequestAction(input: DeliveryRequestInput) {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Please complete the store and both route coordinates." };

  const { user, profile } = await getSessionWithProfile();
  if (!user) return { ok: false as const, needsLogin: true as const, error: "Sign in to save this request to AvantiaBuild." };

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
  const { error } = await supabase.from("aura_tasks").insert({
    title: `Delivery request · ${reference} · ${request.storeName}`,
    notes: `${DELIVERY_NOTES_PREFIX}${JSON.stringify(request)}`,
    priority: request.speed === "rush" ? "urgent" : request.speed === "same-day" ? "high" : "normal",
    status: "open",
    source_item_key: `${DELIVERY_TASK_PREFIX}${reference.toLowerCase()}`,
  });
  if (error) return { ok: false as const, error: `The request could not be saved: ${error.message}` };

  revalidatePath("/owner/delivery-requests");
  revalidatePath("/owner/aura");
  return { ok: true as const, reference };
}
