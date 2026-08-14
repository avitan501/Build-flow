import { renderShopToolPage } from "@/app/shop/tool-page"
import { shopDepartmentMetadata } from "@/lib/site-metadata"

export const metadata = shopDepartmentMetadata("tile-work", "Tile")

export default async function TileWorkPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("tile-work", searchParams)
}
