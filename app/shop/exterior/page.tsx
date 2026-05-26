import { renderShopToolPage } from "@/app/shop/tool-page"

export default async function ExteriorPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("exterior", searchParams)
}
