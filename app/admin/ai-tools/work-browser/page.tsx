import { ArrowLeft, ExternalLink, Eye, Globe2, LockKeyhole, MonitorUp, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { CarlosWorkBrowserAcknowledgement } from "@/components/buildflow/carlos-work-browser-acknowledgement"
import { requireManagerPortalProfile } from "@/lib/auth"
import {
  CARLOS_WORK_BROWSER_ACK_PREFIX,
  CARLOS_WORK_BROWSER_ACK_TITLE,
  CARLOS_WORK_BROWSER_EMAIL,
  CARLOS_WORK_BROWSER_STATEMENT,
  carlosWorkBrowserUrl,
  parseCarlosWorkBrowserAcknowledgement,
} from "@/lib/carlos-work-browser"
import { formatSiteDateTime } from "@/lib/site-date-time"

export default async function CarlosWorkBrowserPage() {
  const { supabase, user, profile, access } = await requireManagerPortalProfile()
  const email = String(user.email || profile?.email || "").trim().toLowerCase()
  const isCarlos = email === CARLOS_WORK_BROWSER_EMAIL
  if (!access.owner && !isCarlos) redirect("/admin/ai-tools")

  const carlosProfile = access.owner
    ? await supabase.from("profiles").select("id").eq("email", CARLOS_WORK_BROWSER_EMAIL).eq("is_active", true).limit(1).maybeSingle<{ id: string }>()
    : { data: { id: user.id }, error: null }
  const acknowledgementResult = carlosProfile.data?.id
    ? await supabase.from("manager_goals").select("details").eq("created_by", carlosProfile.data.id).eq("title", CARLOS_WORK_BROWSER_ACK_TITLE).like("details", `${CARLOS_WORK_BROWSER_ACK_PREFIX}%`).limit(1).maybeSingle<{ details: string | null }>()
    : { data: null, error: null }
  const acknowledgement = parseCarlosWorkBrowserAcknowledgement(acknowledgementResult.data?.details)

  if (isCarlos && !acknowledgement) {
    return <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-6 lg:py-10"><div className="mx-auto max-w-6xl"><Link href="/admin/ai-tools" className="mb-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#0066cc]"><ArrowLeft className="h-4 w-4" />Manager Tools</Link><CarlosWorkBrowserAcknowledgement statement={CARLOS_WORK_BROWSER_STATEMENT} /></div></main>
  }

  const ready = Boolean(acknowledgement)
  const browserUrl = carlosWorkBrowserUrl(access.owner)
  return <main className="min-h-screen bg-[#0a1020] px-3 py-4 text-white sm:px-5 lg:px-7">
    <div className="mx-auto max-w-[96rem]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex min-w-0 items-center gap-3"><Link href={access.owner ? "/admin/carlos-activity" : "/admin/build-map"} aria-label="Back" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5"><ArrowLeft className="h-4 w-4" /></Link><div className="min-w-0"><div className="flex items-center gap-2"><h1 className="truncate text-xl font-semibold">Employee Work Browser</h1><span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-1 text-[10px] font-bold text-emerald-300"><ShieldCheck className="h-3 w-3" />Monitored</span></div><p className="mt-0.5 text-xs text-slate-400">Current employee: Carlos · separate company profile</p></div></div>
        {ready ? <a href={browserUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0071e3] px-3 text-xs font-bold"><ExternalLink className="h-4 w-4" />Full screen</a> : null}
      </header>

      {ready ? <>
        <section className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"><Globe2 className="h-4 w-4 text-sky-300" /><span>U.S. work browser</span></div>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"><LockKeyhole className="h-4 w-4 text-emerald-300" /><span>Private Carlos profile</span></div>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"><Eye className="h-4 w-4 text-amber-300" /><span>{access.owner ? "Owner view only" : "Management may view"}</span></div>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"><MonitorUp className="h-4 w-4 text-violet-300" /><span>{access.owner ? "Control stays with Carlos" : "You control this screen"}</span></div>
        </section>
        <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl"><iframe title={access.owner ? "Carlos live work browser — view only" : "Carlos managed work browser"} src={browserUrl} className="h-[calc(100vh-13rem)] min-h-[34rem] w-full" allow="clipboard-read; clipboard-write; fullscreen" /></div>
        <p className="mt-2 text-[11px] text-slate-500">Acknowledged {formatSiteDateTime(acknowledgement!.acknowledgedAt, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}. Activity outside this company browser is not visible.</p>
      </> : <section className="mt-6 rounded-xl border border-amber-300/30 bg-amber-300/10 p-5"><h2 className="font-semibold">Waiting for Carlos</h2><p className="mt-2 text-sm leading-6 text-amber-100">Carlos must open this tool once and accept the work-browser monitoring notice before live viewing is enabled.</p></section>}
    </div>
  </main>
}
