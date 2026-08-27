import Link from "next/link"
import { redirect } from "next/navigation"
import { Activity, BarChart3, Calculator, FilePenLine, Files, ListTree, MapPinned, SearchCheck, Store } from "lucide-react"

import { requireManagerPortalProfile } from "@/lib/auth"

export default async function AdminAiToolsPage() {
  const { access } = await requireManagerPortalProfile()
  if (!access.aiTools) redirect("/")

  const tools = [
    ...(access.suppliers ? [{ href: "/admin/documents", title: "Documents", description: "Upload once, let AI prepare the details, then review and choose the correct destination.", icon: Files }] : []),
    { href: "/admin/ai-tools/jobsite-delivery", title: "Jobsite Delivery", description: "Plan routes and loads, estimate delivery cost, and manage every request through completion.", icon: MapPinned },
    { href: "/admin/ai-tools/estimate-converter", title: "Beat Estimate Converter", description: "Remove company and client identity and prepare an Avantia proposal request.", icon: FilePenLine },
    { href: "/admin/ai-tools/material-list", title: "Material List Organizer", description: "Turn field notes and supplier lists into editable rows and CSV.", icon: ListTree },
    { href: "/admin/ai-tools/order-test", title: "Department Order Test", description: "Check Quick Order or plan upload without creating a fake request.", icon: Activity },
    { href: "/admin/ai-tools/locate-cheap-item", title: "Locate Cheap Item", description: "Search live public product pages and compare source-backed prices.", icon: SearchCheck, badge: "Live beta" },
    { href: "/shop/wood-floor/flooring-calculator", title: "Wood Floor Calculator", description: "Room takeoff, waste allowance, and marked-plan workflow.", icon: Calculator },
    ...(access.owner ? [{ href: "/admin/abc", title: "ABC Private Pricing", description: "Check owner-only ABC account pricing.", icon: Store }] : []),
    ...(access.traffic ? [{ href: "/admin/traffic", title: "Website Traffic", description: "Review production visitors and traffic status.", icon: BarChart3 }] : []),
  ]

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Manager Portal</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Manager Tools</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Internal tools for documents, supplier requests, material information, deliveries, and customer order paths.</p>
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {tools.map((tool) => <Link key={tool.href} href={tool.href} prefetch={false} className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md"><span className="flex items-start justify-between gap-3"><span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white"><tool.icon className="h-5 w-5" /></span>{"badge" in tool ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-amber-800">{tool.badge}</span> : null}</span><h2 className="mt-4 text-lg font-bold text-slate-950">{tool.title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{tool.description}</p><span className="mt-4 inline-flex text-sm font-semibold text-[#0066cc]">Open tool</span></Link>)}
        </section>
      </div>
    </main>
  )
}
