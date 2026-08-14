import { renderShopToolPage } from "@/app/shop/tool-page"
import { shopDepartmentMetadata } from "@/lib/site-metadata"

export const metadata = shopDepartmentMetadata("exterior", "Exterior")

export default async function ExteriorPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("exterior", searchParams)
}
