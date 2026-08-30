import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";

const GENERIC_SUCCESS = "Check your phone for a text from Avantia Build.";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Enter a valid phone number." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const signingSecret = process.env.START_TEXT_SIGNING_SECRET?.trim();
  if (!supabaseUrl || !anonKey || !signingSecret) {
    return NextResponse.json({ ok: false, error: "Text start is temporarily unavailable." }, { status: 503 });
  }

  const payload = JSON.stringify(body);
  const timestamp = Date.now().toString();
  const signature = createHmac("sha256", signingSecret).update(`${timestamp}.${payload}`).digest("base64");
  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/aura-messaging-broker?mode=start-by-text`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
        "content-type": "application/json",
        "x-avantia-site-origin": new URL(request.url).origin,
        "x-avantia-site-timestamp": timestamp,
        "x-avantia-site-signature": signature,
        "x-forwarded-for": request.headers.get("x-forwarded-for") || "",
        "user-agent": request.headers.get("user-agent") || "",
      },
      body: payload,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Text start is temporarily unavailable." }, { status: 503 });
  }

  const result = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
  if (!response.ok || !result?.ok) {
    const status = response.status === 429 ? 429 : response.status >= 500 ? 503 : 400;
    return NextResponse.json({ ok: false, error: result?.error || "Text start is temporarily unavailable." }, { status });
  }
  return NextResponse.json({ ok: true, message: GENERIC_SUCCESS });
}
