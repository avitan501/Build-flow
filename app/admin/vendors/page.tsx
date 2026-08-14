import { SupplierRoutingManager } from "@/components/buildflow/supplier-routing-manager";
import { requireStaffProfile } from "@/lib/auth";
import type { ManagerCatalogAddOns } from "@/lib/manager-add-ons";
import { materialCatalogDepartmentOptions } from "@/lib/material-catalog";
import type { ShopQualificationSettings } from "@/lib/shop-qualification";
import type { SupplierDirectorySnapshot } from "./actions";

export default async function AdminVendorsPage() {
  const { supabase } = await requireStaffProfile("suppliers");
  const [{ data: managerStateRow, error }, { data: snapshotData }, { data: catalogRows }] = await Promise.all([
    supabase
      .from("workflow_manager_settings")
      .select("state")
      .eq("id", "singleton")
      .maybeSingle<{ state: { qualificationSettings?: ShopQualificationSettings; addOns?: ManagerCatalogAddOns } }>(),
    supabase.rpc("staff_load_supplier_directory_snapshot"),
    supabase.from("material_catalog_items").select("category").returns<Array<{ category: string }>>(),
  ]);
  const snapshot = snapshotData as SupplierDirectorySnapshot | null;
  const directory = snapshot?.settings ?? (error ? null : managerStateRow?.state?.qualificationSettings ?? null);
  const catalogDepartments = materialCatalogDepartmentOptions(
    (catalogRows ?? []).map((row) => row.category),
    (managerStateRow?.state?.addOns?.categories ?? []).map((category) => category.label),
  );

  return (
    <SupplierRoutingManager
      initialPanel="suppliers"
      supplierDirectoryOnly
      initialSettings={directory}
      initialDeletedSupplierIds={snapshot?.deletedSupplierIds ?? []}
      initialAddOns={managerStateRow?.state?.addOns ?? null}
      catalogDepartments={catalogDepartments}
    />
  );
}
