import { renderShopToolPage } from "@/app/shop/tool-page"

export default async function WoodFloorPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("wood-floor", searchParams)
}
