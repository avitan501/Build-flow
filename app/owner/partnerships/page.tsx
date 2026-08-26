import type { Metadata } from "next";

import { SupplierPartnershipWorkspace } from "@/components/buildflow/supplier-partnership-workspace";
import { requireStaffProfile } from "@/lib/auth";
import { canSendAuraEmail } from "@/lib/aura/communications";
import { SUPPLIER_PARTNERS } from "@/lib/supplier-partners/catalog";
import { loadSupplierPartnerProgress } from "@/lib/supplier-partners/store";

export const metadata: Metadata = {
  title: "Carlos supplier partnerships | AvantiaBuild",
  description: "Supplier outreach, applications, follow-ups, and approvals for AvantiaBuild.",
};

export default async function SupplierPartnershipsPage() {
  const { supabase } = await requireStaffProfile("suppliers");
  const [progress, brokerResult] = await Promise.all([
    loadSupplierPartnerProgress(supabase),
    supabase.functions.invoke<{ ok?: boolean; email?: boolean }>("aura-messaging-broker", { body: { action: "status" } }),
  ]);
  const emailSendingReady = canSendAuraEmail() || Boolean(brokerResult.data?.ok && brokerResult.data.email);

  return <SupplierPartnershipWorkspace partners={SUPPLIER_PARTNERS} initialProgress={progress} emailSendingReady={emailSendingReady} />;
}
