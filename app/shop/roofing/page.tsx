import { renderShopToolPage } from "@/app/shop/tool-page"

export default async function RoofingPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("roofing", searchParams)
}
