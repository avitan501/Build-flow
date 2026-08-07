"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";

import { requireAdminProfile } from "@/lib/auth";
import { sendCartSubmissionEmail } from "@/lib/cart-submission-email";

export async function sendOrderNotificationTestAction() {
  await requireAdminProfile();

  const result = await sendCartSubmissionEmail({
    quoteId: `email-test-${randomUUID()}`,
    project: { id: "email-test", name: "Email notification test", address: "123 Test Project Avenue" },
    customer: {
      email: "info@fivetownsbuilders.com",
      profile: {
        id: "email-test-client",
        email: "info@fivetownsbuilders.com",
        full_name: "Five Towns Builders Test Client",
        company_name: "Five Towns Builders",
        phone: null,
        role: "client",
        approval_status: "approved",
        is_active: true,
      },
    },
    quoteItems: [{ name: "Sample construction material request", quantity: 10, unit: "EA", unit_price: 12.5, line_total: 125 }],
    cartDetails: [],
    customLines: [],
    subtotal: 125,
    tax: 0,
    total: 125,
  });

  const params = new URLSearchParams({ owner: result.owner.status, client: result.client.status });
  redirect(`/admin/settings?${params.toString()}`);
}
