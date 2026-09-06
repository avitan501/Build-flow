import { timingSafeEqual } from "node:crypto";

import { updateProviderDeliveryStatus } from "@/lib/delivery-status-update";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function validToken(request: Request) {
  let expected = process.env.CURRI_WEBHOOK_TOKEN?.trim() || "";
  if (!expected) {
    try {
      const admin = createAdminClient();
      const { data } = await admin.rpc("get_curri_webhook_token");
      expected = (typeof data === "string" ? data : "").trim();
    } catch {
      return false;
    }
  }
  const provided = request.headers.get("x-curri-webhook-token")?.trim() || new URL(request.url).searchParams.get("token")?.trim() || "";
  if (!expected || expected.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

export async function POST(request: Request) {
  if (!await validToken(request)) return new Response(null, { status: 401 });
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload || typeof payload.id !== "string") return new Response(null, { status: 400 });
  const driver = payload.driver as Record<string, unknown> | null;
  const vehicle = driver?.activeVehicle as Record<string, unknown> | null;
  const images = Array.isArray(payload.images) ? payload.images.filter((value): value is string => typeof value === "string").slice(0, 20) : [];
  const saved = await updateProviderDeliveryStatus({
    provider: "Curri",
    deliveryId: payload.id,
    status: typeof payload.status === "string" ? payload.status : null,
    trackingUrl: typeof payload.trackingUrl === "string" ? payload.trackingUrl : null,
    driverName: [driver?.firstName, driver?.lastName].filter((value): value is string => typeof value === "string").join(" ") || null,
    driverPhone: typeof driver?.phoneNumber === "string" ? driver.phoneNumber : null,
    vehicleDescription: [vehicle?.year, vehicle?.color, vehicle?.make, vehicle?.model].filter((value) => typeof value === "string" || typeof value === "number").join(" ") || null,
    proofOfDeliveryUrls: images,
  });
  return new Response(null, { status: saved ? 200 : 202 });
}
