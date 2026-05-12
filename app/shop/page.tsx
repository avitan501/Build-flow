import { ShopCatalogExperience } from "@/components/buildflow/shop-catalog-experience"
import { buildShopProducts } from "@/lib/shop-catalog"
import type { ShopItemRecord } from "@/lib/shop"
import { createClient } from "@/lib/supabase/server"

export default async function ShopPage() {
  const supabase = await createClient()
  const { data: itemsData, error } = await supabase
    .from("shop_items")
    .select("id, supplier_estimate_id, supplier_name, quote_number, pricing_date, item_number, name, description, category, quantity, unit, unit_price, extended_price, source, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(24)
    .returns<ShopItemRecord[]>()

  const products = buildShopProducts(itemsData, error)

  return <ShopCatalogExperience products={products} />
}
