import { createHmac, timingSafeEqual } from "node:crypto";

import { updateProviderDeliveryStatus } from "@/lib/delivery-status-update";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signingKey = process.env.UBER_DIRECT_WEBHOOK_SIGNING_KEY?.trim() || "";
  const signature = request.headers.get("x-uber-signature")?.trim().toLowerCase() || request.headers.get("x-postmates-signature")?.trim().toLowerCase() || "";
  const rawBody = await request.text();
  const expected = signingKey ? createHmac("sha256", signingKey).update(rawBody).digest("hex") : "";
  if (!signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return new Response(null, { status: 401 });
  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const data = (payload.data || payload) as Record<string, unknown>;
  const meta = (payload.meta || data.meta || {}) as Record<string, unknown>;
  const deliveryId = [data.id, meta.order_id, meta.delivery_id].find((value): value is string => typeof value === "string");
  if (!deliveryId) return new Response(null, { status: 400 });
  const dropoff = data.dropoff as Record<string, unknown> | null;
  const verification = dropoff?.verification as Record<string, unknown> | null;
  const picture = verification?.picture as Record<string, unknown> | null;
  const signatureProof = verification?.signature_proof as Record<string, unknown> | null;
  const proof = [picture?.image_url, signatureProof?.image_url].filter((value): value is string => typeof value === "string");
  const courier = data.courier as Record<string, unknown> | null;
  const saved = await updateProviderDeliveryStatus({
    provider: "Uber Direct",
    deliveryId,
    status: [data.status, meta.status].find((value): value is string => typeof value === "string") || null,
    trackingUrl: typeof data.tracking_url === "string" ? data.tracking_url : null,
    driverName: typeof courier?.name === "string" ? courier.name : null,
    driverPhone: typeof courier?.phone_number === "string" ? courier.phone_number : null,
    proofOfDeliveryUrls: proof,
  });
  return new Response(null, { status: saved ? 200 : 202 });
}
