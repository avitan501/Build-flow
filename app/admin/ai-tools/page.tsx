import Link from "next/link"
import { redirect } from "next/navigation"
import { BarChart3, Bot, Calculator, Clapperboard, Files, ListTree, Store, Video } from "lucide-react"

import { requireManagerPortalProfile } from "@/lib/auth"

export default async function AdminAiToolsPage() {
  const { access } = await requireManagerPortalProfile()
  if (!access.aiTools) redirect("/")

  const tools = [
    { href: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Avantia%20Build%20meeting%20with%20Carlos&details=Avantia%20Build%20manager%20meeting&add=buildavantiap%40gmail.com", title: "Google Meet", description: "Schedule a manager meeting with Carlos without using permanent sidebar space.", icon: Video },
    { href: "/admin/ai-tools/media-messages", title: "Media & Messages", description: "Preview approved videos and pages, copy exact wording, and open a safe editable communication draft.", icon: Clapperboard },
    ...(access.owner ? [{ href: "/admin/ai-tools/aura", title: "Aura AI", description: "Reply settings, construction knowledge, and the private internal library in one place.", icon: Bot, badge: "Private" }] : []),
    ...(access.suppliers ? [{ href: "/admin/documents", title: "Documents", description: "Upload once, let AI prepare the details, then review and choose the correct destination.", icon: Files }] : []),
    { href: "/admin/ai-tools/material-list", title: "Material List Organizer", description: "Turn field notes and supplier lists into editable rows and CSV.", icon: ListTree },
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
          {tools.map((tool) => {
            const external = tool.href.startsWith("https://")
            return <Link key={tool.href} href={tool.href} prefetch={false} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md"><span className="flex items-start justify-between gap-3"><span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white"><tool.icon className="h-5 w-5" /></span>{"badge" in tool ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-amber-800">{tool.badge}</span> : null}</span><h2 className="mt-4 text-lg font-bold text-slate-950">{tool.title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{tool.description}</p><span className="mt-4 inline-flex text-sm font-semibold text-[#0066cc]">{external ? "Open preview" : "Open tool"}</span></Link>
          })}
        </section>
      </div>
    </main>
  )
}
