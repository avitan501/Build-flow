import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowUpRight, BadgeDollarSign, CheckCircle2, ChevronLeft, CircleAlert, Hammer, Link2, Search, ShieldCheck } from "lucide-react"

import { requireManagerPortalProfile } from "@/lib/auth"
import { recordAmazonAffiliateLinkAction } from "@/app/admin/goals-progress/affiliate-actions"

export const metadata: Metadata = {
  title: "Amazon Construction Deals | Avantia Build Manager",
  description: "Review Avantia's verified Amazon Associates setup and prepare compliant construction deal links.",
}

type AmazonProgram = {
  id: string
  supplier_name: string
  affiliate_status: string
  api_status: string
  category: string
  published_commission: string
  cookie_window: string
  new_york_access: string
  approved_promotional_methods: string | null
  safe_tracking_id: string | null
  deep_links_allowed: boolean | null
  product_feeds_allowed: boolean | null
  api_allowed: boolean | null
  product_images_allowed: boolean | null
  affiliate_test_url: string | null
  application_url: string | null
  next_action: string
  last_verified_date: string | null
}

type ChecklistItem = {
  id: string
  item_key: string
  label: string
  completed: boolean
  sort_order: number
}

const verifiedLinkChecklistKeys = new Set(["commission", "cookie", "tracking", "test_link", "test_click", "redirect", "no_secrets", "integration_notes"])

const searchCategories = [
  { label: "Fasteners & screws", query: "construction fasteners screws" },
  { label: "Power tools", query: "construction power tools" },
  { label: "Jobsite safety", query: "construction jobsite safety equipment" },
  { label: "Measuring & layout", query: "construction measuring layout tools" },
]

function amazonSearchUrl(query: string) {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}`
}

async function syncVerifiedSetupAction() {
  "use server"
  const result = await recordAmazonAffiliateLinkAction()
  redirect(`/admin/ai-tools/construction-amazon-deals?sync=${result.ok ? "ok" : "error"}`)
}

function StatePill({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] ${active ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}{children}</span>
}

export default async function AmazonConstructionDealsPage({ searchParams }: { searchParams: Promise<{ sync?: string }> }) {
  const { supabase, access } = await requireManagerPortalProfile()
  if (!access.aiTools || !access.owner) redirect("/")
  const { sync } = await searchParams

  const { data: program, error } = await supabase
    .from("affiliate_programs")
    .select("id,supplier_name,affiliate_status,api_status,category,published_commission,cookie_window,new_york_access,approved_promotional_methods,safe_tracking_id,deep_links_allowed,product_feeds_allowed,api_allowed,product_images_allowed,affiliate_test_url,application_url,next_action,last_verified_date")
    .eq("supplier_name", "Amazon Associates")
    .maybeSingle<AmazonProgram>()

  const { data: checklistData, error: checklistError } = program ? await supabase
    .from("affiliate_program_checklist")
    .select("id,item_key,label,completed,sort_order")
    .eq("program_id", program.id)
    .order("sort_order")
    .returns<ChecklistItem[]>() : { data: [] as ChecklistItem[], error: null }

  const feedConnected = Boolean(program?.product_feeds_allowed && program?.api_allowed)
  const verified = Boolean(program?.affiliate_test_url && program?.safe_tracking_id)
  const checklist = checklistData ?? []
  const completedChecklist = checklist.filter((item) => item.completed).length
  const checklistPercent = checklist.length ? Math.round((completedChecklist / checklist.length) * 100) : 0
  const needsVerifiedSync = verified && checklist.some((item) => !item.completed && verifiedLinkChecklistKeys.has(item.item_key))

  return <main className="min-h-screen bg-[#f2f0eb] px-3 py-5 sm:px-6 sm:py-8">
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/ai-tools" className="inline-flex min-h-10 items-center gap-1 text-xs font-bold text-slate-700 hover:text-sky-700"><ChevronLeft className="h-4 w-4" />Manager Tools</Link>

      <header className="relative overflow-hidden rounded-2xl bg-[#111820] px-5 py-7 text-white shadow-xl sm:px-8 sm:py-9">
        <div className="absolute inset-y-0 right-0 hidden w-2/5 border-l border-white/10 bg-[linear-gradient(135deg,transparent_20%,rgba(251,146,60,.12)_20%,rgba(251,146,60,.12)_22%,transparent_22%,transparent_46%,rgba(255,255,255,.06)_46%,rgba(255,255,255,.06)_48%,transparent_48%)] sm:block" />
        <div className="relative max-w-3xl">
          <div className="flex flex-wrap items-center gap-2"><span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-slate-950"><BadgeDollarSign className="h-5 w-5" /></span><StatePill active={verified}>{verified ? "Verified source" : "Setup incomplete"}</StatePill><StatePill active={feedConnected}>{feedConnected ? "Feed connected" : "Manual review"}</StatePill></div>
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[.24em] text-orange-300">Owner deal desk</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Amazon Construction Deals</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Use the verified Amazon Associates account to research construction products and prepare compliant links. This page never labels a price as a deal unless a manager verifies it at the source.</p>
        </div>
      </header>

      {sync === "ok" ? <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">Verified Amazon setup synced.</p> : null}
      {sync === "error" ? <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-900">Amazon setup could not be fully synced. Nothing was marked complete unless it was saved.</p> : null}

      {error || checklistError || !program ? <section className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900"><strong>Amazon setup could not be loaded.</strong><p className="mt-1">Open the Affiliate Program tracker to review the saved Amazon Associates record.</p><Link href="/admin/goals-progress#supplier-affiliate-program" className="mt-3 inline-flex font-bold underline">Open affiliate tracker</Link></section> : <>
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-label="Amazon setup readiness">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">Canonical setup checklist</p><h2 className="mt-1 text-2xl font-black text-slate-950">{completedChecklist} of {checklist.length} complete</h2><p className="mt-1 text-xs leading-5 text-slate-500">Read directly from the existing Affiliate Program tracker. Verified-link sync completes only the checks proven by the saved Amazon setup.</p></div>{needsVerifiedSync ? <form action={syncVerifiedSetupAction}><button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800"><CheckCircle2 className="h-4 w-4 text-orange-300" />Sync verified setup</button></form> : <StatePill active={checklist.length > 0 && completedChecklist === checklist.length}>{checklist.length > 0 && completedChecklist === checklist.length ? "Setup complete" : "Verified checks synced"}</StatePill>}</div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`${checklistPercent}% checklist complete`}><div className="h-full rounded-full bg-orange-500" style={{ width: `${checklistPercent}%` }} /></div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3"><span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-orange-300"><Hammer className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">Saved account</p><h2 className="mt-1 text-xl font-black text-slate-950">{program.supplier_name}</h2></div></div>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3"><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Program status</dt><dd className="mt-1 font-bold text-slate-950">{program.affiliate_status}</dd></div>
              <div className="rounded-xl bg-slate-50 p-3"><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Tracking ID</dt><dd className="mt-1 font-bold text-slate-950">{program.safe_tracking_id || "Not saved"}</dd></div>
              <div className="rounded-xl bg-slate-50 p-3"><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Published category rate</dt><dd className="mt-1 font-bold text-slate-950">{program.published_commission}</dd></div>
              <div className="rounded-xl bg-slate-50 p-3"><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Cookie window</dt><dd className="mt-1 font-bold text-slate-950">{program.cookie_window}</dd></div>
            </dl>
            <p className="mt-4 text-xs leading-5 text-slate-500">Last verified: {program.last_verified_date ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${program.last_verified_date}T00:00:00Z`)) : "Not recorded"}. Coverage: {program.new_york_access}.</p>
            <div className="mt-5 flex flex-wrap gap-2">{program.affiliate_test_url ? <Link href={program.affiliate_test_url} target="_blank" rel="noopener noreferrer sponsored" prefetch={false} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-black text-slate-950 hover:bg-orange-400"><Link2 className="h-4 w-4" />Open verified Amazon link<ArrowUpRight className="h-4 w-4" /></Link> : null}{program.application_url ? <Link href={program.application_url} target="_blank" rel="noopener noreferrer" prefetch={false} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-800 hover:border-slate-500">Associates dashboard<ArrowUpRight className="h-4 w-4" /></Link> : null}</div>
          </article>

          <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" /><div><h2 className="font-black text-amber-950">Publishing guardrail</h2><p className="mt-1 text-xs leading-5 text-amber-900">Open the product on Amazon, confirm the current price and availability, then create the exact special link in SiteStripe. Add the required affiliate disclosure wherever the link is published.</p></div></div>
            <div className="mt-4 border-t border-amber-200 pt-4"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-amber-800">Next account action</p><p className="mt-2 text-sm font-semibold leading-6 text-amber-950">{program.next_action}</p></div>
            {!feedConnected ? <p className="mt-4 rounded-xl bg-white/70 p-3 text-xs leading-5 text-amber-950"><strong>No automatic deal feed is connected.</strong> Product feeds, API prices, and Amazon product images stay off until the account explicitly permits them.</p> : null}
          </aside>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3"><Search className="mt-0.5 h-5 w-5 text-sky-700" /><div><h2 className="text-lg font-black text-slate-950">Research construction products</h2><p className="mt-1 text-xs leading-5 text-slate-500">These open ordinary Amazon searches. They are research shortcuts—not published affiliate links and not proof of a deal.</p></div></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{searchCategories.map((category) => <Link key={category.query} href={amazonSearchUrl(category.query)} target="_blank" rel="noopener noreferrer" prefetch={false} className="group flex min-h-14 items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-800 hover:border-sky-300 hover:bg-sky-50"><span>{category.label}</span><ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-sky-700" /></Link>)}</div>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="Amazon deal workflow">
          {[{ number: "01", title: "Find", body: "Research a relevant construction product and compare the exact size, pack, and model." }, { number: "02", title: "Verify", body: "Confirm the source page, current price, availability, and delivery details at that moment." }, { number: "03", title: "Publish", body: "Create the SiteStripe link, add disclosure, and record where the link was used." }].map((step) => <article key={step.number} className="rounded-2xl border border-slate-200 bg-[#111820] p-5 text-white"><span className="font-mono text-xs font-bold text-orange-300">{step.number}</span><h2 className="mt-5 text-lg font-black">{step.title}</h2><p className="mt-2 text-xs leading-5 text-slate-300">{step.body}</p></article>)}
        </section>
      </>}
    </div>
  </main>
}
