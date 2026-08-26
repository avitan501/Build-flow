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

  let operation: "quote" | "create" = "quote";
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
    operation = body?.action === "create" ? "create" : "quote";
    const pickupAddress = typeof body?.pickupAddress === "string" ? body.pickupAddress.trim() : "";
    const dropoffAddress = typeof body?.dropoffAddress === "string" ? body.dropoffAddress.trim() : "";
    const weightPounds = Number(body?.weightPounds);
    const vehicle = body?.vehicle;
    if (
      pickupAddress.length < 8 || pickupAddress.length > 300 ||
      dropoffAddress.length < 8 || dropoffAddress.length > 300 ||
      !Number.isFinite(weightPounds) || weightPounds <= 0 || weightPounds > 50 ||
      (operation === "quote" && vehicle !== "small" && vehicle !== "car")
    ) {
      return json({ ok: false, code: "invalid_request", error: "Enter both complete addresses and a package weight up to 50 lb." }, 400);
    }
    const quoteId = typeof body?.quoteId === "string" ? body.quoteId.trim() : "";
    const pickupName = typeof body?.pickupName === "string" ? body.pickupName.trim() : "";
    const pickupPhone = typeof body?.pickupPhone === "string" ? body.pickupPhone.trim() : "";
    const dropoffName = typeof body?.dropoffName === "string" ? body.dropoffName.trim() : "";
    const dropoffPhone = typeof body?.dropoffPhone === "string" ? body.dropoffPhone.trim() : "";
    const itemDescription = typeof body?.itemDescription === "string" ? body.itemDescription.trim() : "";
    const scheduledPickupAt = typeof body?.scheduledPickupAt === "string" ? body.scheduledPickupAt : null;
    if (operation === "create" && (
      quoteId.length < 3 || pickupName.length < 2 || dropoffName.length < 2 ||
      !/^\+[1-9]\d{7,14}$/.test(pickupPhone) || !/^\+[1-9]\d{7,14}$/.test(dropoffPhone) ||
      itemDescription.length < 2 || itemDescription.length > 300
    )) {
      return json({ ok: false, code: "invalid_delivery", error: "Complete the courier contacts, phones, and item description." }, 400);
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
    if (operation === "create") {
      const readyAt = scheduledPickupAt ? new Date(scheduledPickupAt) : null;
      const validReadyAt = readyAt && Number.isFinite(readyAt.getTime()) && readyAt.getTime() > Date.now() + 10 * 60 * 1000 ? readyAt : null;
      const deliveryResponse = await fetch(
        `https://api.uber.com/v1/customers/${encodeURIComponent(credentials.customer_id)}/deliveries`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            quote_id: quoteId,
            pickup_name: pickupName,
            pickup_address: pickupAddress,
            pickup_phone_number: pickupPhone,
            dropoff_name: dropoffName,
            dropoff_address: dropoffAddress,
            dropoff_phone_number: dropoffPhone,
            manifest_items: [{ name: itemDescription, quantity: 1, size: "small", price: 0 }],
            ...(validReadyAt ? {
              pickup_ready_dt: validReadyAt.toISOString(),
              pickup_deadline_dt: new Date(validReadyAt.getTime() + 30 * 60 * 1000).toISOString(),
            } : {}),
          }),
        },
      );
      const delivery = await deliveryResponse.json().catch(() => null) as Record<string, unknown> | null;
      if (!deliveryResponse.ok || typeof delivery?.id !== "string") {
        return json({ ok: false, code: "delivery_failed", error: "Uber could not schedule this delivery. Confirm the quote is still valid and the addresses are serviceable." }, 502);
      }
      return json({
        ok: true,
        provider: "Uber Direct",
        delivery: {
          deliveryId: delivery.id,
          trackingUrl: typeof delivery.tracking_url === "string" ? delivery.tracking_url : null,
          status: typeof delivery.status === "string" ? delivery.status : "pending",
          fee: Number.isFinite(delivery.fee) ? Number(delivery.fee) / 100 : null,
          currency: String(delivery.currency_type || delivery.currency || "USD").toUpperCase(),
        },
      });
    }
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
        }),
      },
    );
    const quote = await quoteResponse.json().catch(() => null) as Record<string, unknown> | null;
    if (!quoteResponse.ok) {
      const detail = [quote?.code, quote?.error, quote?.message]
        .filter((value): value is string => typeof value === "string")
        .join(" ")
        .toLowerCase();
      if (detail.includes("tax_form_required")) {
        return json({ ok: false, code: "tax_form_required", error: "Uber requires the business tax form before live quotes." }, 503);
      }
      return json({ ok: false, code: "provider_error", error: "Uber could not quote this route right now." }, 502);
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
    return operation === "create"
      ? json({ ok: false, code: "delivery_failed", error: "Uber could not schedule this delivery." }, 502)
      : json({ ok: false, code: "quote_failed", error: "Uber could not return a live quote right now." }, 502);
  }
});
