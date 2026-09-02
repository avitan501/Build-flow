import { ArrowLeft, Clock3, Eye, Mail, MessageSquareText } from "lucide-react";
import Link from "next/link";

import { requireManagerPortalProfile } from "@/lib/auth";

type ActivityRow = {
  id: string;
  user_id: string;
  event_type: "page_view" | "communication_sent" | "record_created" | "record_updated" | "record_deleted";
  page_path: string;
  page_label: string;
  metadata: { channel?: string; label?: string } | null;
  occurred_at: string;
};

function time(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function CarlosActivityPage() {
  const { supabase, user, access } = await requireManagerPortalProfile();
  const staff = access.owner
    ? await supabase.from("profiles").select("id,full_name,email").eq("role", "staff").eq("email", "buildavantiap@gmail.com").eq("is_active", true)
    : { data: [{ id: user.id, full_name: "My activity", email: user.email || "" }] };
  const staffIds = (staff.data ?? []).map((profile) => profile.id);
  let query = supabase
    .from("manager_staff_activity_events")
    .select("id,user_id,event_type,page_path,page_label,metadata,occurred_at")
    .order("occurred_at", { ascending: false })
    .limit(300);
  if (staffIds.length) query = query.in("user_id", staffIds);
  else query = query.eq("user_id", user.id);
  const result = await query.returns<ActivityRow[]>();
  const events = result.error ? [] : result.data ?? [];
  const newestEventTime = events[0] ? Date.parse(events[0].occurred_at) : 0;
  const last24Hours = events.filter((event) => Date.parse(event.occurred_at) >= newestEventTime - 24 * 60 * 60 * 1000);
  const pageViews = last24Hours.filter((event) => event.event_type === "page_view");
  const communications = last24Hours.filter((event) => event.event_type === "communication_sent");
  const uniqueAreas = [...new Set(pageViews.map((event) => event.page_label))];

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <Link href="/admin/build-map" className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-[#0066cc]"><ArrowLeft className="h-4 w-4" />Dashboard</Link>
            <h1 className="mt-1 text-3xl font-semibold">Carlos activity</h1>
            <p className="mt-1 text-sm text-slate-600">Where he worked and what he sent through Avantia.</p>
          </div>
          <Link href="/admin/daily-summary" className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-bold">Hours &amp; daily summary</Link>
        </header>

        <section className="mt-4 grid grid-cols-3 gap-2" aria-label="Last 24 hours summary">
          <div className="rounded-lg border border-slate-200 bg-white p-3"><Eye className="h-4 w-4 text-sky-700" /><strong className="mt-2 block text-2xl">{pageViews.length}</strong><span className="text-[11px] text-slate-500">Page changes</span></div>
          <div className="rounded-lg border border-slate-200 bg-white p-3"><MessageSquareText className="h-4 w-4 text-emerald-700" /><strong className="mt-2 block text-2xl">{communications.length}</strong><span className="text-[11px] text-slate-500">Messages sent</span></div>
          <div className="rounded-lg border border-slate-200 bg-white p-3"><Clock3 className="h-4 w-4 text-amber-700" /><strong className="mt-2 block text-2xl">{uniqueAreas.length}</strong><span className="text-[11px] text-slate-500">Areas used</span></div>
        </section>

        <p className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"><strong>Quick read:</strong> Carlos used {uniqueAreas.length} area{uniqueAreas.length === 1 ? "" : "s"}, changed pages {pageViews.length} time{pageViews.length === 1 ? "" : "s"}, and started {communications.length} recorded communication{communications.length === 1 ? "" : "s"} during the latest 24-hour activity window.{events[0] ? ` Last activity: ${time(events[0].occurred_at)}.` : " No activity has been recorded yet."}</p>

        <section className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3"><h2 className="font-semibold">Live history</h2><p className="text-xs text-slate-500">Newest activity first. No screen contents or passwords are recorded.</p></div>
          {events.length ? <div className="divide-y divide-slate-100">{events.map((event) => {
            const sent = event.event_type === "communication_sent";
            const recordAction = event.event_type.startsWith("record_")
              ? event.event_type.replace("record_", "")
              : null;
            const Icon = sent ? Mail : Eye;
            const label = sent
              ? event.metadata?.channel === "call" ? "Call started" : `${event.metadata?.channel || "Message"} sent`
              : recordAction ? `${event.metadata?.label || event.page_label} · ${recordAction}` : `Opened ${event.page_label}`;
            return <div key={event.id} className="flex min-h-14 items-center gap-3 px-4 py-2.5"><span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${sent ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}`}><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{label}</strong><time className="text-[11px] text-slate-500">{time(event.occurred_at)}</time></div>{event.page_path.startsWith("/admin/") ? <Link href={event.page_path} className="shrink-0 text-xs font-semibold text-[#0066cc]">Open</Link> : null}</div>;
          })}</div> : <p className="px-4 py-12 text-center text-sm text-slate-500">Activity will appear here as Carlos moves through Avantia.</p>}
        </section>
      </div>
    </main>
  );
}
