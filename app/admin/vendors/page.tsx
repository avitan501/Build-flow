import { SupplierRoutingManager } from "@/components/buildflow/supplier-routing-manager";
import { requireStaffProfile } from "@/lib/auth";
import type { ManagerCatalogAddOns } from "@/lib/manager-add-ons";
import type { ShopQualificationSettings } from "@/lib/shop-qualification";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminVendorsPage() {
  await requireStaffProfile("suppliers");
  const { data: managerStateRow, error } = await createAdminClient()
    .from("workflow_manager_settings")
    .select("state")
    .eq("id", "singleton")
    .maybeSingle<{ state: { qualificationSettings?: ShopQualificationSettings; addOns?: ManagerCatalogAddOns } }>();
  if (error || !managerStateRow?.state?.qualificationSettings) {
    throw new Error("Could not load the supplier directory.");
  }

  return (
    <SupplierRoutingManager
      initialPanel="suppliers"
      supplierDirectoryOnly
      initialSettings={managerStateRow.state.qualificationSettings}
      initialAddOns={managerStateRow?.state?.addOns ?? null}
    />
  );
}
