import { renderShopToolPage } from "@/app/shop/tool-page"

export default async function SidingPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("siding", searchParams)
}
