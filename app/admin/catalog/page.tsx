import { MaterialCatalogWorkspace } from "@/components/buildflow/material-catalog-workspace"
import { requireManagerPortalProfile } from "@/lib/auth"
import type { ManagerCatalogAddOns } from "@/lib/manager-add-ons"
import { materialCatalogDepartmentOptions, type CatalogSupplier, type MaterialCatalogItem, type MaterialCatalogSupplierPrice } from "@/lib/material-catalog"

export default async function ManagerMaterialCatalogPage() {
  const { supabase } = await requireManagerPortalProfile()
  if (!supabase) return null

  const [itemsResult, itemDepartmentsResult, pricesResult, suppliersResult, settingsResult] = await Promise.all([
    supabase
      .from("material_catalog_items")
      .select("id,category,item_code,name,description,measurement,thickness,brand,manufacturer_model_number,upc,admin_notes,package_quantity,package_unit,comparison_quantity,comparison_unit,review_status,quality_notes,default_quantity,unit,image_url,status,source,sort_order,created_at,updated_at")
      .order("category")
      .order("sort_order")
      .order("name")
      .returns<MaterialCatalogItem[]>(),
    supabase
      .from("material_catalog_item_departments")
      .select("item_id,department")
      .returns<Array<{ item_id: string; department: string }>>(),
    supabase
      .from("material_catalog_supplier_prices")
      .select("item_id,supplier_id,supplier_name_snapshot,supplier_sku,product_url,unit_price,availability,notes,price_type,verification_status,delivery_price,minimum_order,verified_at,expires_at,comparison_price,retail_store_id,retail_store_name,retail_zip_code,price_observed_at,source_document_id,source_file_name,source_quote_number,source_document_date,source_quantity,source_unit,source_line_total,source_page,source_text,updated_at")
      .returns<MaterialCatalogSupplierPrice[]>(),
    supabase.rpc("staff_load_catalog_suppliers"),
    supabase
      .from("workflow_manager_settings")
      .select("state")
      .eq("id", "singleton")
      .maybeSingle<{ state: { addOns?: ManagerCatalogAddOns } }>(),
  ])

  if (itemsResult.error || itemDepartmentsResult.error || pricesResult.error || suppliersResult.error) {
    throw new Error("The manager catalog could not be loaded. The catalog database update may still be pending.")
  }

  const suppliers = Array.isArray(suppliersResult.data) ? suppliersResult.data as CatalogSupplier[] : []
  const itemDepartmentMap = new Map<string, string[]>()
  for (const relationship of itemDepartmentsResult.data ?? []) {
    itemDepartmentMap.set(relationship.item_id, [...(itemDepartmentMap.get(relationship.item_id) ?? []), relationship.department])
  }
  const items = (itemsResult.data ?? []).map((item) => ({
    ...item,
    departments: [...new Set([item.category, ...(itemDepartmentMap.get(item.id) ?? [])])],
  }))
  const departments = materialCatalogDepartmentOptions(
    items.flatMap((item) => item.departments ?? [item.category]),
    (settingsResult.data?.state?.addOns?.categories ?? []).map((category) => category.label),
  )
  return <MaterialCatalogWorkspace initialItems={items} initialPrices={pricesResult.data ?? []} suppliers={suppliers} departments={departments} />
}
