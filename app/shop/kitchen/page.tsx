import { renderShopToolPage } from "@/app/shop/tool-page"
import { shopDepartmentMetadata } from "@/lib/site-metadata"

export const metadata = shopDepartmentMetadata("kitchen", "Kitchen")

export default async function KitchenPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("kitchen", searchParams)
}
