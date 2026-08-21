import { NextRequest, NextResponse } from "next/server";

import { requireAdminProfile } from "@/lib/auth";
import { createStripeObject, hasStripeServerConfig } from "@/lib/stripe";

function paymentRedirect(request: NextRequest, payment: string) {
  return NextResponse.redirect(new URL(`/admin/payments?payment=${payment}`, request.url), 303);
}

export async function POST(request: NextRequest) {
  const { user } = await requireAdminProfile();

  if (!hasStripeServerConfig()) {
    return paymentRedirect(request, "setup-unavailable");
  }
  const customerId = typeof user.app_metadata.stripe_customer_id === "string"
    ? user.app_metadata.stripe_customer_id
    : null;

  if (!customerId) {
    return paymentRedirect(request, "no-payment-profile");
  }

  try {
    const origin = new URL(request.url).origin;
    const session = await createStripeObject("/billing_portal/sessions", {
      customer: customerId,
      return_url: `${origin}/admin/payments`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a customer portal URL.");
    }

    return NextResponse.redirect(session.url, 303);
  } catch {
    return paymentRedirect(request, "portal-error");
  }
}
