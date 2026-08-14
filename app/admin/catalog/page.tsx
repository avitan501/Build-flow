import { MaterialCatalogWorkspace } from "@/components/buildflow/material-catalog-workspace"
import { requireManagerPortalProfile } from "@/lib/auth"
import type { CatalogSupplier, MaterialCatalogItem, MaterialCatalogSupplierPrice } from "@/lib/material-catalog"

export default async function ManagerMaterialCatalogPage() {
  const { supabase } = await requireManagerPortalProfile()
  if (!supabase) return null

  const [itemsResult, pricesResult, suppliersResult] = await Promise.all([
    supabase
      .from("material_catalog_items")
      .select("id,category,item_code,name,description,default_quantity,unit,image_url,status,source,sort_order,created_at,updated_at")
      .order("category")
      .order("sort_order")
      .order("name")
      .returns<MaterialCatalogItem[]>(),
    supabase
      .from("material_catalog_supplier_prices")
      .select("item_id,supplier_id,supplier_name_snapshot,supplier_sku,unit_price,availability,notes,updated_at")
      .returns<MaterialCatalogSupplierPrice[]>(),
    supabase.rpc("staff_load_catalog_suppliers"),
  ])

  if (itemsResult.error || pricesResult.error || suppliersResult.error) {
    throw new Error("The manager catalog could not be loaded. The catalog database update may still be pending.")
  }

  const suppliers = Array.isArray(suppliersResult.data) ? suppliersResult.data as CatalogSupplier[] : []
  return <MaterialCatalogWorkspace initialItems={itemsResult.data ?? []} initialPrices={pricesResult.data ?? []} suppliers={suppliers} />
}
