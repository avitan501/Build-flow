import { renderShopToolPage } from "@/app/shop/tool-page"

export default async function SheetRockPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("sheet-rock", searchParams)
}
