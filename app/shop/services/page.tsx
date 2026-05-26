import { renderShopToolPage } from "@/app/shop/tool-page"

type ServicesPageProps = {
  searchParams?: Promise<{ project?: string; address?: string }>
}

export default function ServicesPage({ searchParams }: ServicesPageProps) {
  return renderShopToolPage("services", searchParams)
}
