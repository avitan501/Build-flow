import { ArrowLeft, Clock3, Eye, FilePenLine, Mail, MessageCircle, MessageSquareText, Phone } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireManagerPortalProfile } from "@/lib/auth";
import {
  managerActivityDuration,
  summarizeManagerStaffActivity,
  type ManagerStaffActivityEvent,
} from "@/lib/manager-staff-activity";

function time(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function channelLabel(channel?: string) {
  if (channel === "sms") return "Text";
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "email") return "Email";
  if (channel === "call") return "Call";
  return "Message";
}

function outcomeLabel(outcome?: string) {
  if (outcome === "provider_unconfirmed") return "Provider not confirmed";
  if (outcome === "opened_on_device") return "Opened on phone";
  if (outcome === "no_answer") return "No answer";
  if (outcome === "failed") return "Failed";
  if (outcome === "completed") return "Completed";
  if (outcome === "received") return "Received";
  return "Sent";
}

function communicationIcon(channel?: string) {
  if (channel === "call") return Phone;
  if (channel === "whatsapp") return MessageCircle;
  if (channel === "email") return Mail;
  return MessageSquareText;
}

function recordActionLabel(event: ManagerStaffActivityEvent) {
  if (event.event_type === "record_created") return "Created";
  if (event.event_type === "record_updated") return "Updated";
  return "Deleted";
}

export default async function CarlosActivityPage() {
  const { supabase, access } = await requireManagerPortalProfile();
  if (!access.owner) redirect("/admin/build-map");
  const staff = await supabase.from("profiles").select("id,full_name,email").eq("role", "staff").eq("email", "buildavantiap@gmail.com").eq("is_active", true);
  const staffIds = (staff.data ?? []).map((profile) => profile.id);
  let query = supabase
    .from("manager_staff_activity_events")
    .select("id,user_id,event_type,page_path,page_label,metadata,occurred_at")
    .order("occurred_at", { ascending: false })
    .limit(300);
  if (staffIds.length) query = query.in("user_id", staffIds);
  else query = query.eq("user_id", "00000000-0000-0000-0000-000000000000");
  const result = await query.returns<ManagerStaffActivityEvent[]>();
  const events = result.error ? [] : result.data ?? [];
  const summary = summarizeManagerStaffActivity(events);
  const latestLabel = summary.latestEvent ? time(summary.latestEvent.occurred_at) : null;

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <Link href="/admin/build-map" className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-[#0066cc]"><ArrowLeft className="h-4 w-4" />Dashboard</Link>
            <h1 className="mt-1 text-3xl font-semibold">Carlos activity</h1>
            <p className="mt-1 text-sm text-slate-600">One private history of the pages, records, calls, and messages used through Avantia.</p>
          </div>
          <Link href="/admin/daily-summary" className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-bold">Hours &amp; daily summary</Link>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Last 24 hours summary">
          <div className="rounded-lg border border-slate-200 bg-white p-3"><Eye className="h-4 w-4 text-sky-700" /><strong className="mt-2 block text-2xl">{summary.pageViews}</strong><span className="text-[11px] text-slate-500">Pages opened</span></div>
          <div className="rounded-lg border border-slate-200 bg-white p-3"><MessageSquareText className="h-4 w-4 text-emerald-700" /><strong className="mt-2 block text-2xl">{summary.successfulCommunications}</strong><span className="text-[11px] text-slate-500">Completed communications</span></div>
          <div className="rounded-lg border border-slate-200 bg-white p-3"><FilePenLine className="h-4 w-4 text-violet-700" /><strong className="mt-2 block text-2xl">{summary.recordChanges}</strong><span className="text-[11px] text-slate-500">Records changed</span></div>
          <div className="rounded-lg border border-slate-200 bg-white p-3"><Clock3 className="h-4 w-4 text-amber-700" /><strong className="mt-2 block text-2xl">{summary.areas.length}</strong><span className="text-[11px] text-slate-500">Areas visited</span></div>
        </section>

        <section className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950" aria-label="One glance summary">
          {summary.last24Hours.length ? <p><strong>Last 24 hours:</strong> {summary.pageViews} page{summary.pageViews === 1 ? "" : "s"} opened across {summary.areas.length} area{summary.areas.length === 1 ? "" : "s"}, {summary.successfulCommunications} completed communication{summary.successfulCommunications === 1 ? "" : "s"}, and {summary.recordChanges} record change{summary.recordChanges === 1 ? "" : "s"}.{summary.failedCommunications ? ` ${summary.failedCommunications} communication attempt${summary.failedCommunications === 1 ? "" : "s"} need attention.` : ""}{summary.topArea ? ` Most used: ${summary.topArea}.` : ""}{summary.latestPage ? ` Latest page: ${summary.latestPage}.` : ""}</p> : <p><strong>Last 24 hours:</strong> No Carlos activity was recorded.{latestLabel ? ` Last earlier activity: ${latestLabel}.` : ""}</p>}
        </section>

        <section className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3"><h2 className="font-semibold">Live history</h2><p className="text-xs text-slate-500">Newest first. Recipient, request, outcome, and duration appear when available; message contents and passwords are never recorded here.</p></div>
          {events.length ? <div className="divide-y divide-slate-100">{events.map((event) => {
            const sent = event.event_type === "communication_sent";
            const recordAction = event.event_type.startsWith("record_");
            const metadata = event.metadata;
            const Icon = sent ? communicationIcon(metadata?.channel) : recordAction ? FilePenLine : Eye;
            const target = metadata?.label || metadata?.recipient || "contact";
            const title = sent
              ? `${channelLabel(metadata?.channel)} ${metadata?.channel === "call" ? "with" : "to"} ${target}`
              : recordAction
                ? `${recordActionLabel(event)} ${metadata?.label || event.page_label}`
                : `Opened ${event.page_label}`;
            const duration = managerActivityDuration(metadata);
            const failed = ["failed", "provider_unconfirmed", "no_answer"].includes(metadata?.outcome || "");
            const requestHref = metadata?.request_id && /^[0-9a-f-]{36}$/i.test(metadata.request_id)
              ? `/owner/materials/requests/${metadata.request_id}`
              : null;
            const openHref = event.page_path.startsWith("/admin/") || event.page_path.startsWith("/owner/") ? event.page_path : null;
            return <article key={event.id} className="flex min-h-16 items-start gap-3 px-4 py-3"><span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${failed ? "bg-rose-50 text-rose-700" : sent ? "bg-emerald-50 text-emerald-700" : recordAction ? "bg-violet-50 text-violet-700" : "bg-sky-50 text-sky-700"}`}><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{title}</strong><div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500"><time>{time(event.occurred_at)}</time>{sent && metadata?.outcome ? <span className={failed ? "font-bold text-rose-700" : "font-semibold text-emerald-700"}>{outcomeLabel(metadata.outcome)}</span> : null}{duration ? <span>Duration {duration}</span> : null}{metadata?.recipient && metadata.recipient !== target ? <span className="max-w-52 truncate">{metadata.recipient}</span> : null}{metadata?.subject ? <span className="max-w-52 truncate">{metadata.subject}</span> : null}</div>{metadata?.request ? <div className="mt-1 text-xs font-semibold text-[#0066cc]">Request: {requestHref ? <Link href={requestHref}>{metadata.request}</Link> : metadata.request}</div> : null}</div>{openHref ? <Link href={openHref} className="shrink-0 pt-1 text-xs font-semibold text-[#0066cc]">Open</Link> : null}</article>;
          })}</div> : <p className="px-4 py-12 text-center text-sm text-slate-500">Activity will appear here as Carlos moves through Avantia.</p>}
        </section>
      </div>
    </main>
  );
}
