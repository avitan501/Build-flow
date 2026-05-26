import { renderShopToolPage } from "@/app/shop/tool-page"

export default async function DoorAndMoldingPage({ searchParams }: { searchParams?: Promise<{ project?: string }> }) {
  return renderShopToolPage("door-and-molding", searchParams)
}
