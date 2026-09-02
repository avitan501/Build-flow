import { parseQuoEvent } from "@/lib/aura/quo";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function response(body: string, status: number) {
  return new Response(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function forwardToSecureAuraBroker(rawBody: string, signature: string) {
  const { url } = getSupabasePublicEnv();

  const brokerResponse = await fetch(`${url}/functions/v1/aura-messaging-broker?mode=quo-webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "openphone-signature": signature,
    },
    body: rawBody,
    cache: "no-store",
  });
  let result: { duplicate?: boolean } = {};
  try {
    result = await brokerResponse.json() as { duplicate?: boolean };
  } catch {
    // The status remains the source of truth when the broker returns no JSON.
  }
  return { ok: brokerResponse.ok, status: brokerResponse.status, duplicate: Boolean(result.duplicate) };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("openphone-signature") || "";
  if (!signature) return response("Invalid signature", 401);
  const broker = await forwardToSecureAuraBroker(rawBody, signature);
  if (!broker.ok) return response(broker.status === 401 ? "Invalid signature" : "Processing failed", broker.status);

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return response("Invalid JSON", 400);
  }

  const parsed = parseQuoEvent(payload);
  if (!parsed.success) return response("Unsupported event", 400);

  try {
    // The database insert is the single notification source. Its unique
    // communication ID prevents provider webhook replays from alerting twice.
    return response("EVENT_RECEIVED", 200);
  } catch {
    return response("Processing failed", 500);
  }
}
