import { renderShopToolPage } from "@/app/shop/tool-page"
import { shopDepartmentMetadata } from "@/lib/site-metadata"

export const metadata = shopDepartmentMetadata("paper-work", "Paperwork")

export default async function PaperWorkPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("paper-work", searchParams)
}
