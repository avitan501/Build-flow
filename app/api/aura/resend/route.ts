import { storeAuraResendEvent, verifyAuraResendWebhook } from "@/lib/aura/resend";

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

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyAuraResendWebhook(rawBody, request.headers)) return response("Invalid signature", 401);

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return response("Invalid JSON", 400);
  }

  try {
    const stored = await storeAuraResendEvent(payload);
    return response(stored ? "EVENT_RECEIVED" : "EVENT_IGNORED", 200);
  } catch {
    return response("Processing failed", 500);
  }
}
