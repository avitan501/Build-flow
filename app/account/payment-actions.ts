"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSignedInProfile } from "@/lib/auth";
import {
  detachOwnedPaymentMethod,
  getOrCreateStripeCustomer,
  getPublicSiteUrl,
  isStripeConfigured,
} from "@/lib/stripe";

export async function createPaymentMethodSetupSession() {
  const { user, profile } = await requireSignedInProfile();
  if (!isStripeConfigured()) redirect("/account?error=payment-unavailable");

  let checkoutUrl: string | null = null;

  try {
    const { stripe, customer } = await getOrCreateStripeCustomer({
      userId: user.id,
      email: user.email ?? profile?.email ?? null,
      name: profile?.full_name ?? null,
    });
    const siteUrl = getPublicSiteUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      currency: "usd",
      customer: customer.id,
      payment_method_types: ["card", "us_bank_account"],
      payment_method_options: {
        us_bank_account: {
          financial_connections: {
            permissions: ["payment_method"],
          },
        },
      },
      success_url: `${siteUrl}/account?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/account?payment=cancelled`,
    });
    checkoutUrl = session.url;
  } catch {
    redirect("/account?error=payment-setup");
  }

  if (!checkoutUrl) redirect("/account?error=payment-setup");
  redirect(checkoutUrl);
}

export async function removePaymentMethod(formData: FormData) {
  const { user } = await requireSignedInProfile();
  const paymentMethodId = String(formData.get("paymentMethodId") || "");

  try {
    await detachOwnedPaymentMethod(user.id, paymentMethodId);
  } catch {
    redirect("/account?error=payment-remove");
  }

  revalidatePath("/account");
  redirect("/account?payment=removed");
}
