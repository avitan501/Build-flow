import "server-only";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

type StripeObject = {
  id: string;
  url?: string | null;
};

type StripeErrorResponse = {
  error?: {
    message?: string;
  };
};

export function hasStripeServerConfig() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export async function createStripeObject(path: string, values: Record<string, string>) {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Stripe is not configured.");
  }

  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(values),
    cache: "no-store",
  });

  const payload = (await response.json()) as StripeObject & StripeErrorResponse;

  if (!response.ok || !payload.id) {
    throw new Error(payload.error?.message || "Stripe could not complete the request.");
  }

  return payload;
}
