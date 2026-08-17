import { BarChart3, Eye, MapPin, Monitor, Smartphone, Users } from "lucide-react"

import { TrafficInternalFilterStatus } from "@/components/buildflow/traffic-internal-filter-status"
import { requireAdminProfile } from "@/lib/auth"
import { FILTERED_TRAFFIC_START } from "@/lib/site-traffic"

type TrafficRow = { path: string; referrer_host: string | null; session_hash: string; device_class: "mobile" | "desktop"; city: string | null; region: string | null; country: string | null; user_id: string | null; created_at: string }
type TrafficProfile = { id: string; full_name: string | null; email: string }

function countBy(values: string[]) {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

function pageLabel(path: string) {
  if (path === "/") return "Home"
  return path.split("/").filter(Boolean).map((part) => part.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())).join(" / ")
}

function locationLabel(row: Pick<TrafficRow, "city" | "region" | "country">) {
  return [row.city, row.region, row.country].filter(Boolean).join(", ") || "Location unavailable"
}

function easternDayKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/New_York" }).formatToParts(new Date(value))
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || ""
  return `${get("year")}-${get("month")}-${get("day")}`
}

function formatEasternDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short" }).format(new Date(value))
}

export default async function WebsiteTrafficPage() {
  const { supabase } = await requireAdminProfile()
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30)
  const start = new Date(Math.max(thirtyDaysAgo.getTime(), new Date(FILTERED_TRAFFIC_START).getTime()))
  let rows: TrafficRow[] = []
  let profiles: TrafficProfile[] = []
  let loadError = false
  try {
    const { data, error } = await supabase
      .from("site_page_views")
      .select("path,referrer_host,session_hash,device_class,city,region,country,user_id,created_at")
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: false })
      .limit(10000)
      .returns<TrafficRow[]>()
    loadError = Boolean(error)
    rows = !error && Array.isArray(data) ? data as TrafficRow[] : []
    const userIds = [...new Set(rows.map((row) => row.user_id).filter((value): value is string => Boolean(value)))]
    if (!error && userIds.length) {
      const { data: profileRows } = await supabase.from("profiles").select("id,full_name,email").in("id", userIds).returns<TrafficProfile[]>()
      profiles = profileRows ?? []
    }
  } catch {
    loadError = true
  }
  const todayKey = easternDayKey(now)
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7)
  const todayViews = rows.filter((row) => easternDayKey(row.created_at) === todayKey).length
  const sevenDayRows = rows.filter((row) => new Date(row.created_at) >= sevenDaysAgo)
  const uniqueSessions = new Set(rows.map((row) => row.session_hash)).size
  const topPages = countBy(rows.map((row) => row.path)).slice(0, 10)
  const referrers = countBy(rows.map((row) => row.referrer_host && !row.referrer_host.endsWith("avantiap.com") ? row.referrer_host : "Direct / internal")).slice(0, 6)
  const mobileViews = rows.filter((row) => row.device_class === "mobile").length
  const desktopViews = rows.length - mobileViews
  const locations = countBy(rows.map(locationLabel)).slice(0, 8)
  const daily = Array.from({ length: 14 }, (_, offset) => {
    const date = new Date(now)
    date.setUTCDate(date.getUTCDate() - (13 - offset))
    const key = easternDayKey(date)
    return { key, label: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }), value: rows.filter((row) => easternDayKey(row.created_at) === key).length }
  })
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  const dailyLocationMap = new Map<string, { day: string; location: string; views: number; sessions: Set<string>; signedIn: Set<string> }>()
  for (const row of rows) {
    const day = easternDayKey(row.created_at)
    const location = locationLabel(row)
    const key = `${day}::${location}`
    const entry = dailyLocationMap.get(key) ?? { day, location, views: 0, sessions: new Set<string>(), signedIn: new Set<string>() }
    entry.views += 1
    entry.sessions.add(row.session_hash)
    if (row.user_id) entry.signedIn.add(row.user_id)
    dailyLocationMap.set(key, entry)
  }
  const dailyLocations = [...dailyLocationMap.values()].sort((a, b) => b.day.localeCompare(a.day) || b.views - a.views).slice(0, 50)
  const visitorMap = new Map<string, { session: string; userId: string | null; location: string; lastSeen: string; views: number; device: TrafficRow["device_class"]; path: string }>()
  for (const row of rows) {
    const entry = visitorMap.get(row.session_hash)
    if (entry) {
      entry.views += 1
      if (!entry.userId && row.user_id) entry.userId = row.user_id
      continue
    }
    visitorMap.set(row.session_hash, { session: row.session_hash, userId: row.user_id, location: locationLabel(row), lastSeen: row.created_at, views: 1, device: row.device_class, path: row.path })
  }
  const recentVisitors = [...visitorMap.values()].slice(0, 50)
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
        <p className="mt-2 text-sm text-slate-600">External customer activity since internal filtering was enabled. Owner, employee, test, and automated visits are excluded.</p>
        <TrafficInternalFilterStatus />
        {loadError ? <p className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">Traffic data is temporarily unavailable. The rest of the manager portal is still working.</p> : latestView ? <p className="mt-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Tracking active · Last view {latestView}</p> : <p className="mt-4 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">Tracking active · Waiting for the first visit</p>}

        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[{ label: "Views today", value: todayViews, icon: Eye }, { label: "Views in 7 days", value: sevenDayRows.length, icon: BarChart3 }, { label: "Visitors in 30 days", value: uniqueSessions, icon: Users }, { label: "Total 30-day views", value: rows.length, icon: Eye }].map((metric) => <div key={metric.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><metric.icon className="h-5 w-5 text-[#0066cc]" /><p className="mt-4 text-2xl font-bold tabular-nums text-slate-950">{metric.value.toLocaleString()}</p><p className="mt-1 text-xs font-semibold text-slate-500">{metric.label}</p></div>)}
        </section>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-950">Last 14 days</h2><p className="mt-1 text-xs text-slate-500">Page views per day</p></div><BarChart3 className="h-5 w-5 text-slate-400" /></div><div className="mt-5 grid h-48 grid-cols-[repeat(14,minmax(0,1fr))] items-end gap-1.5">{daily.map((day) => <div key={day.key} className="group flex h-full min-w-0 flex-col items-center justify-end"><span className="mb-1 text-[10px] font-semibold tabular-nums text-slate-500">{day.value || ""}</span><div className="w-full rounded-t bg-[#0071e3] transition-colors group-hover:bg-[#005bb5]" style={{ height: `${Math.max(day.value ? 8 : 2, (day.value / maxDaily) * 100)}%` }} /><span className="mt-2 hidden whitespace-nowrap text-[9px] text-slate-500 sm:block">{day.label}</span></div>)}</div></section>

        <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5"><div><h2 className="text-lg font-bold text-slate-950">Traffic by day and place</h2><p className="mt-1 text-xs text-slate-500">Approximate location from the visitor&apos;s connection</p></div><MapPin className="h-5 w-5 text-slate-400" /></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3 font-semibold sm:px-5">Date</th><th className="px-4 py-3 font-semibold">Place</th><th className="px-4 py-3 text-right font-semibold">Visitors</th><th className="px-4 py-3 text-right font-semibold">Views</th><th className="px-4 py-3 text-right font-semibold sm:px-5">Signed in</th></tr></thead><tbody className="divide-y divide-slate-100">{dailyLocations.length ? dailyLocations.map((entry) => <tr key={`${entry.day}-${entry.location}`}><td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900 sm:px-5">{new Date(`${entry.day}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td><td className="px-4 py-3 text-slate-700">{entry.location}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{entry.sessions.size}</td><td className="px-4 py-3 text-right tabular-nums">{entry.views}</td><td className="px-4 py-3 text-right tabular-nums sm:px-5">{entry.signedIn.size}</td></tr>) : <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">New visits with location will appear here.</td></tr>}</tbody></table></div>
        </section>

        <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-5"><h2 className="text-lg font-bold text-slate-950">Recent visitors</h2><p className="mt-1 text-xs text-slate-500">Signed-in customers are named. Guests remain anonymous.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3 font-semibold sm:px-5">Person</th><th className="px-4 py-3 font-semibold">Last seen</th><th className="px-4 py-3 font-semibold">Place</th><th className="px-4 py-3 font-semibold">Last page</th><th className="px-4 py-3 text-right font-semibold sm:px-5">Views</th></tr></thead><tbody className="divide-y divide-slate-100">{recentVisitors.length ? recentVisitors.map((visitor) => { const profile = visitor.userId ? profileById.get(visitor.userId) : null; return <tr key={visitor.session}><td className="px-4 py-3 sm:px-5"><p className="font-semibold text-slate-900">{profile?.full_name || profile?.email || `Anonymous ${visitor.session.slice(0, 6)}`}</p>{profile?.full_name ? <p className="text-xs text-slate-500">{profile.email}</p> : <p className="text-xs text-slate-500">{visitor.device}</p>}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatEasternDateTime(visitor.lastSeen)}</td><td className="px-4 py-3 text-slate-600">{visitor.location}</td><td className="max-w-[14rem] truncate px-4 py-3 text-slate-600">{pageLabel(visitor.path)}</td><td className="px-4 py-3 text-right font-bold tabular-nums sm:px-5">{visitor.views}</td></tr> }) : <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">New visitor sessions will appear here.</td></tr>}</tbody></table></div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h2 className="text-lg font-bold text-slate-950">Most visited pages</h2>{topPages.length ? <div className="mt-4 grid gap-3">{topPages.map(([path, count]) => <div key={path}><div className="flex items-center justify-between gap-3 text-sm"><span className="truncate font-semibold text-slate-800">{pageLabel(path)}</span><span className="shrink-0 font-bold tabular-nums text-slate-950">{count}</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0071e3]" style={{ width: `${Math.max(4, (count / maxPage) * 100)}%` }} /></div><p className="mt-1 truncate text-[10px] text-slate-400">{path}</p></div>)}</div> : <p className="mt-6 text-sm text-slate-500">Traffic will appear after customers begin visiting the updated website.</p>}</section>
          <div className="grid gap-5">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-base font-bold text-slate-950">Devices</h2><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-lg bg-slate-50 p-3"><Smartphone className="h-5 w-5 text-[#0066cc]" /><p className="mt-3 text-xl font-bold tabular-nums">{mobileViews}</p><p className="text-xs text-slate-500">Mobile views</p></div><div className="rounded-lg bg-slate-50 p-3"><Monitor className="h-5 w-5 text-[#0066cc]" /><p className="mt-3 text-xl font-bold tabular-nums">{desktopViews}</p><p className="text-xs text-slate-500">Desktop views</p></div></div></section>
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-base font-bold text-slate-950">Traffic sources</h2><div className="mt-3 divide-y divide-slate-100">{referrers.length ? referrers.map(([source, count]) => <div key={source} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span className="truncate text-slate-600">{source}</span><span className="font-bold tabular-nums text-slate-950">{count}</span></div>) : <p className="py-3 text-sm text-slate-500">No source data yet.</p>}</div></section>
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><h2 className="text-base font-bold text-slate-950">Visitor locations</h2><MapPin className="h-4 w-4 text-slate-400" /></div><div className="mt-3 divide-y divide-slate-100">{locations.length ? locations.map(([location, count]) => <div key={location} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span className="truncate text-slate-600">{location}</span><span className="font-bold tabular-nums text-slate-950">{count}</span></div>) : <p className="py-3 text-sm text-slate-500">No location data yet.</p>}</div></section>
          </div>
        </div>
        <p className="mt-5 text-xs leading-5 text-slate-500">Privacy: tracking stores page paths, device class, referrer host, approximate city/region/country, an anonymous session hash, and the account ID only when the visitor is signed in. It does not store IP addresses. Location can be inaccurate for mobile networks or VPNs.</p>
      </div>
    </main>
  )
}
