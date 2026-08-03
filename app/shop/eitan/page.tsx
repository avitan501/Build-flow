import { renderShopToolPage } from "@/app/shop/tool-page"

export default async function EitanPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("eitan", searchParams)
}
