import { OrderFlowTest } from "@/components/buildflow/order-flow-test"
import { requireStaffProfile } from "@/lib/auth"
import { SHOP_TOOL_CATEGORIES } from "@/lib/shop-tools"

export default async function OrderTestPage() {
  await requireStaffProfile("aiTools")
  const departments = SHOP_TOOL_CATEGORIES.filter((category) => !["services", "kitchen", "eitan"].includes(category.slug)).map(({ slug, label }) => ({ slug, label: slug === "wood-floor" ? "Flooring" : label }))
  return <main className="min-h-screen px-4 py-6 sm:px-8 lg:px-10"><div className="mx-auto max-w-6xl"><Link href="/admin/ai-tools" className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-[#0066cc] hover:text-sky-800"><ChevronLeft aria-hidden="true" className="h-4 w-4" />Manager Tools</Link><h1 className="mt-2 text-3xl font-bold text-slate-950">Department Order Test</h1><div className="mt-5"><OrderFlowTest departments={departments} /></div></div></main>
}
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
