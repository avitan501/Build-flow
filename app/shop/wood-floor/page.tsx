import { renderShopToolPage } from "@/app/shop/tool-page"
import { shopDepartmentMetadata } from "@/lib/site-metadata"

export const metadata = shopDepartmentMetadata("wood-floor", "Flooring")

export default async function WoodFloorPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("wood-floor", searchParams)
}
