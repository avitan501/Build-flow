import "server-only";

import Stripe from "stripe";

export type SavedPaymentMethod = {
  id: string;
  type: "card" | "us_bank_account";
  title: string;
  detail: string;
};

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Stripe is not configured.");
  }

  return new Stripe(secretKey, {
    typescript: true,
  });
}

function customerSearchQuery(userId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    throw new Error("Invalid user ID.");
  }

  return `metadata['supabase_user_id']:'${userId}'`;
}

export function getPublicSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configuredUrl) return configuredUrl;
  return "https://build.avantiap.com";
}

export async function findStripeCustomer(userId: string) {
  const stripe = getStripe();
  const result = await stripe.customers.search({
    query: customerSearchQuery(userId),
    limit: 1,
  });

  const customer = result.data.find((item) => !item.deleted) ?? null;
  return { stripe, customer };
}

export async function getOrCreateStripeCustomer({
  userId,
  email,
  name,
}: {
  userId: string;
  email: string | null;
  name: string | null;
}) {
  const { stripe, customer: existingCustomer } = await findStripeCustomer(userId);
  const customer = existingCustomer ?? await stripe.customers.create(
    {
      metadata: { supabase_user_id: userId },
    },
    {
      idempotencyKey: `buildflow-customer-${userId}`,
    },
  );

  const desiredEmail = email || undefined;
  const desiredName = name || undefined;
  if (customer.email !== desiredEmail || customer.name !== desiredName) {
    return {
      stripe,
      customer: await stripe.customers.update(customer.id, {
        email: desiredEmail,
        name: desiredName,
      }),
    };
  }

  return { stripe, customer };
}

export async function listSavedPaymentMethods(userId: string): Promise<SavedPaymentMethod[]> {
  if (!isStripeConfigured()) return [];

  const { stripe, customer } = await findStripeCustomer(userId);
  if (!customer) return [];

  const [cards, bankAccounts] = await Promise.all([
    stripe.paymentMethods.list({ customer: customer.id, type: "card", limit: 100 }),
    stripe.paymentMethods.list({ customer: customer.id, type: "us_bank_account", limit: 100 }),
  ]);

  return [
    ...cards.data.map((method): SavedPaymentMethod => ({
      id: method.id,
      type: "card",
      title: `${method.card?.brand ? method.card.brand.toUpperCase() : "Card"} ending in ${method.card?.last4 || "----"}`,
      detail: method.card?.exp_month && method.card.exp_year
        ? `Expires ${String(method.card.exp_month).padStart(2, "0")}/${method.card.exp_year}`
        : "Saved card",
    })),
    ...bankAccounts.data.map((method): SavedPaymentMethod => ({
      id: method.id,
      type: "us_bank_account",
      title: `${method.us_bank_account?.bank_name || "Bank account"} ending in ${method.us_bank_account?.last4 || "----"}`,
      detail: method.us_bank_account?.account_type
        ? `${method.us_bank_account.account_type === "checking" ? "Checking" : "Savings"} account`
        : "Saved bank account",
    })),
  ];
}

export async function verifyPaymentSetupSession(userId: string, sessionId: string) {
  if (!isStripeConfigured() || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return false;

  const { stripe, customer } = await findStripeCustomer(userId);
  if (!customer) return false;

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const sessionCustomer = typeof session.customer === "string" ? session.customer : session.customer?.id;

  return session.mode === "setup"
    && session.status === "complete"
    && sessionCustomer === customer.id;
}

export async function detachOwnedPaymentMethod(userId: string, paymentMethodId: string) {
  if (!/^pm_[A-Za-z0-9]+$/.test(paymentMethodId)) {
    throw new Error("Invalid payment method.");
  }

  const { stripe, customer } = await findStripeCustomer(userId);
  if (!customer) throw new Error("Payment customer not found.");

  const method = await stripe.paymentMethods.retrieve(paymentMethodId);
  const methodCustomer = typeof method.customer === "string" ? method.customer : method.customer?.id;
  if (methodCustomer !== customer.id) {
    throw new Error("Payment method does not belong to this account.");
  }

  await stripe.paymentMethods.detach(paymentMethodId);
}
