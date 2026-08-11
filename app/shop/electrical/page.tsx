import { renderShopToolPage } from "@/app/shop/tool-page"

export default async function ElectricalPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("electrical", searchParams)
}
