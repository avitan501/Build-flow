import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeliveryLocation } from "@/lib/location-types";

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
  pickupLocation?: DeliveryLocation | null;
  jobsiteName: string;
  jobsiteAddress: string;
  jobsiteCoordinates: string;
  jobsiteLocation?: DeliveryLocation | null;
  pickupContactName?: string;
  pickupPhone?: string;
  dropoffContactName?: string;
  dropoffPhone?: string;
  itemDescription?: string;
  packageQuantity?: number;
  weightPerPackage?: number;
  lengthInches?: number | null;
  widthInches?: number | null;
  heightInches?: number | null;
  loadUnloadRequired?: boolean;
  weightPounds?: number;
  scheduledPickupAt?: string | null;
  vehicle: string;
  speed: string;
  estimate: {
    estimatedRoadMiles: number;
    total: number;
    serviceFee: number;
  };
  providerQuote?: {
    provider: "Uber Direct" | "Curri";
    quoteId: string;
    total: number;
    currency: string;
    pickupMinutes: number | null;
    durationMinutes: number | null;
    distanceMiles?: number | null;
    baseFee?: number;
    tolls?: number;
    accessorialFees?: number;
    deliveryMethod?: string;
    deliveryMethodLabel?: string;
    expiresAt: string;
  };
  providerDelivery?: {
    provider: "Uber Direct" | "Curri";
    deliveryId: string;
    trackingUrl: string | null;
    status: string;
    fee: number | null;
    currency: string;
    createdAt: string;
    updatedAt?: string;
    driverName?: string | null;
    driverPhone?: string | null;
    vehicleDescription?: string | null;
    proofOfDeliveryUrls?: string[];
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

export async function loadDeliveryRequests(supabase: SupabaseClient) {
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
