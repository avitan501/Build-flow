import { timingSafeEqual } from "node:crypto";

import { updateProviderDeliveryStatus } from "@/lib/delivery-status-update";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function validToken(request: Request) {
  let expected = process.env.GOSHARE_WEBHOOK_TOKEN?.trim() || "";
  if (!expected) {
    try {
      const admin = createAdminClient();
      const { data } = await admin.rpc("get_goshare_webhook_token");
      expected = (typeof data === "string" ? data : "").trim();
    } catch {
      return false;
    }
  }
  const authorization = request.headers.get("authorization")?.trim() || "";
  const bearer = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  const provided = request.headers.get("x-goshare-webhook-token")?.trim() || bearer || new URL(request.url).searchParams.get("token")?.trim() || "";
  if (!expected || expected.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

function record(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

export async function POST(request: Request) {
  if (!await validToken(request)) return new Response(null, { status: 401 });
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  const project = record(payload?.project);
  if (!project || typeof project.id !== "string") return new Response(null, { status: 400 });

  const subProjects = Array.isArray(project.subProjects) ? project.subProjects : [];
  const firstSubProject = record(subProjects[0]);
  const deliveryPro = record(firstSubProject?.deliveryPro);
  const vehicle = record(firstSubProject?.vehicle);
  const stops = Array.isArray(project.stops) ? project.stops : [];
  const proofOfDeliveryUrls = stops.flatMap((stop) => {
    const files = record(stop)?.proofOfDeliveryFiles;
    if (!Array.isArray(files)) return [];
    return files.flatMap((file) => {
      const url = record(record(file)?.file)?.url;
      return typeof url === "string" ? [url] : [];
    });
  }).slice(0, 20);
  const tracking = record(payload?.tracking);

  const saved = await updateProviderDeliveryStatus({
    provider: "GoShare",
    deliveryId: project.id,
    status: typeof project.status === "string" ? project.status : typeof payload?.event === "string" ? payload.event : null,
    trackingUrl: typeof tracking?.link === "string" ? tracking.link : null,
    driverName: typeof deliveryPro?.name === "string" ? deliveryPro.name : null,
    driverPhone: typeof deliveryPro?.phone === "string" ? deliveryPro.phone : null,
    vehicleDescription: typeof vehicle?.alias === "string" ? vehicle.alias.replaceAll("_", " ") : null,
    proofOfDeliveryUrls,
  });
  return new Response(null, { status: saved ? 200 : 202 });
}
