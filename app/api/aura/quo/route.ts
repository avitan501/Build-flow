import { parseQuoEvent, storeQuoEvent, verifyQuoSignature } from "@/lib/aura/quo";

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
  if (!verifyQuoSignature(rawBody, request.headers.get("openphone-signature"))) {
    return response("Invalid signature", 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return response("Invalid JSON", 400);
  }

  const parsed = parseQuoEvent(payload);
  if (!parsed.success) return response("Unsupported event", 400);

  try {
    const result = await storeQuoEvent(parsed.data);
    if (!result.accepted) return response("Phone number not allowed", 403);
    return response("EVENT_RECEIVED", 200);
  } catch {
    return response("Processing failed", 500);
  }
}
