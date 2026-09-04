import Link from "next/link"
import { redirect } from "next/navigation"
import { BarChart3, Bot, Bug, Calculator, Clapperboard, Files, LibraryBig, ListTree, MessageSquareText, Search, Store } from "lucide-react"

import { GoogleMeetLauncher } from "@/components/buildflow/google-meet-launcher"
import { requireManagerPortalProfile } from "@/lib/auth"

export default async function AdminAiToolsPage() {
  const { access } = await requireManagerPortalProfile()
  if (!access.aiTools) redirect("/")

  const tools = [
    { href: "/admin/ai-tools/media-messages", title: "Media & Messages", description: "Preview approved videos and pages, copy exact wording, and open a safe editable communication draft.", icon: Clapperboard },
    { href: "/admin/ai-tools/website-defects", title: "Website Defects", description: "Upload a screen recording or screenshot, describe the problem, and track it from review through verification.", icon: Bug, badge: "Issue inbox" },
    ...(access.owner ? [{ href: "/admin/ai-tools/aura", title: "Aura AI", description: "Reply settings, construction knowledge, and the private internal library in one place.", icon: Bot, badge: "Private" }] : []),
    ...(access.owner ? [{ href: "/admin/ai-tools/internal-library", title: "Aura Internal Library", description: "Search private, retrieval-only operating knowledge. Nothing here can be sent to a customer.", icon: LibraryBig, badge: "Owner" }] : []),
    ...(access.owner ? [{ href: "/admin/ai-tools/construction-amazon-deals", title: "Amazon Construction Deals", description: "Research construction products through the verified Amazon Associates record.", icon: Store, badge: "Owner" }] : []),
    { href: "/admin/ai-tools/locate-cheap-item", title: "Locate Cheap Item", description: "Compare live public sources for a specific material without sending or ordering.", icon: Search, badge: "Live beta" },
    { href: "/admin/ai-tools/sms-replies", title: "AI Reply Settings", description: "Set the global safety and follow-up rules for customer text replies.", icon: MessageSquareText },
    ...(access.suppliers ? [{ href: "/admin/documents", title: "Documents", description: "Upload once, let AI prepare the details, then review and choose the correct destination.", icon: Files }] : []),
    { href: "/admin/ai-tools/material-list", title: "Material List Organizer", description: "Turn field notes and supplier lists into editable rows and CSV.", icon: ListTree },
    { href: "/shop/wood-floor/flooring-calculator", title: "Wood Floor Calculator", description: "Room takeoff, waste allowance, and marked-plan workflow.", icon: Calculator },
    ...(access.owner ? [{ href: "/admin/abc", title: "ABC Private Pricing", description: "Check owner-only ABC account pricing.", icon: Store }] : []),
    ...(access.traffic ? [{ href: "/admin/traffic", title: "Website Traffic", description: "Review production visitors and traffic status.", icon: BarChart3 }] : []),
  ]

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[92rem]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Manager Portal</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Manager Tools</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Internal tools for documents, supplier requests, material information, deliveries, and customer order paths.</p>
        <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <GoogleMeetLauncher />
          {tools.map((tool) => {
            const external = tool.href.startsWith("https://")
            return <Link key={tool.href} href={tool.href} prefetch={false} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="group grid min-h-24 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-sky-300 hover:shadow-md"><span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white"><tool.icon className="h-4 w-4" /></span><span className="min-w-0"><span className="flex items-center gap-2"><h2 className="truncate text-sm font-bold text-slate-950">{tool.title}</h2>{"badge" in tool ? <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[.08em] text-amber-800">{tool.badge}</span> : null}</span><span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500">{tool.description}</span></span><span className="pt-1 text-xs font-semibold text-[#0066cc]">Open</span></Link>
          })}
        </section>
      </div>
    </main>
  )
}
