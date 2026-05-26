import { renderShopToolPage } from "@/app/shop/tool-page"

export default async function WindowPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("window", searchParams)
}
