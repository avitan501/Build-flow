"use client";

import { Bell, BellRing, ChevronRight, LoaderCircle, MessageSquareText, PackageCheck, RefreshCw, Store, Truck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { captureAvantiaEvent } from "@/lib/analytics/posthog-client";

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

type ActivityEvent = { id: string; intake_id: string | null; action: string; created_at: string };
type HistoryResponse = { notifications?: NotificationEvent[]; activity?: ActivityEvent[]; error?: string };
type SummaryResponse = { latestAt?: string | null; unreadCommunications?: number };

const LAST_SEEN_KEY = "avantia-manager-notifications-seen-at";

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

function activityTitle(action: string) {
  const known: Record<string, string> = {
    sms_command_received: "Phone instruction received",
    sms_message_joined: "Follow-up joined",
    ai_review_completed: "AI review completed",
    intake_confirmed: "Instruction approved",
    material_request_confirmed: "Material request created",
    supplier_confirmed: "Supplier added",
    intake_cancelled: "Instruction skipped",
  };
  return known[action] || action.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function ManagerNotificationCenter({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [error, setError] = useState("");
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const [unreadCommunications, setUnreadCommunications] = useState(0);
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
        const seenAt = window.localStorage.getItem(LAST_SEEN_KEY) || "";
        setHasNewActivity(Boolean(result.latestAt && result.latestAt > seenAt));
        setUnreadCommunications(Math.max(0, result.unreadCommunications || 0));
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
      const response = await fetch("/api/manager-notifications", { cache: "no-store" });
      const result = await response.json() as HistoryResponse;
      if (!response.ok) throw new Error(result.error || "Notification history could not load.");
      setEvents(result.notifications ?? []);
      setActivity(result.activity ?? []);
      captureAvantiaEvent("avantia_notification_center_loaded", {
        duration_ms: Math.round(performance.now() - startedAt),
        event_count: (result.notifications ?? []).length + (result.activity ?? []).length,
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
    window.localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    setHasNewActivity(false);
    void load();
  }

  return <>
    <button ref={buttonRef} type="button" onClick={openCenter} className={`group relative inline-flex min-h-10 items-center rounded-lg text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[#0071e3] ${compact ? "mx-auto w-10 justify-center" : "w-full gap-2.5 px-2.5"}`} aria-label="Open notifications and activity"><Bell className="h-[18px] w-[18px] shrink-0 text-[#0071e3]" />{compact ? null : <span className="min-w-0 flex-1 text-left">Notifications</span>}{unreadCommunications ? <span className={`${compact ? "absolute -right-0.5 -top-0.5" : ""} inline-flex min-w-5 items-center justify-center rounded-full bg-[#0071e3] px-1.5 py-0.5 text-[9px] font-black text-white`}>{unreadCommunications > 99 ? "99+" : unreadCommunications}</span> : hasNewActivity ? <span className={`${compact ? "absolute right-1 top-1" : ""} h-2 w-2 rounded-full bg-rose-500`} aria-label="New activity" /> : null}</button>
    {open ? <div className="fixed inset-0 z-[170] grid place-items-end bg-slate-950/40 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="notification-center-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}>
      <section className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-xl bg-white shadow-2xl sm:max-w-xl sm:rounded-lg">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#0071e3]">Manager center</p><h2 id="notification-center-title" className="mt-0.5 text-xl font-semibold">Notifications & activity</h2><p className="mt-0.5 text-xs text-slate-500">A dated log of orders, messages, suppliers, approvals, and deliveries.</p></div><div className="flex gap-1"><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200" aria-label="Refresh notifications">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</button><button type="button" onClick={() => setOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200" aria-label="Close notification center"><X className="h-4 w-4" /></button></div></header>
        <div className="overflow-y-auto">
          {error ? <p role="alert" className="m-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">{error}</p> : null}
          {!loading && !error && !events.length && !activity.length ? <div className="px-5 py-12 text-center"><Bell className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-2 text-sm font-semibold">No activity yet</p></div> : null}
          {events.map((event) => { const style = eventStyle[event.event_type]; const Icon = style.icon; const href = event.href.startsWith("/") ? event.href : "/admin/build-map"; return <Link key={event.id} href={href} onClick={() => setOpen(false)} className="group flex min-h-20 items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50"><span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${style.tone}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center justify-between gap-x-3"><strong className="text-sm">{event.title}</strong><time className="text-[11px] text-slate-400">{eventDate(event.created_at)}</time></span><span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-slate-600">{event.body}</span><span className="mt-1 block text-[10px] font-semibold text-slate-400">Sent to {event.delivered_count} device{event.delivered_count === 1 ? "" : "s"}{event.failed_count ? ` · ${event.failed_count} failed` : ""}</span></span><ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5" /></Link>; })}
          {activity.length ? <div className="border-y border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">Phone AI activity</div> : null}
          {activity.map((event) => <Link key={`activity:${event.id}`} href="/owner/ai-inbox" onClick={() => setOpen(false)} className="group flex min-h-14 items-center gap-3 border-b border-slate-100 px-4 py-2.5 hover:bg-slate-50"><span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-sky-200 bg-sky-50 text-sky-700"><MessageSquareText className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><strong className="block text-xs capitalize">{activityTitle(event.action)}</strong><time className="mt-0.5 block text-[10px] text-slate-400">{eventDate(event.created_at)}</time></span><ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5" /></Link>)}
        </div>
      </section>
    </div> : null}
  </>;
}
