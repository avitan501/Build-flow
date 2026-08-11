import { NextRequest, NextResponse } from "next/server";

import { requireSignedInProfile } from "@/lib/auth";
import { createStripeObject, hasStripeServerConfig } from "@/lib/stripe";

function accountRedirect(request: NextRequest, payment: string) {
  return NextResponse.redirect(new URL(`/account?payment=${payment}`, request.url), 303);
}

export async function POST(request: NextRequest) {
  if (!hasStripeServerConfig()) {
    return accountRedirect(request, "setup-unavailable");
  }

  const { user } = await requireSignedInProfile();
  const customerId = typeof user.app_metadata.stripe_customer_id === "string"
    ? user.app_metadata.stripe_customer_id
    : null;

  if (!customerId) {
    return accountRedirect(request, "no-payment-profile");
  }

  try {
    const origin = new URL(request.url).origin;
    const session = await createStripeObject("/billing_portal/sessions", {
      customer: customerId,
      return_url: `${origin}/account`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a customer portal URL.");
    }

    return NextResponse.redirect(session.url, 303);
  } catch {
    return accountRedirect(request, "portal-error");
  }
}
