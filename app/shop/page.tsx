import { ShopCatalogExperience } from "@/components/buildflow/shop-catalog-experience"
import { buildShopProducts } from "@/lib/shop-catalog"
import { loadShopItems } from "@/lib/shop-loader"

export default async function ShopPage() {
  const { data: itemsData, error } = await loadShopItems({ limit: 120 })
  const products = buildShopProducts(itemsData, error)

  return <ShopCatalogExperience products={products} />
}
