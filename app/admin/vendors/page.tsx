import { SupplierRoutingManager } from "@/components/buildflow/supplier-routing-manager";
import { requireStaffProfile } from "@/lib/auth";
import type { ManagerCatalogAddOns } from "@/lib/manager-add-ons";
import type { ShopQualificationSettings } from "@/lib/shop-qualification";
import type { SupplierDirectorySnapshot } from "./actions";

export default async function AdminVendorsPage() {
  const { supabase } = await requireStaffProfile("suppliers");
  const { data: managerStateRow, error } = await supabase
    .from("workflow_manager_settings")
    .select("state")
    .eq("id", "singleton")
    .maybeSingle<{ state: { qualificationSettings?: ShopQualificationSettings; addOns?: ManagerCatalogAddOns } }>();
  const { data: snapshotData } = await supabase.rpc("staff_load_supplier_directory_snapshot");
  const snapshot = snapshotData as SupplierDirectorySnapshot | null;
  const directory = snapshot?.settings ?? (error ? null : managerStateRow?.state?.qualificationSettings ?? null);

  return (
    <SupplierRoutingManager
      initialPanel="suppliers"
      supplierDirectoryOnly
      initialSettings={directory}
      initialDeletedSupplierIds={snapshot?.deletedSupplierIds ?? []}
      initialAddOns={managerStateRow?.state?.addOns ?? null}
    />
  );
}
