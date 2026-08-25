import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export const DELIVERY_TASK_PREFIX = "delivery-request:";
export const DELIVERY_NOTES_PREFIX = "delivery_request_v1:";

export type SavedDeliveryRequest = {
  reference: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  storeName: string;
  orderNumber: string;
  pickupAddress: string;
  pickupCoordinates: string;
  jobsiteName: string;
  jobsiteAddress: string;
  jobsiteCoordinates: string;
  vehicle: string;
  speed: string;
  estimate: {
    estimatedRoadMiles: number;
    total: number;
    serviceFee: number;
  };
  status: "new" | "quoted" | "dispatched" | "completed" | "cancelled";
  createdAt: string;
};

export function parseDeliveryRequest(notes: string | null) {
  if (!notes?.startsWith(DELIVERY_NOTES_PREFIX)) return null;
  try {
    return JSON.parse(notes.slice(DELIVERY_NOTES_PREFIX.length)) as SavedDeliveryRequest;
  } catch {
    return null;
  }
}

export async function loadDeliveryRequests() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("aura_tasks")
    .select("id, notes, created_at, updated_at")
    .like("source_item_key", `${DELIVERY_TASK_PREFIX}%`)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Unable to load delivery requests: ${error.message}`);
  return (data || []).flatMap((row) => {
    const request = parseDeliveryRequest(row.notes);
    return request ? [{ id: row.id, ...request }] : [];
  });
}
