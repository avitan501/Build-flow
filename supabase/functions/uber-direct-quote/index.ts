import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2.56.0";

type Credentials = {
  customer_id: string | null;
  client_id: string | null;
  client_secret: string | null;
};

let tokenCache: { value: string; expiresAt: number } | null = null;

const OWNER_EMAIL = "avitanneto@gmail.com";
const STAFF_EMAILS = new Set(["buildavantiap@gmail.com", "info@fivetownsbuilders.com"]);

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "application/json",
    },
  });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function accessToken(clientId: string, clientSecret: string) {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 5 * 60 * 1000) return tokenCache.value;

  const response = await fetch("https://auth.uber.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: "eats.deliveries",
    }),
  });
  const payload = await response.json().catch(() => null) as { access_token?: string; expires_in?: number } | null;
  if (!response.ok || !payload?.access_token) throw new Error("Uber authentication failed");

  const expiresIn = Number.isFinite(payload.expires_in) ? Number(payload.expires_in) : 3600;
  tokenCache = { value: payload.access_token, expiresAt: now + Math.max(300, expiresIn) * 1000 };
  return tokenCache.value;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return json({ ok: false, code: "sign_in_required" }, 401);

    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const anonKey = requiredEnv("SUPABASE_ANON_KEY");
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ ok: false, code: "sign_in_required" }, 401);

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const pickupAddress = typeof body?.pickupAddress === "string" ? body.pickupAddress.trim() : "";
    const dropoffAddress = typeof body?.dropoffAddress === "string" ? body.dropoffAddress.trim() : "";
    const packageQuantity = Number(body?.packageQuantity);
    const weightPerPackage = Number(body?.weightPerPackage);
    const vehicle = body?.vehicle;
    const scheduledPickupAt = typeof body?.scheduledPickupAt === "string" ? body.scheduledPickupAt : null;
    if (
      pickupAddress.length < 8 || pickupAddress.length > 300 ||
      dropoffAddress.length < 8 || dropoffAddress.length > 300 ||
      !Number.isInteger(packageQuantity) || packageQuantity <= 0 || packageQuantity > 20 ||
      !Number.isFinite(weightPerPackage) || weightPerPackage <= 0 || weightPerPackage > 50 ||
      !["small", "car", "pickup", "van"].includes(String(vehicle))
    ) {
      return json({ ok: false, code: "invalid_quote", error: "Enter both complete addresses, 1–20 boxes, and a weight up to 50 lb per box." }, 400);
    }
    const readyAt = scheduledPickupAt ? new Date(scheduledPickupAt) : null;
    if (readyAt && (
      !Number.isFinite(readyAt.getTime()) ||
      readyAt.getTime() < Date.now() + 60 * 60 * 1000 ||
      readyAt.getTime() > Date.now() + 30 * 24 * 60 * 60 * 1000
    )) {
      return json({ ok: false, code: "invalid_schedule", error: "Choose a scheduled pickup between 1 hour and 30 days from now." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: profile } = await admin
      .from("profiles")
      .select("email,role,approval_status,is_active")
      .eq("id", userData.user.id)
      .maybeSingle();
    const email = String(profile?.email || userData.user.email || "").trim().toLowerCase();
    const managerAuthorized =
      profile?.is_active === true &&
      profile.approval_status === "approved" &&
      ((email === OWNER_EMAIL && profile.role === "admin") || (STAFF_EMAILS.has(email) && profile.role === "staff"));
    if (!managerAuthorized) {
      return json({ ok: false, code: "manager_access_required" }, 403);
    }

    const { data: credentialData, error: credentialError } = await admin
      .rpc("get_uber_direct_credentials")
      .single();
    const credentials = credentialData as Credentials | null;
    if (
      credentialError || !credentials?.customer_id ||
      !credentials.client_id || !credentials.client_secret
    ) {
      throw new Error("Uber credentials unavailable");
    }

    const token = await accessToken(credentials.client_id, credentials.client_secret);
    const quoteResponse = await fetch(
      `https://api.uber.com/v1/customers/${encodeURIComponent(credentials.customer_id)}/delivery_quotes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pickup_address: pickupAddress,
          dropoff_address: dropoffAddress,
          ...(readyAt ? {
            pickup_ready_dt: readyAt.toISOString(),
            pickup_deadline_dt: new Date(readyAt.getTime() + 60 * 60 * 1000).toISOString(),
          } : {}),
        }),
      },
    );
    const quote = await quoteResponse.json().catch(() => null) as Record<string, unknown> | null;
    if (!quoteResponse.ok) {
      const providerCode = [quote?.code, quote?.error]
        .find((value): value is string => typeof value === "string")
        ?.slice(0, 100) || "provider_error";
      const detail = [providerCode, quote?.message]
        .filter((value): value is string => typeof value === "string")
        .join(" ")
        .toLowerCase();
      if (detail.includes("tax_form_required")) {
        return json({ ok: false, code: "tax_form_required", error: "Uber requires the business tax form before live quotes." }, 503);
      }
      if (detail.includes("address_undeliverable")) {
        return json({ ok: false, code: "address_undeliverable", providerCode, error: "Uber Direct answered, but does not serve this exact route. Choose an autocomplete suggestion or add coordinates for a planning estimate, or try another courier." }, 422);
      }
      return json({ ok: false, code: "provider_error", providerCode, error: "Uber could not quote this route right now." }, 502);
    }

    if (!quote?.id || !Number.isFinite(quote.fee) || typeof quote.expires !== "string") {
      throw new Error("Incomplete Uber quote");
    }

    return json({
      ok: true,
      provider: "Uber Direct",
      quote: {
        quoteId: quote.id,
        total: Number(quote.fee) / 100,
        currency: String(quote.currency_type || quote.currency || "USD").toUpperCase(),
        durationMinutes: Number.isFinite(quote.duration) ? Number(quote.duration) : null,
        pickupMinutes: Number.isFinite(quote.pickup_duration) ? Number(quote.pickup_duration) : null,
        dropoffEta: typeof quote.dropoff_eta === "string" ? quote.dropoff_eta : null,
        expiresAt: quote.expires,
      },
    });
  } catch {
    return json({ ok: false, code: "quote_failed", error: "Uber could not return a live quote right now." }, 502);
  }
});
