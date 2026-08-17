import { ShopFaq } from "@/components/buildflow/shop-faq"
import { ShopCatalogExperience } from "@/components/buildflow/shop-catalog-experience"
import { buildShopProducts } from "@/lib/shop-catalog"
import { loadShopActivityForCurrentUser } from "@/lib/shop-activity-server"
import { loadShopItems } from "@/lib/shop-loader"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata = pageMetadata({
  title: "Order Construction Materials | Avantia Build",
  description: "Choose a department, build a material list, upload plans, and request organized pricing and jobsite delivery.",
  path: "/shop",
})

export default async function ShopPage() {
  const [{ data: itemsData, error }, recentActivity] = await Promise.all([
    loadShopItems({ limit: 240 }),
    loadShopActivityForCurrentUser(24),
  ])
  const products = buildShopProducts(itemsData, error)

  return <><ShopCatalogExperience products={products} recentActivity={recentActivity} /><ShopFaq /></>
}
