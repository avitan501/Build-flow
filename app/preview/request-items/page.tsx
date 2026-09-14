import { notFound } from "next/navigation"
import { RequestItemReviewList } from "@/components/buildflow/request-item-review-list"
import { requestItemRevision } from "@/lib/request-item-revision"

export const dynamic = "force-dynamic"
export const metadata = { robots: { index: false, follow: false } }

export default async function LocalRequestItemsPreview({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  if (process.env.AVANTIA_LOCAL_UI_TEST !== "1") notFound()
  const { kind } = await searchParams
  const products = Array.from({ length: 62 }, (_, index) => {
    const item = { id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, name: index === 7 || index === 61 ? `CDX plywood · product ${index + 1}` : `Dimensional lumber · product ${index + 1}`, quantity: 60 + index, unit: "pieces", department: "Framing", metadata: { ai_organized: true, thickness: "5/8 in", review_status: index === 7 || index === 61 ? "missing" : "ready", review_reasons: index === 7 || index === 61 ? ["Plywood sheet dimensions are missing"] : [], request_item_fields: [{ id: "thickness", label: "Thickness", value: "5/8 in" }, { id: "section", label: "Section", value: "First floor" }] } }
    if (kind === "original" || (kind === "mixed" && index === 7)) item.metadata.ai_organized = false
    return { item, source: null, revision: requestItemRevision(item, null) }
  })
  return <main className="mx-auto w-full max-w-6xl bg-white p-3"><RequestItemReviewList key="local-fixture" requestId="11111111-1111-4111-8111-111111111111" actorId="local-fixture" products={products} /></main>
}
