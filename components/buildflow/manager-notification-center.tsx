"use client";

import { Bell, BellRing, ChevronRight, ListTodo, LoaderCircle, Mail, MessageSquareText, PackageCheck, PhoneIncoming, PhoneMissed, RefreshCw, Settings2, Store, Truck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { captureAvantiaEvent } from "@/lib/analytics/posthog-client";
import {
  managerNotificationCategory,
  managerNotificationCategoryLabel,
  managerNotificationDestination,
  safeManagerNotificationHref,
  summarizeManagerNotifications,
  type ManagerNotificationEvent,
} from "@/lib/manager-notification-feed";

type HistoryResponse = { notifications?: ManagerNotificationEvent[]; error?: string };
type SummaryResponse = { latestAt?: string | null; unreadCommunications?: number };
type NotificationFilter = "all" | "texts" | "calls" | "email" | "requests" | "actions";
type NotificationWindow = "all" | "unread" | "last24" | "incoming";

const notificationFilters: Array<{ value: NotificationFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "texts", label: "Texts & WhatsApp" },
  { value: "calls", label: "Calls" },
  { value: "email", label: "Email" },
  { value: "requests", label: "Requests" },
  { value: "actions", label: "Actions" },
];

const eventStyle = {
  message: { icon: MessageSquareText, tone: "border-violet-200 bg-violet-50 text-violet-700", labelTone: "text-violet-700" },
  incoming_call: { icon: PhoneIncoming, tone: "border-sky-200 bg-sky-50 text-sky-700", labelTone: "text-sky-700" },
  missed_call: { icon: PhoneMissed, tone: "border-rose-200 bg-rose-50 text-rose-700", labelTone: "text-rose-700" },
  email: { icon: Mail, tone: "border-indigo-200 bg-indigo-50 text-indigo-700", labelTone: "text-indigo-700" },
  task: { icon: ListTodo, tone: "border-amber-200 bg-amber-50 text-amber-700", labelTone: "text-amber-700" },
  system: { icon: Settings2, tone: "border-slate-200 bg-slate-50 text-slate-600", labelTone: "text-slate-500" },
  request: { icon: PackageCheck, tone: "border-amber-200 bg-amber-50 text-amber-700", labelTone: "text-amber-700" },
  supplier: { icon: Store, tone: "border-cyan-200 bg-cyan-50 text-cyan-700", labelTone: "text-cyan-700" },
  quote: { icon: BellRing, tone: "border-emerald-200 bg-emerald-50 text-emerald-700", labelTone: "text-emerald-700" },
  delivery: { icon: Truck, tone: "border-teal-200 bg-teal-50 text-teal-700", labelTone: "text-teal-700" },
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
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [windowFilter, setWindowFilter] = useState<NotificationWindow>("all");
  const [loadedAt, setLoadedAt] = useState(0);
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
        setUnreadNotifications(Math.max(0, result.unreadCommunications || 0));
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
      setLoadedAt(Date.now());
      setUnreadNotifications((result.notifications ?? []).filter((event) => event.event_type === "call_message" && !event.read_at).length);
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

  const summary = summarizeManagerNotifications(events, loadedAt || undefined);
  const filteredEvents = useMemo(() => events.filter((event) => {
    const category = managerNotificationCategory(event);
    const createdAt = Date.parse(event.created_at);
    if (windowFilter === "unread" && event.read_at) return false;
    if (windowFilter === "last24" && (!Number.isFinite(createdAt) || !loadedAt || createdAt < loadedAt - 24 * 60 * 60 * 1000 || createdAt > loadedAt)) return false;
    if (windowFilter === "incoming" && !["message", "incoming_call", "missed_call", "email"].includes(category)) return false;
    if (filter === "all") return true;
    if (filter === "texts") return category === "message";
    if (filter === "calls") return ["incoming_call", "missed_call"].includes(category);
    if (filter === "email") return category === "email";
    if (filter === "requests") return ["request", "quote", "delivery"].includes(category);
    return ["task", "supplier", "system"].includes(category);
  }), [events, filter, loadedAt, windowFilter]);

  function openNotification(event: ManagerNotificationEvent) {
    if (event.read_at) return;
    const category = managerNotificationCategory(event);
    setEvents((current) => current.map((item) => item.id === event.id ? { ...item, read_at: new Date().toISOString() } : item));
    if (["message", "incoming_call", "missed_call", "email"].includes(category)) setUnreadNotifications((current) => Math.max(0, current - 1));
    void fetch("/api/manager-notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", notificationId: event.id }),
    });
  }

  return <>
    <button ref={buttonRef} type="button" onClick={openCenter} className={`group relative inline-flex min-h-10 items-center rounded-lg text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[#0071e3] ${compact ? "mx-auto w-10 justify-center" : "w-full gap-2.5 px-2.5"}`} aria-label="Open notifications and activity"><Bell className="h-[18px] w-[18px] shrink-0 text-[#0071e3]" />{compact ? null : <span className="min-w-0 flex-1 text-left">Notifications</span>}{unreadNotifications ? <span className={`${compact ? "absolute -right-0.5 -top-0.5" : ""} inline-flex min-w-5 items-center justify-center rounded-full bg-[#0071e3] px-1.5 py-0.5 text-[9px] font-black text-white`}>{unreadNotifications > 99 ? "99+" : unreadNotifications}</span> : null}</button>
    {open ? <div className="fixed inset-0 z-[170] grid place-items-end bg-slate-950/40 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="notification-center-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}>
      <section className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-xl bg-white shadow-2xl sm:max-w-xl sm:rounded-lg">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#0071e3]">Manager center</p><h2 id="notification-center-title" className="mt-0.5 text-xl font-semibold">Notifications & activity</h2><p className="mt-0.5 text-xs text-slate-500">New-message alerts stay separate from requests and other activity.</p></div><div className="flex gap-1"><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200" aria-label="Refresh notifications">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</button><button type="button" onClick={() => setOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200" aria-label="Close notification center"><X className="h-4 w-4" /></button></div></header>
        <div className="overflow-y-auto">
          {error ? <p role="alert" className="m-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">{error}</p> : null}
          {events.length ? <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50" aria-label="Filter notifications by status"><button type="button" aria-pressed={windowFilter === "unread"} onClick={() => setWindowFilter((current) => current === "unread" ? "all" : "unread")} className={`px-3 py-2 text-center ${windowFilter === "unread" ? "bg-sky-100" : ""}`}><strong className="block text-sm">{summary.unread}</strong><span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Unread</span></button><button type="button" aria-pressed={windowFilter === "last24"} onClick={() => setWindowFilter((current) => current === "last24" ? "all" : "last24")} className={`border-x border-slate-200 px-3 py-2 text-center ${windowFilter === "last24" ? "bg-sky-100" : ""}`}><strong className="block text-sm">{summary.last24Hours}</strong><span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Last 24h</span></button><button type="button" aria-pressed={windowFilter === "incoming"} onClick={() => setWindowFilter((current) => current === "incoming" ? "all" : "incoming")} className={`px-3 py-2 text-center ${windowFilter === "incoming" ? "bg-sky-100" : ""}`}><strong className="block text-sm">{summary.incoming}</strong><span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Incoming</span></button></div> : null}
          {events.length ? <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2" aria-label="Filter notifications by category">{notificationFilters.map((option) => <button key={option.value} type="button" aria-pressed={filter === option.value} onClick={() => setFilter(option.value)} className={`min-h-9 shrink-0 rounded-full px-3 text-[11px] font-bold ${filter === option.value ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{option.label}</button>)}</div> : null}
          {!loading && !error && !events.length ? <div className="px-5 py-12 text-center"><Bell className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-2 text-sm font-semibold">No activity yet</p></div> : null}
          {!loading && !error && events.length > 0 && !filteredEvents.length ? <div className="px-5 py-10 text-center"><p className="text-sm font-semibold">Nothing in this section</p><p className="mt-1 text-xs text-slate-500">Choose another filter to see more activity.</p></div> : null}
          {filteredEvents.map((event) => { const category = managerNotificationCategory(event); const style = eventStyle[category]; const Icon = style.icon; const href = safeManagerNotificationHref(event.href); return <Link key={event.id} href={href} onClick={() => { openNotification(event); setOpen(false); }} className={`group flex min-h-20 items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50 ${event.read_at ? "" : "bg-sky-50/40"}`}><span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${style.tone}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3"><span className={`text-[9px] font-black uppercase tracking-[.1em] ${style.labelTone}`}>{managerNotificationCategoryLabel(category)}</span><time className="shrink-0 text-[11px] text-slate-400">{eventDate(event.created_at)}</time></span><strong className="mt-0.5 block text-sm leading-5">{event.title}</strong><span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-slate-600">{event.body}</span><span className="mt-1 block text-[10px] font-semibold text-[#0066cc]">{managerNotificationDestination(href)}{event.processed_at ? "" : " · Sending"}</span></span><ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5" /></Link>; })}
        </div>
      </section>
    </div> : null}
  </>;
}
