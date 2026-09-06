import "server-only";

import { DELIVERY_NOTES_PREFIX, parseDeliveryRequest } from "@/lib/delivery-requests";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateProviderDeliveryStatus(input: {
  provider: "Uber Direct" | "Curri";
  deliveryId: string;
  status?: string | null;
  trackingUrl?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  vehicleDescription?: string | null;
  proofOfDeliveryUrls?: string[];
}) {
  const admin = createAdminClient();
  const { data: lock } = await admin.from("delivery_booking_locks").select("task_id").eq("provider", input.provider).eq("provider_delivery_id", input.deliveryId).maybeSingle<{ task_id: string }>();
  if (!lock) return false;
  const { data: task } = await admin.from("aura_tasks").select("id,notes").eq("id", lock.task_id).maybeSingle<{ id: string; notes: string | null }>();
  const request = parseDeliveryRequest(task?.notes || null);
  if (!task || !request?.providerDelivery || request.providerDelivery.deliveryId !== input.deliveryId) return false;

  const status = input.status?.toLowerCase() || request.providerDelivery.status;
  const completed = ["delivered", "completed"].includes(status);
  const cancelled = ["canceled", "cancelled", "failed", "returned"].includes(status);
  const nextRequest = {
    ...request,
    status: completed ? "completed" as const : cancelled ? "cancelled" as const : "dispatched" as const,
    providerDelivery: {
      ...request.providerDelivery,
      status,
      trackingUrl: input.trackingUrl || request.providerDelivery.trackingUrl,
      updatedAt: new Date().toISOString(),
      driverName: input.driverName ?? request.providerDelivery.driverName,
      driverPhone: input.driverPhone ?? request.providerDelivery.driverPhone,
      vehicleDescription: input.vehicleDescription ?? request.providerDelivery.vehicleDescription,
      proofOfDeliveryUrls: input.proofOfDeliveryUrls?.length ? input.proofOfDeliveryUrls : request.providerDelivery.proofOfDeliveryUrls,
    },
  };
  const { error } = await admin.from("aura_tasks").update({
    notes: `${DELIVERY_NOTES_PREFIX}${JSON.stringify(nextRequest)}`,
    status: completed ? "done" : cancelled ? "cancelled" : "open",
  }).eq("id", task.id);
  return !error;
}
