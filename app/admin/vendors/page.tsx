import { SupplierRoutingManager, type SupplierProfileCommunicationSummary, type SupplierProfileDocumentSummary } from "@/components/buildflow/supplier-routing-manager";
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
  const { data: supplierCommunicationLinks } = await supabase
    .from("aura_communication_links")
    .select("communication_id,entity_id")
    .eq("entity_type", "supplier")
    .order("created_at", { ascending: false })
    .limit(1000)
    .returns<Array<{ communication_id: string; entity_id: string }>>();
  const communicationIds = [...new Set((supplierCommunicationLinks ?? []).map((link) => link.communication_id))];
  const { data: supplierCommunicationRows } = communicationIds.length
    ? await supabase
        .from("aura_communications")
        .select("id,channel,direction,counterparty_phone,counterparty_email,subject,body,status,occurred_at,read_at")
        .in("id", communicationIds)
        .order("occurred_at", { ascending: false })
        .limit(500)
        .returns<Array<Omit<SupplierProfileCommunicationSummary, "supplierId">>>()
    : { data: [] as Array<Omit<SupplierProfileCommunicationSummary, "supplierId">> };
  const supplierIdsByCommunicationId = new Map<string, Set<string>>();
  for (const link of supplierCommunicationLinks ?? []) {
    const ids = supplierIdsByCommunicationId.get(link.communication_id) ?? new Set<string>();
    ids.add(link.entity_id);
    supplierIdsByCommunicationId.set(link.communication_id, ids);
  }
  const supplierCommunications: SupplierProfileCommunicationSummary[] = (supplierCommunicationRows ?? []).flatMap((communication) => {
    const supplierIds = [...(supplierIdsByCommunicationId.get(communication.id) ?? [])];
    return supplierIds.length === 1 ? [{ ...communication, supplierId: supplierIds[0] }] : [];
  });

  return (
    <SupplierRoutingManager
      initialPanel="suppliers"
      supplierDirectoryOnly
      initialSettings={directory}
      initialDeletedSupplierIds={snapshot?.deletedSupplierIds ?? []}
      initialAddOns={managerStateRow?.state?.addOns ?? null}
      catalogDepartments={catalogDepartments}
      initialSupplierDocuments={supplierDocuments}
      initialSupplierCommunications={supplierCommunications}
    />
  );
}
