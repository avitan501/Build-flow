import { renderShopToolPage } from "@/app/shop/tool-page"

export default async function TileWorkPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("tile-work", searchParams)
}
