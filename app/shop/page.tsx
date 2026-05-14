import { ShopCatalogExperience } from "@/components/buildflow/shop-catalog-experience"
import { buildShopProducts } from "@/lib/shop-catalog"
import { loadShopActivityForCurrentUser } from "@/lib/shop-activity-server"
import { loadShopItems } from "@/lib/shop-loader"

export default async function ShopPage() {
  const [{ data: itemsData, error }, recentActivity] = await Promise.all([
    loadShopItems({ limit: 120 }),
    loadShopActivityForCurrentUser(24),
  ])
  const products = buildShopProducts(itemsData, error)

  return <ShopCatalogExperience products={products} recentActivity={recentActivity} />
}
