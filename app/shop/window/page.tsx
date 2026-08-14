import { renderShopToolPage } from "@/app/shop/tool-page"
import { shopDepartmentMetadata } from "@/lib/site-metadata"

export const metadata = shopDepartmentMetadata("window", "Window")

export default async function WindowPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("window", searchParams)
}
