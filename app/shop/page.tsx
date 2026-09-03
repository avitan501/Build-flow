import { ShopFaq } from "@/components/buildflow/shop-faq"
import { ShopCatalogExperience } from "@/components/buildflow/shop-catalog-experience"
import { ShopShowroom } from "@/components/buildflow/shop-showroom"
import { buildShopProducts } from "@/lib/shop-catalog"
import { loadShopActivityForCurrentUser } from "@/lib/shop-activity-server"
import { loadShopItems } from "@/lib/shop-loader"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata = pageMetadata({
  title: "Order Construction Materials | Avantia Build",
  description: "Choose a department, build a material list, upload plans, and request organized pricing and jobsite delivery.",
  path: "/shop",
})

type ShopSearchParams = Promise<Record<string, string | string[] | undefined>>

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function ShopPage({ searchParams }: { searchParams: ShopSearchParams }) {
  const query = await searchParams
  const category = firstValue(query.category)?.trim()
  const search = firstValue(query.q)?.trim()
  const showCatalog = Boolean(category || search)

  if (!showCatalog) {
    return <><ShopShowroom /><ShopFaq /></>
  }

  const [{ data: itemsData, error }, recentActivity] = await Promise.all([
    loadShopItems({ limit: 240 }),
    loadShopActivityForCurrentUser(24),
  ])
  const products = buildShopProducts(itemsData, error)

  return <><ShopCatalogExperience products={products} recentActivity={recentActivity} /><ShopFaq /></>
}
