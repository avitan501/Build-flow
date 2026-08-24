"use client";

import { Bell, BellRing, ChevronRight, LoaderCircle, MessageSquareText, PackageCheck, RefreshCw, Store, Truck, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type NotificationEvent = {
  id: string;
  event_type: "new_order" | "call_message" | "supplier_update" | "quote_approval" | "delivery_update" | "test";
  title: string;
  body: string;
  href: string;
  delivered_count: number;
  failed_count: number;
  created_at: string;
};

type HistoryResponse = { notifications?: NotificationEvent[]; error?: string };

const eventStyle = {
  new_order: { icon: PackageCheck, tone: "border-amber-200 bg-amber-50 text-amber-700" },
  call_message: { icon: MessageSquareText, tone: "border-violet-200 bg-violet-50 text-violet-700" },
  supplier_update: { icon: Store, tone: "border-sky-200 bg-sky-50 text-sky-700" },
  quote_approval: { icon: BellRing, tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  delivery_update: { icon: Truck, tone: "border-teal-200 bg-teal-50 text-teal-700" },
  test: { icon: Bell, tone: "border-slate-200 bg-slate-50 text-slate-600" },
} as const;

function eventDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function ManagerNotificationCenter() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/manager-notifications", { cache: "no-store" });
      const result = await response.json() as HistoryResponse;
      if (!response.ok) throw new Error(result.error || "Notification history could not load.");
      setEvents(result.notifications ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Notification history could not load.");
    } finally { setLoading(false); }
  }

  function openCenter() {
    setOpen(true);
    void load();
  }

  return <>
    <button type="button" onClick={openCenter} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm hover:border-sky-300" aria-label="Open notification center"><Bell className="h-4 w-4 text-[#0071e3]" />Notifications</button>
    {open ? <div className="fixed inset-0 z-[170] grid place-items-end bg-slate-950/40 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="notification-center-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}>
      <section className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-xl bg-white shadow-2xl sm:max-w-xl sm:rounded-lg">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#0071e3]">Manager activity</p><h2 id="notification-center-title" className="mt-0.5 text-xl font-semibold">Notification center</h2><p className="mt-0.5 text-xs text-slate-500">Orders, messages, suppliers, approvals, and deliveries.</p></div><div className="flex gap-1"><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200" aria-label="Refresh notifications">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</button><button type="button" onClick={() => setOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200" aria-label="Close notification center"><X className="h-4 w-4" /></button></div></header>
        <div className="overflow-y-auto">
          {error ? <p role="alert" className="m-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">{error}</p> : null}
          {!loading && !error && !events.length ? <div className="px-5 py-12 text-center"><Bell className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-2 text-sm font-semibold">No notifications yet</p></div> : null}
          {events.map((event) => { const style = eventStyle[event.event_type]; const Icon = style.icon; const href = event.href.startsWith("/") ? event.href : "/admin/build-map"; return <Link key={event.id} href={href} onClick={() => setOpen(false)} className="group flex min-h-20 items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50"><span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${style.tone}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center justify-between gap-x-3"><strong className="text-sm">{event.title}</strong><time className="text-[11px] text-slate-400">{eventDate(event.created_at)}</time></span><span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-slate-600">{event.body}</span><span className="mt-1 block text-[10px] font-semibold text-slate-400">Sent to {event.delivered_count} device{event.delivered_count === 1 ? "" : "s"}{event.failed_count ? ` · ${event.failed_count} failed` : ""}</span></span><ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5" /></Link>; })}
        </div>
      </section>
    </div> : null}
  </>;
}
