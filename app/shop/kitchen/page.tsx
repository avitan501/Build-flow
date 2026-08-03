import { renderShopToolPage } from "@/app/shop/tool-page"

export default async function KitchenPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("kitchen", searchParams)
}
