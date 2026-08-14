import { renderShopToolPage } from "@/app/shop/tool-page"
import { shopDepartmentMetadata } from "@/lib/site-metadata"

export const metadata = shopDepartmentMetadata("electrical", "Electrical")

export default async function ElectricalPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("electrical", searchParams)
}
