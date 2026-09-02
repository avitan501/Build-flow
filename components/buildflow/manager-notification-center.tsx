"use client";

import { Bell, BellRing, ChevronRight, LoaderCircle, MessageSquareText, PackageCheck, RefreshCw, Store, Truck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { captureAvantiaEvent } from "@/lib/analytics/posthog-client";
import {
  managerNotificationDestination,
  safeManagerNotificationHref,
  summarizeManagerNotifications,
  type ManagerNotificationEvent,
} from "@/lib/manager-notification-feed";

type HistoryResponse = { notifications?: ManagerNotificationEvent[]; error?: string };
type SummaryResponse = { latestAt?: string | null; unreadNotifications?: number };

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

export function ManagerNotificationCenter({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<ManagerNotificationEvent[]>([]);
  const [error, setError] = useState("");
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let stopped = false;
    async function loadSummary() {
      if (document.visibilityState !== "visible") return;
      const bounds = buttonRef.current?.getBoundingClientRect();
      if (!bounds || bounds.width === 0 || bounds.height === 0 || bounds.right < 0 || bounds.left > window.innerWidth) return;
      try {
        const response = await fetch("/api/manager-notifications?summary=1", { cache: "no-store" });
        if (!response.ok) return;
        const result = await response.json() as SummaryResponse;
        if (stopped) return;
        setUnreadNotifications(Math.max(0, result.unreadNotifications || 0));
      } catch {
        // A badge is optional; notification history remains available on demand.
      }
    }
    void loadSummary();
    const timer = window.setInterval(loadSummary, 60_000);
    window.addEventListener("focus", loadSummary);
    return () => { stopped = true; window.clearInterval(timer); window.removeEventListener("focus", loadSummary); };
  }, []);

  async function load() {
    const startedAt = performance.now();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/manager-notifications?history=1", { cache: "no-store" });
      const result = await response.json() as HistoryResponse;
      if (!response.ok) throw new Error(result.error || "Notification history could not load.");
      setEvents(result.notifications ?? []);
      const unreadIds = (result.notifications ?? []).filter((event) => !event.read_at).map((event) => event.id);
      setUnreadNotifications(unreadIds.length);
      if (unreadIds.length) {
        const readResponse = await fetch("/api/manager-notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mark_all_read" }),
        });
        if (readResponse.ok) {
          const readAt = new Date().toISOString();
          setEvents((current) => current.map((event) => event.read_at ? event : { ...event, read_at: readAt }));
          setUnreadNotifications(0);
        }
      }
      captureAvantiaEvent("avantia_notification_center_loaded", {
        duration_ms: Math.round(performance.now() - startedAt),
        event_count: (result.notifications ?? []).length,
        success: true,
      });
    } catch (cause) {
      captureAvantiaEvent("avantia_notification_center_loaded", {
        duration_ms: Math.round(performance.now() - startedAt),
        event_count: 0,
        success: false,
      });
      setError(cause instanceof Error ? cause.message : "Notification history could not load.");
    } finally { setLoading(false); }
  }

  function openCenter() {
    setOpen(true);
    void load();
  }

  const summary = summarizeManagerNotifications(events);

  return <>
    <button ref={buttonRef} type="button" onClick={openCenter} className={`group relative inline-flex min-h-10 items-center rounded-lg text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[#0071e3] ${compact ? "mx-auto w-10 justify-center" : "w-full gap-2.5 px-2.5"}`} aria-label="Open notifications and activity"><Bell className="h-[18px] w-[18px] shrink-0 text-[#0071e3]" />{compact ? null : <span className="min-w-0 flex-1 text-left">Notifications</span>}{unreadNotifications ? <span className={`${compact ? "absolute -right-0.5 -top-0.5" : ""} inline-flex min-w-5 items-center justify-center rounded-full bg-[#0071e3] px-1.5 py-0.5 text-[9px] font-black text-white`}>{unreadNotifications > 99 ? "99+" : unreadNotifications}</span> : null}</button>
    {open ? <div className="fixed inset-0 z-[170] grid place-items-end bg-slate-950/40 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="notification-center-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}>
      <section className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-xl bg-white shadow-2xl sm:max-w-xl sm:rounded-lg">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#0071e3]">Manager center</p><h2 id="notification-center-title" className="mt-0.5 text-xl font-semibold">Notifications & activity</h2><p className="mt-0.5 text-xs text-slate-500">One timeline for requests, incoming messages, quotes, and deliveries.</p></div><div className="flex gap-1"><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200" aria-label="Refresh notifications">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</button><button type="button" onClick={() => setOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200" aria-label="Close notification center"><X className="h-4 w-4" /></button></div></header>
        <div className="overflow-y-auto">
          {error ? <p role="alert" className="m-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">{error}</p> : null}
          {events.length ? <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50"><div className="px-3 py-2 text-center"><strong className="block text-sm">{summary.unread}</strong><span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Unread</span></div><div className="border-x border-slate-200 px-3 py-2 text-center"><strong className="block text-sm">{summary.last24Hours}</strong><span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Last 24h</span></div><div className="px-3 py-2 text-center"><strong className="block text-sm">{summary.incoming}</strong><span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Messages</span></div></div> : null}
          {!loading && !error && !events.length ? <div className="px-5 py-12 text-center"><Bell className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-2 text-sm font-semibold">No activity yet</p></div> : null}
          {events.map((event) => { const style = eventStyle[event.event_type]; const Icon = style.icon; const href = safeManagerNotificationHref(event.href); return <Link key={event.id} href={href} onClick={() => setOpen(false)} className={`group flex min-h-20 items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50 ${event.read_at ? "" : "bg-sky-50/40"}`}><span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${style.tone}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center justify-between gap-x-3"><strong className="text-sm">{event.title}</strong><time className="text-[11px] text-slate-400">{eventDate(event.created_at)}</time></span><span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-slate-600">{event.body}</span><span className="mt-1 block text-[10px] font-semibold text-[#0066cc]">{managerNotificationDestination(href)}{event.processed_at ? "" : " · Sending"}</span></span><ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5" /></Link>; })}
        </div>
      </section>
    </div> : null}
  </>;
}
