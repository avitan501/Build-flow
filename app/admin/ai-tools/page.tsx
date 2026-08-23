import Link from "next/link"
import { redirect } from "next/navigation"
import { Activity, BarChart3, Calculator, FilePenLine, ListTree, Store } from "lucide-react"

import { requireManagerPortalProfile } from "@/lib/auth"

export default async function AdminAiToolsPage() {
  const { access } = await requireManagerPortalProfile()
  if (!access.aiTools) redirect("/")

  const tools = [
    { href: "/admin/ai-tools/estimate-converter", title: "Beat Estimate Converter", description: "Remove company and client identity and prepare an Avantia proposal request.", icon: FilePenLine },
    { href: "/admin/ai-tools/material-list", title: "Material List Organizer", description: "Turn field notes and supplier lists into editable rows and CSV.", icon: ListTree },
    { href: "/admin/ai-tools/order-test", title: "Department Order Test", description: "Check Quick Order or plan upload without creating a fake request.", icon: Activity },
    { href: "/shop/wood-floor/flooring-calculator", title: "Wood Floor Calculator", description: "Room takeoff, waste allowance, and marked-plan workflow.", icon: Calculator },
    ...(access.owner ? [{ href: "/admin/abc", title: "ABC Private Pricing", description: "Check owner-only ABC account pricing.", icon: Store }] : []),
    ...(access.traffic ? [{ href: "/admin/traffic", title: "Website Traffic", description: "Review production visitors and traffic status.", icon: BarChart3 }] : []),
  ]

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Manager Portal</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">AI Tools coming soon</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Internal utilities for preparing supplier requests, organizing material information, and checking customer order paths.</p>
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {tools.map((tool) => <Link key={tool.href} href={tool.href} prefetch={false} className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md"><span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white"><tool.icon className="h-5 w-5" /></span><h2 className="mt-4 text-lg font-bold text-slate-950">{tool.title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{tool.description}</p><span className="mt-4 inline-flex text-sm font-semibold text-[#0066cc]">Open tool</span></Link>)}
        </section>
      </div>
    </main>
  )
}
