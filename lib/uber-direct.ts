import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type UberTokenResponse = {
  access_token?: string;
  expires_in?: number;
};

type UberQuoteResponse = {
  id?: string;
  fee?: number;
  currency?: string;
  currency_type?: string;
  duration?: number;
  pickup_duration?: number;
  dropoff_eta?: string;
  expires?: string;
};

export type UberDirectQuote = {
  quoteId: string;
  total: number;
  currency: string;
  durationMinutes: number | null;
  pickupMinutes: number | null;
  dropoffEta: string | null;
  expiresAt: string;
};

export class UberDirectError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "UberDirectError";
  }
}

let tokenCache: { accessToken: string; expiresAt: number } | null = null;

type UberConfiguration = {
  customerId: string;
  clientId: string;
  clientSecret: string;
};

let configurationCache: { value: UberConfiguration; expiresAt: number } | null = null;

async function uberConfiguration(): Promise<UberConfiguration> {
  const customerId = process.env.UBER_DIRECT_CUSTOMER_ID?.trim();
  const clientId = process.env.UBER_DIRECT_CLIENT_ID?.trim();
  const clientSecret = process.env.UBER_DIRECT_CLIENT_SECRET?.trim();

  if (customerId && clientId && clientSecret) {
    return { customerId, clientId, clientSecret };
  }

  const now = Date.now();
  if (configurationCache && configurationCache.expiresAt > now) {
    return configurationCache.value;
  }

  const { data, error } = await createAdminClient()
    .rpc("get_uber_direct_credentials")
    .single();
  const row = data as {
    customer_id?: string | null;
    client_id?: string | null;
    client_secret?: string | null;
  } | null;

  if (error || !row?.customer_id || !row.client_id || !row.client_secret) {
    throw new UberDirectError("Uber Direct live pricing is not connected yet.", 503, "not_configured");
  }

  const value = {
    customerId: row.customer_id.trim(),
    clientId: row.client_id.trim(),
    clientSecret: row.client_secret.trim(),
  };
  configurationCache = { value, expiresAt: now + 5 * 60 * 1000 };
  return value;
}

async function responsePayload(response: Response) {
  return response.json().catch(() => null) as Promise<Record<string, unknown> | null>;
}

function providerMessage(payload: Record<string, unknown> | null) {
  return [payload?.code, payload?.error, payload?.message]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

async function getUberAccessToken() {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 5 * 60 * 1000) return tokenCache.accessToken;

  const { clientId, clientSecret } = await uberConfiguration();
  const form = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
    scope: "eats.deliveries",
  });

  const response = await fetch("https://auth.uber.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await responsePayload(response) as UberTokenResponse | null;
  if (!response.ok || !payload?.access_token) {
    throw new UberDirectError("Uber Direct authentication needs attention.", 502, "authentication_failed");
  }

  const lifetimeSeconds = Number.isFinite(payload.expires_in) ? Number(payload.expires_in) : 3600;
  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: now + Math.max(300, lifetimeSeconds) * 1000,
  };
  return tokenCache.accessToken;
}

export async function createUberDirectQuote({
  pickupAddress,
  dropoffAddress,
}: {
  pickupAddress: string;
  dropoffAddress: string;
}): Promise<UberDirectQuote> {
  const { customerId } = await uberConfiguration();
  const accessToken = await getUberAccessToken();
  const response = await fetch(`https://api.uber.com/v1/customers/${encodeURIComponent(customerId)}/delivery_quotes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pickup_address: pickupAddress,
      dropoff_address: dropoffAddress,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await responsePayload(response);

  if (!response.ok) {
    const detail = providerMessage(payload);
    if (detail.includes("tax_form_required")) {
      throw new UberDirectError("Uber requires the business tax form before live deliveries can be quoted.", 503, "tax_form_required");
    }
    if (response.status === 400 || response.status === 422) {
      throw new UberDirectError("Uber could not quote this route. Check both complete addresses and the package limits.", 400, "route_not_quoted");
    }
    if (response.status === 401 || response.status === 403) {
      tokenCache = null;
      throw new UberDirectError("Uber Direct production access needs attention.", 503, "provider_access");
    }
    if (response.status === 429) {
      throw new UberDirectError("Uber quote service is busy. Please try again shortly.", 503, "provider_busy");
    }
    throw new UberDirectError("Uber could not return a live quote right now.", 502, "provider_error");
  }

  const quote = payload as UberQuoteResponse | null;
  if (!quote?.id || !Number.isFinite(quote.fee) || !quote.expires) {
    throw new UberDirectError("Uber returned an incomplete live quote.", 502, "invalid_response");
  }

  return {
    quoteId: quote.id,
    total: Number(quote.fee) / 100,
    currency: (quote.currency_type || quote.currency || "USD").toUpperCase(),
    durationMinutes: Number.isFinite(quote.duration) ? Number(quote.duration) : null,
    pickupMinutes: Number.isFinite(quote.pickup_duration) ? Number(quote.pickup_duration) : null,
    dropoffEta: quote.dropoff_eta || null,
    expiresAt: quote.expires,
  };
}
