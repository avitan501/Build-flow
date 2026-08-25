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
  await requireStaffProfile("suppliers");
  const progress = await loadSupplierPartnerProgress();

  return <SupplierPartnershipWorkspace partners={SUPPLIER_PARTNERS} initialProgress={progress} emailSendingReady={canSendAuraEmail()} />;
}
