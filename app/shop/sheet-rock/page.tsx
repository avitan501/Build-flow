import { renderShopToolPage } from "@/app/shop/tool-page"
import { shopDepartmentMetadata } from "@/lib/site-metadata"

export const metadata = shopDepartmentMetadata("sheet-rock", "Drywall")

export default async function SheetRockPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("sheet-rock", searchParams)
}
