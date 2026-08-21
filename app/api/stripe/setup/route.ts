import { NextRequest, NextResponse } from "next/server";

import { requireAdminProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStripeObject, hasStripeServerConfig } from "@/lib/stripe";

function paymentRedirect(request: NextRequest, payment: string) {
  return NextResponse.redirect(new URL(`/admin/payments?payment=${payment}`, request.url), 303);
}

export async function POST(request: NextRequest) {
  if (!hasStripeServerConfig()) {
    return paymentRedirect(request, "setup-unavailable");
  }

  const { user, profile } = await requireAdminProfile();

  try {
    let customerId = typeof user.app_metadata.stripe_customer_id === "string"
      ? user.app_metadata.stripe_customer_id
      : null;

    if (!customerId) {
      const customer = await createStripeObject("/customers", {
        email: user.email || profile?.email || "",
        name: profile?.full_name || user.user_metadata.full_name || "",
        phone: profile?.phone || "",
        "metadata[supabase_user_id]": user.id,
      });
      customerId = customer.id;

      const admin = createAdminClient();
      const { error } = await admin.auth.admin.updateUserById(user.id, {
        app_metadata: {
          ...user.app_metadata,
          stripe_customer_id: customerId,
        },
      });

      if (error) {
        throw new Error("The Stripe customer could not be connected to this account.");
      }
    }

    const origin = new URL(request.url).origin;
    const session = await createStripeObject("/checkout/sessions", {
      mode: "setup",
      customer: customerId,
      "payment_method_types[0]": "card",
      "payment_method_types[1]": "us_bank_account",
      success_url: `${origin}/admin/payments?payment=saved`,
      cancel_url: `${origin}/admin/payments?payment=canceled`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a secure checkout URL.");
    }

    return NextResponse.redirect(session.url, 303);
  } catch {
    return paymentRedirect(request, "setup-error");
  }
}
