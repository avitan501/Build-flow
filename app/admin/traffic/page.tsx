import { BarChart3, Eye, Monitor, Smartphone, Users } from "lucide-react"

import { requireAdminProfile } from "@/lib/auth"

type TrafficRow = { path: string; referrer_host: string | null; session_hash: string; device_class: "mobile" | "desktop"; created_at: string }

function countBy(values: string[]) {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

function pageLabel(path: string) {
  if (path === "/") return "Home"
  return path.split("/").filter(Boolean).map((part) => part.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())).join(" / ")
}

export default async function WebsiteTrafficPage() {
  const { supabase } = await requireAdminProfile()
  const now = new Date()
  const start = new Date(now)
  start.setUTCDate(start.getUTCDate() - 30)
  let rows: TrafficRow[] = []
  let loadError = false
  try {
    const { data, error } = await supabase
      .from("site_page_views")
      .select("path,referrer_host,session_hash,device_class,created_at")
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: false })
      .limit(10000)
      .returns<TrafficRow[]>()
    loadError = Boolean(error)
    rows = !error && Array.isArray(data) ? data as TrafficRow[] : []
  } catch {
    loadError = true
  }
  const todayKey = now.toISOString().slice(0, 10)
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7)
  const todayViews = rows.filter((row) => row.created_at.slice(0, 10) === todayKey).length
  const sevenDayRows = rows.filter((row) => new Date(row.created_at) >= sevenDaysAgo)
  const uniqueSessions = new Set(rows.map((row) => row.session_hash)).size
  const topPages = countBy(rows.map((row) => row.path)).slice(0, 10)
  const referrers = countBy(rows.map((row) => row.referrer_host && !row.referrer_host.endsWith("avantiap.com") ? row.referrer_host : "Direct / internal")).slice(0, 6)
  const mobileViews = rows.filter((row) => row.device_class === "mobile").length
  const desktopViews = rows.length - mobileViews
  const daily = Array.from({ length: 14 }, (_, offset) => {
    const date = new Date(now)
    date.setUTCDate(date.getUTCDate() - (13 - offset))
    const key = date.toISOString().slice(0, 10)
    return { key, label: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }), value: rows.filter((row) => row.created_at.slice(0, 10) === key).length }
  })
  const maxDaily = Math.max(...daily.map((day) => day.value), 1)
  const maxPage = Math.max(topPages[0]?.[1] || 0, 1)
  const latestView = rows[0]?.created_at
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short" }).format(new Date(rows[0].created_at))
    : null

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Manager Portal</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Website Traffic</h1>
        <p className="mt-2 text-sm text-slate-600">Customer website activity from the last 30 days. Manager pages are excluded.</p>
        {loadError ? <p className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">Traffic data is temporarily unavailable. The rest of the manager portal is still working.</p> : latestView ? <p className="mt-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Tracking active · Last view {latestView}</p> : <p className="mt-4 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">Tracking active · Waiting for the first visit</p>}

        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[{ label: "Views today", value: todayViews, icon: Eye }, { label: "Views in 7 days", value: sevenDayRows.length, icon: BarChart3 }, { label: "Visitors in 30 days", value: uniqueSessions, icon: Users }, { label: "Total 30-day views", value: rows.length, icon: Eye }].map((metric) => <div key={metric.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><metric.icon className="h-5 w-5 text-[#0066cc]" /><p className="mt-4 text-2xl font-bold tabular-nums text-slate-950">{metric.value.toLocaleString()}</p><p className="mt-1 text-xs font-semibold text-slate-500">{metric.label}</p></div>)}
        </section>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-950">Last 14 days</h2><p className="mt-1 text-xs text-slate-500">Page views per day</p></div><BarChart3 className="h-5 w-5 text-slate-400" /></div><div className="mt-5 grid h-48 grid-cols-[repeat(14,minmax(0,1fr))] items-end gap-1.5">{daily.map((day) => <div key={day.key} className="group flex h-full min-w-0 flex-col items-center justify-end"><span className="mb-1 text-[10px] font-semibold tabular-nums text-slate-500">{day.value || ""}</span><div className="w-full rounded-t bg-[#0071e3] transition-colors group-hover:bg-[#005bb5]" style={{ height: `${Math.max(day.value ? 8 : 2, (day.value / maxDaily) * 100)}%` }} /><span className="mt-2 hidden whitespace-nowrap text-[9px] text-slate-500 sm:block">{day.label}</span></div>)}</div></section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h2 className="text-lg font-bold text-slate-950">Most visited pages</h2>{topPages.length ? <div className="mt-4 grid gap-3">{topPages.map(([path, count]) => <div key={path}><div className="flex items-center justify-between gap-3 text-sm"><span className="truncate font-semibold text-slate-800">{pageLabel(path)}</span><span className="shrink-0 font-bold tabular-nums text-slate-950">{count}</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0071e3]" style={{ width: `${Math.max(4, (count / maxPage) * 100)}%` }} /></div><p className="mt-1 truncate text-[10px] text-slate-400">{path}</p></div>)}</div> : <p className="mt-6 text-sm text-slate-500">Traffic will appear after customers begin visiting the updated website.</p>}</section>
          <div className="grid gap-5">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-base font-bold text-slate-950">Devices</h2><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-lg bg-slate-50 p-3"><Smartphone className="h-5 w-5 text-[#0066cc]" /><p className="mt-3 text-xl font-bold tabular-nums">{mobileViews}</p><p className="text-xs text-slate-500">Mobile views</p></div><div className="rounded-lg bg-slate-50 p-3"><Monitor className="h-5 w-5 text-[#0066cc]" /><p className="mt-3 text-xl font-bold tabular-nums">{desktopViews}</p><p className="text-xs text-slate-500">Desktop views</p></div></div></section>
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-base font-bold text-slate-950">Traffic sources</h2><div className="mt-3 divide-y divide-slate-100">{referrers.length ? referrers.map(([source, count]) => <div key={source} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span className="truncate text-slate-600">{source}</span><span className="font-bold tabular-nums text-slate-950">{count}</span></div>) : <p className="py-3 text-sm text-slate-500">No source data yet.</p>}</div></section>
          </div>
        </div>
        <p className="mt-5 text-xs leading-5 text-slate-500">Privacy: tracking stores page paths, device class, referrer host, and an anonymous session hash. It does not store customer names, emails, phone numbers, or IP addresses.</p>
      </div>
    </main>
  )
}
