import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";

const GENERIC_SUCCESS = "Check your phone for a text from Avantia Build.";
const PRODUCTION_MESSAGING_URL = "https://nprfhspwdflpqlopydmp.supabase.co";
const CANONICAL_TEXT_START_URL = "https://build-flow-wfl3.vercel.app/api/public/start-by-text";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Enter a valid phone number." }, { status: 400 });
  }

  const signingSecret = process.env.START_TEXT_SIGNING_SECRET?.trim();
  if (!signingSecret) {
    // The public custom domain is deployed from a separate Vercel project.
    // When that project does not own the signing secret, forward only this
    // already-public request to the canonical server route that does. The
    // canonical route still validates consent/phone, signs server-side, and
    // enforces the broker's idempotency and 24-hour rate limit.
    if (request.headers.get("x-avantia-start-proxy") === "1") {
      return NextResponse.json({ ok: false, error: "Text start is temporarily unavailable." }, { status: 503 });
    }
    try {
      const forwarded = await fetch(CANONICAL_TEXT_START_URL, {
        method: "POST",
        headers: { "content-type": "application/json", "x-avantia-start-proxy": "1" },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      const result = await forwarded.json().catch(() => null) as { ok?: boolean; error?: string; message?: string } | null;
      return NextResponse.json(result || { ok: false, error: "Text start is temporarily unavailable." }, { status: forwarded.status });
    } catch {
      return NextResponse.json({ ok: false, error: "Text start is temporarily unavailable." }, { status: 503 });
    }
  }

  const payload = JSON.stringify(body);
  let response: Response | null = null;
  for (let attempt = 0; attempt < 2 && !response; attempt += 1) {
    const timestamp = Date.now().toString();
    const signature = createHmac("sha256", signingSecret).update(`${timestamp}.${payload}`).digest("base64");
    try {
      response = await fetch(`${PRODUCTION_MESSAGING_URL}/functions/v1/aura-messaging-broker?mode=start-by-text`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-avantia-site-origin": new URL(request.url).origin,
          "x-avantia-site-timestamp": timestamp,
          "x-avantia-site-signature": signature,
          "x-forwarded-for": request.headers.get("x-forwarded-for") || "",
          "user-agent": request.headers.get("user-agent") || "",
        },
        body: payload,
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
    } catch {
      // Retry once with the same idempotency key; the broker's unique claim
      // prevents a late first attempt from sending a second starter text.
    }
  }
  if (!response) {
    return NextResponse.json({ ok: false, error: "Text start is temporarily unavailable." }, { status: 503 });
  }

  const result = await response.json().catch(() => null) as { ok?: boolean; error?: string; delivery?: "sent" | "already_sent" | "processing" } | null;
  if (!response.ok || !result?.ok) {
    const status = response.status === 429 ? 429 : response.status >= 500 ? 503 : 400;
    return NextResponse.json({ ok: false, error: result?.error || "Text start is temporarily unavailable." }, { status });
  }
  return NextResponse.json({ ok: true, message: GENERIC_SUCCESS, delivery: result.delivery || "sent" });
}
