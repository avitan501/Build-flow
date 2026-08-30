import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";

const GENERIC_SUCCESS = "Your text request was received.";
const PRODUCTION_MESSAGING_URL = "https://nprfhspwdflpqlopydmp.supabase.co";
const CANONICAL_TEXT_START_URL =
  "https://build-flow-wfl3.vercel.app/api/public/start-by-text";

type StartByTextInput = {
  phone: string;
  consent: true;
  website: string;
  idempotencyKey: string;
};

function normalizeUsPhone(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return "";
}

function validatePublicInput(body: unknown): {
  input?: StartByTextInput;
  error?: string;
  honeypot?: boolean;
} {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return { error: "Enter a valid phone number." };
  const raw = body as Record<string, unknown>;
  if (typeof raw.website === "string" && raw.website.trim())
    return { honeypot: true };
  if (raw.consent !== true)
    return { error: "Please agree to receive the starter text." };
  const phone = normalizeUsPhone(raw.phone);
  if (!/^\+1\d{10}$/.test(phone))
    return { error: "Enter a valid U.S. phone number." };
  const idempotencyKey =
    typeof raw.idempotencyKey === "string" ? raw.idempotencyKey.trim() : "";
  if (!/^[a-f0-9-]{20,80}$/i.test(idempotencyKey))
    return { error: "Please try again." };
  return { input: { phone, consent: true, website: "", idempotencyKey } };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Enter a valid phone number." },
      { status: 400 },
    );
  }

  const validated = validatePublicInput(body);
  if (validated.honeypot)
    return NextResponse.json({
      ok: true,
      message: GENERIC_SUCCESS,
      delivery: "sent",
    });
  if (!validated.input)
    return NextResponse.json(
      { ok: false, error: validated.error },
      { status: 400 },
    );
  body = validated.input;

  const signingSecret = process.env.START_TEXT_SIGNING_SECRET?.trim();
  if (!signingSecret) {
    // The public custom domain is deployed from a separate Vercel project.
    // When that project does not own the signing secret, forward only this
    // already-public request to the canonical server route that does. The
    // canonical route still validates consent/phone, signs server-side, and
    // enforces the broker's idempotency and 24-hour rate limit.
    if (request.headers.get("x-avantia-start-proxy") === "1") {
      return NextResponse.json(
        { ok: false, error: "Text start is temporarily unavailable." },
        { status: 503 },
      );
    }
    try {
      const forwarded = await fetch(CANONICAL_TEXT_START_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-avantia-start-proxy": "1",
        },
        body: JSON.stringify(body),
        cache: "no-store",
        // The canonical route may retry once when a provider request finishes
        // just after its 12-second transport timeout. Keep the proxy alive long
        // enough to receive that idempotent result instead of showing a false
        // failure after Quo has already accepted the message.
        signal: AbortSignal.timeout(30_000),
      });
      const result = (await forwarded.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        message?: string;
      } | null;
      return NextResponse.json(
        result || {
          ok: false,
          error: "Text start is temporarily unavailable.",
        },
        { status: forwarded.status },
      );
    } catch {
      return NextResponse.json(
        { ok: false, error: "Text start is temporarily unavailable." },
        { status: 503 },
      );
    }
  }

  const payload = JSON.stringify(body);
  let response: Response | null = null;
  for (let attempt = 0; attempt < 2 && !response; attempt += 1) {
    const timestamp = Date.now().toString();
    const signature = createHmac("sha256", signingSecret)
      .update(`${timestamp}.${payload}`)
      .digest("base64");
    try {
      response = await fetch(
        `${PRODUCTION_MESSAGING_URL}/functions/v1/aura-messaging-broker?mode=start-by-text`,
        {
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
        },
      );
    } catch {
      // Retry once with the same idempotency key; the broker's unique claim
      // prevents a late first attempt from sending a second starter text.
    }
  }
  if (!response) {
    return NextResponse.json(
      { ok: false, error: "Text start is temporarily unavailable." },
      { status: 503 },
    );
  }

  const result = (await response.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
    delivery?: "sent" | "already_sent" | "processing" | "partial";
  } | null;
  if (!response.ok || !result?.ok) {
    const status =
      response.status === 429 ? 429 : response.status >= 500 ? 503 : 400;
    return NextResponse.json(
      {
        ok: false,
        error: result?.error || "Text start is temporarily unavailable.",
      },
      { status },
    );
  }
  return NextResponse.json({
    ok: true,
    message: GENERIC_SUCCESS,
    delivery: result.delivery || "processing",
  });
}
