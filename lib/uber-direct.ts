import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type Credentials = { customer_id: string | null; client_id: string | null; client_secret: string | null };

export type UberDirectQuote = {
  quoteId: string;
  total: number;
  currency: string;
  durationMinutes: number | null;
  pickupMinutes: number | null;
  dropoffEta: string | null;
  expiresAt: string;
};

export type UberDirectDelivery = {
  deliveryId: string;
  trackingUrl: string | null;
  status: string;
  fee: number | null;
  currency: string;
};

export class UberDirectError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "UberDirectError";
  }
}

let tokenCache: { value: string; expiresAt: number } | null = null;

async function credentials() {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_uber_direct_credentials").single();
  const value = data as Credentials | null;
  if (error || !value?.customer_id || !value.client_id || !value.client_secret) {
    throw new UberDirectError("credentials_unavailable", "Uber Direct is not configured right now.");
  }
  return { customerId: value.customer_id, clientId: value.client_id, clientSecret: value.client_secret };
}

async function accessToken(clientId: string, clientSecret: string) {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 5 * 60 * 1000) return tokenCache.value;
  const response = await fetch("https://auth.uber.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials", scope: "eats.deliveries" }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as { access_token?: string; expires_in?: number } | null;
  if (!response.ok || !payload?.access_token) throw new UberDirectError("authentication_failed", "Uber Direct authentication failed.");
  const expiresIn = Number.isFinite(payload.expires_in) ? Number(payload.expires_in) : 3600;
  tokenCache = { value: payload.access_token, expiresAt: now + Math.max(300, expiresIn) * 1000 };
  return tokenCache.value;
}

async function context() {
  const account = await credentials();
  return { ...account, token: await accessToken(account.clientId, account.clientSecret) };
}

export async function quoteUberDirect(input: { pickupAddress: string; dropoffAddress: string; scheduledPickupAt?: string | null }) {
  const account = await context();
  const readyAt = input.scheduledPickupAt ? new Date(input.scheduledPickupAt) : null;
  const response = await fetch(`https://api.uber.com/v1/customers/${encodeURIComponent(account.customerId)}/delivery_quotes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${account.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      pickup_address: input.pickupAddress,
      dropoff_address: input.dropoffAddress,
      ...(readyAt ? {
        pickup_ready_dt: readyAt.toISOString(),
        pickup_deadline_dt: new Date(readyAt.getTime() + 60 * 60 * 1000).toISOString(),
      } : {}),
    }),
    cache: "no-store",
  });
  const quote = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    const detail = [quote?.code, quote?.error, quote?.message].filter((value): value is string => typeof value === "string").join(" ").toLowerCase();
    if (detail.includes("tax_form_required")) throw new UberDirectError("tax_form_required", "Uber requires the business tax form before live quotes.");
    throw new UberDirectError("provider_error", "Uber could not quote this route right now.");
  }
  if (!quote?.id || !Number.isFinite(quote.fee) || typeof quote.expires !== "string") throw new UberDirectError("incomplete_quote", "Uber returned an incomplete quote.");
  return {
    quoteId: String(quote.id),
    total: Number(quote.fee) / 100,
    currency: String(quote.currency_type || quote.currency || "USD").toUpperCase(),
    durationMinutes: Number.isFinite(quote.duration) ? Number(quote.duration) : null,
    pickupMinutes: Number.isFinite(quote.pickup_duration) ? Number(quote.pickup_duration) : null,
    dropoffEta: typeof quote.dropoff_eta === "string" ? quote.dropoff_eta : null,
    expiresAt: quote.expires,
  } satisfies UberDirectQuote;
}

export async function createUberDirectDelivery(input: {
  quoteId: string;
  pickupAddress: string;
  pickupName: string;
  pickupPhone: string;
  dropoffAddress: string;
  dropoffName: string;
  dropoffPhone: string;
  itemDescription: string;
  weightPounds: number;
  scheduledPickupAt: string | null;
}) {
  const account = await context();
  const readyAt = input.scheduledPickupAt ? new Date(input.scheduledPickupAt) : null;
  const response = await fetch(`https://api.uber.com/v1/customers/${encodeURIComponent(account.customerId)}/deliveries`, {
    method: "POST",
    headers: { Authorization: `Bearer ${account.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      quote_id: input.quoteId,
      pickup_name: input.pickupName,
      pickup_address: input.pickupAddress,
      pickup_phone_number: input.pickupPhone,
      dropoff_name: input.dropoffName,
      dropoff_address: input.dropoffAddress,
      dropoff_phone_number: input.dropoffPhone,
      manifest_items: [{ name: input.itemDescription, quantity: 1, size: "small", price: 0, weight: Math.round(input.weightPounds * 453.592) }],
      ...(readyAt ? { pickup_ready_dt: readyAt.toISOString(), pickup_deadline_dt: new Date(readyAt.getTime() + 60 * 60 * 1000).toISOString() } : {}),
    }),
    cache: "no-store",
  });
  const delivery = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || typeof delivery?.id !== "string") throw new UberDirectError("delivery_failed", "Uber could not schedule this delivery. Confirm the quote is still valid and the addresses are serviceable.");
  return {
    deliveryId: delivery.id,
    trackingUrl: typeof delivery.tracking_url === "string" ? delivery.tracking_url : null,
    status: typeof delivery.status === "string" ? delivery.status : "pending",
    fee: Number.isFinite(delivery.fee) ? Number(delivery.fee) / 100 : null,
    currency: String(delivery.currency_type || delivery.currency || "USD").toUpperCase(),
  } satisfies UberDirectDelivery;
}
