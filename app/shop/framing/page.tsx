import { renderShopToolPage } from "@/app/shop/tool-page"

export default async function FramingPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("framing", searchParams)
}
