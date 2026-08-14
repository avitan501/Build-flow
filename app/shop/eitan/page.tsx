import { renderShopToolPage } from "@/app/shop/tool-page"
import { shopDepartmentMetadata } from "@/lib/site-metadata"

export const metadata = shopDepartmentMetadata("eitan", "Eitan Window Quote")

export default async function EitanPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("eitan", searchParams)
}
