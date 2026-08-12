import { SupplierRoutingManager } from "@/components/buildflow/supplier-routing-manager";
import { requireStaffProfile } from "@/lib/auth";
import type { ManagerCatalogAddOns } from "@/lib/manager-add-ons";
import type { ShopQualificationSettings } from "@/lib/shop-qualification";

export default async function AdminVendorsPage() {
  const { supabase } = await requireStaffProfile("suppliers");
  const { data: managerStateRow, error } = await supabase
    .from("workflow_manager_settings")
    .select("state")
    .eq("id", "singleton")
    .maybeSingle<{ state: { qualificationSettings?: ShopQualificationSettings; addOns?: ManagerCatalogAddOns } }>();
  const directory = error ? null : managerStateRow?.state?.qualificationSettings ?? null;

  return (
    <SupplierRoutingManager
      initialPanel="suppliers"
      supplierDirectoryOnly
      initialSettings={directory}
      initialAddOns={managerStateRow?.state?.addOns ?? null}
    />
  );
}
