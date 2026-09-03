import { SupplierRoutingManager, type SupplierProfileDocumentSummary } from "@/components/buildflow/supplier-routing-manager";
import { requireStaffProfile } from "@/lib/auth";
import type { ManagerCatalogAddOns } from "@/lib/manager-add-ons";
import { managerDocumentStatusLabel, type ManagerDocumentRecord } from "@/lib/manager-documents";
import { materialCatalogDepartmentOptions } from "@/lib/material-catalog";
import { formatSiteDate } from "@/lib/site-date-time";
import type { ShopQualificationSettings } from "@/lib/shop-qualification";
import type { SupplierDirectorySnapshot } from "@/lib/supplier-directory-persistence";

export default async function AdminVendorsPage() {
  const { supabase } = await requireStaffProfile("suppliers");
  const [{ data: managerStateRow, error }, { data: snapshotData }, { data: catalogRows }, { data: supplierDocumentRows }] = await Promise.all([
    supabase
      .from("workflow_manager_settings")
      .select("state")
      .eq("id", "singleton")
      .maybeSingle<{ state: { qualificationSettings?: ShopQualificationSettings; addOns?: ManagerCatalogAddOns } }>(),
    supabase.rpc("staff_load_supplier_directory_snapshot"),
    supabase.from("material_catalog_items").select("category").returns<Array<{ category: string }>>(),
    supabase.from("manager_documents").select("id,supplier_id,title,file_name,status,updated_at").not("supplier_id", "is", null).order("updated_at", { ascending: false }).limit(1000).returns<Array<Pick<ManagerDocumentRecord, "id" | "supplier_id" | "title" | "file_name" | "status" | "updated_at">>>(),
  ]);
  const snapshot = snapshotData as SupplierDirectorySnapshot | null;
  const directory = snapshot?.settings ?? (error ? null : managerStateRow?.state?.qualificationSettings ?? null);
  const catalogDepartments = materialCatalogDepartmentOptions(
    (catalogRows ?? []).map((row) => row.category),
    (managerStateRow?.state?.addOns?.categories ?? []).map((category) => category.label),
  );
  const supplierDocuments: SupplierProfileDocumentSummary[] = (supplierDocumentRows ?? []).flatMap((document) => document.supplier_id ? [{
    id: document.id,
    supplierId: document.supplier_id,
    title: document.title,
    fileName: document.file_name,
    statusLabel: managerDocumentStatusLabel(document.status),
    updatedLabel: formatSiteDate(document.updated_at),
  }] : []);

  return (
    <SupplierRoutingManager
      initialPanel="suppliers"
      supplierDirectoryOnly
      initialSettings={directory}
      initialDeletedSupplierIds={snapshot?.deletedSupplierIds ?? []}
      initialAddOns={managerStateRow?.state?.addOns ?? null}
      catalogDepartments={catalogDepartments}
      initialSupplierDocuments={supplierDocuments}
    />
  );
}
