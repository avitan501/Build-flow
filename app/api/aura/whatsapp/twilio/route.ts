import { getSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function twimlResponse(status = 200) {
  return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-twilio-signature");
  if (!signature) return twimlResponse(401);
  const rawBody = await request.text();
  const { url, anonKey } = getSupabasePublicEnv();
  try {
    const response = await fetch(`${url}/functions/v1/aura-messaging-broker?mode=twilio-webhook`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Avantia-Canonical-Url": request.url,
        "X-Twilio-Signature": signature,
      },
      body: rawBody,
      cache: "no-store",
    });
    return twimlResponse(response.status);
  } catch {
    return twimlResponse(503);
  }
}
