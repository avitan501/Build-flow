import { renderShopToolPage } from "@/app/shop/tool-page"

export default async function PaperWorkPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("paper-work", searchParams)
}
