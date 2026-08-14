import { renderShopToolPage } from "@/app/shop/tool-page"
import { shopDepartmentMetadata } from "@/lib/site-metadata"

export const metadata = shopDepartmentMetadata("services", "Construction Services")

type ServicesPageProps = {
  searchParams?: Promise<{ project?: string; address?: string }>
}

export default function ServicesPage({ searchParams }: ServicesPageProps) {
  return renderShopToolPage("services", searchParams)
}
