import { renderShopToolPage } from "@/app/shop/tool-page"
import { shopDepartmentMetadata } from "@/lib/site-metadata"

export const metadata = shopDepartmentMetadata("concrete-masonry", "Concrete & Masonry")

export default async function ConcreteMasonryPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("concrete-masonry", searchParams)
}
