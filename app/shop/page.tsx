import { ShopCatalogExperience } from "@/components/buildflow/shop-catalog-experience"
import { buildShopProducts } from "@/lib/shop-catalog"
import { SHOP_ITEM_SELECT_FIELDS, type ShopItemRecord } from "@/lib/shop"
import { createClient } from "@/lib/supabase/server"

export default async function ShopPage() {
  const supabase = await createClient()
  const { data: itemsData, error } = await supabase
    .from("shop_items")
    .select(SHOP_ITEM_SELECT_FIELDS)
    .order("created_at", { ascending: false })
    .limit(24)
    .returns<ShopItemRecord[]>()

  const products = buildShopProducts(itemsData, error)

  return <ShopCatalogExperience products={products} />
}
