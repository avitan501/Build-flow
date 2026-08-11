import { OrderFlowTest } from "@/components/buildflow/order-flow-test"
import { requireAdminProfile } from "@/lib/auth"
import { SHOP_TOOL_CATEGORIES } from "@/lib/shop-tools"

export default async function OrderTestPage() {
  await requireAdminProfile()
  const departments = SHOP_TOOL_CATEGORIES.filter((category) => !["services", "kitchen", "eitan"].includes(category.slug)).map(({ slug, label }) => ({ slug, label: slug === "wood-floor" ? "Flooring" : label }))
  return <main className="min-h-screen px-4 py-6 sm:px-8 lg:px-10"><div className="mx-auto max-w-6xl"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">AI Tools</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Department Order Test</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Check any customer department in one press and see whether Quick Order or plan upload is ready.</p><div className="mt-6"><OrderFlowTest departments={departments} /></div></div></main>
}
