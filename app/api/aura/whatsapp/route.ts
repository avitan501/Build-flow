import { getSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

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

async function forwardToSecureAuraBroker(
  method: "GET" | "POST",
  query: URLSearchParams,
  rawBody = "",
  signature = "",
) {
  const { url } = getSupabasePublicEnv();
  const brokerUrl = new URL(`${url}/functions/v1/aura-messaging-broker`);
  brokerUrl.searchParams.set("mode", "meta-whatsapp-webhook");
  for (const [key, value] of query) brokerUrl.searchParams.set(key, value);
  const brokerResponse = await fetch(brokerUrl, {
    method,
    headers: method === "POST"
      ? {
          "Content-Type": "application/json",
          "x-hub-signature-256": signature,
        }
      : undefined,
    body: method === "POST" ? rawBody : undefined,
    cache: "no-store",
  });
  return {
    ok: brokerResponse.ok,
    status: brokerResponse.status,
    body: await brokerResponse.text(),
  };
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  if (
    query.get("hub.mode") !== "subscribe" ||
    !/^[a-f0-9]{64}$/i.test(query.get("hub.verify_token") || "") ||
    !query.get("hub.challenge")
  ) return response("Forbidden", 403);
  const result = await forwardToSecureAuraBroker("GET", query);
  return response(result.body, result.status);
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-hub-signature-256") || "";
  if (!/^sha256=[a-f0-9]{64}$/i.test(signature))
    return response("Invalid signature", 401);
  const rawBody = await request.text();
  const result = await forwardToSecureAuraBroker(
    "POST",
    new URL(request.url).searchParams,
    rawBody,
    signature,
  );
  if (!result.ok)
    return response(
      result.status === 401 ? "Invalid signature" : "Processing failed",
      result.status,
    );
  return response("EVENT_RECEIVED", 200);
}
