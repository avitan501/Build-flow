import { renderShopToolPage } from "@/app/shop/tool-page"
import { shopDepartmentMetadata } from "@/lib/site-metadata"

export const metadata = shopDepartmentMetadata("siding", "Siding")

export default async function SidingPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("siding", searchParams)
}
