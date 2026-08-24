"use client";

import { Bell, BellOff, Check, LoaderCircle, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { ManagerPushPreferences } from "@/lib/manager-push-notifications";

type StatusResponse = { publicKey: string; deviceCount: number; preferences: ManagerPushPreferences };

const preferenceLabels: Array<{ key: keyof ManagerPushPreferences; label: string }> = [
  { key: "new_orders", label: "New orders and requests" },
  { key: "calls_and_messages", label: "Calls and messages" },
  { key: "supplier_updates", label: "Supplier replies" },
  { key: "quote_approvals", label: "Quote approvals" },
  { key: "delivery_updates", label: "Delivery updates" },
];

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

function installedOnHomeScreen() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function ManagerNotificationControl({ settings = false }: { settings?: boolean }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  useEffect(() => {
    if (!open) return;
    if (!supported) return;
    let active = true;
    Promise.all([
      fetch("/api/manager-notifications", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error("status");
        return response.json() as Promise<StatusResponse>;
      }),
      navigator.serviceWorker.register("/sw.js").then((registration) => registration.pushManager.getSubscription()),
    ]).then(([nextStatus, subscription]) => {
      if (!active) return;
      setStatus(nextStatus);
      setSubscribed(Boolean(subscription));
    }).catch(() => active && setMessage("Notification settings could not load. Please refresh and try again."));
    return () => { active = false; };
  }, [open, supported]);

  async function post(body: unknown) {
    const response = await fetch("/api/manager-notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json() as { error?: string; delivered?: number };
    if (!response.ok) throw new Error(result.error || "Request failed");
    return result;
  }

  async function enable() {
    if (!supported || !status) return;
    if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !installedOnHomeScreen()) {
      setMessage("On iPhone: tap Share, Add to Home Screen, then open Avantia from the new icon and press Enable.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notifications were not allowed in this device's settings.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(status.publicKey) });
      await post({ action: "subscribe", subscription: subscription.toJSON() });
      setSubscribed(true);
      setStatus({ ...status, deviceCount: status.deviceCount + (existing ? 0 : 1) });
      setMessage("Notifications are active on this device.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Notifications could not be enabled.");
    } finally { setLoading(false); }
  }

  async function disable() {
    setLoading(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await post({ action: "unsubscribe", endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      if (status) setStatus({ ...status, deviceCount: Math.max(0, status.deviceCount - 1) });
      setMessage("Notifications are off on this device.");
    } catch { setMessage("Notifications could not be turned off. Please try again."); }
    finally { setLoading(false); }
  }

  async function updatePreference(key: keyof ManagerPushPreferences, checked: boolean) {
    if (!status) return;
    const previous = status.preferences;
    const next = { ...previous, [key]: checked };
    setStatus({ ...status, preferences: next });
    try { await post({ action: "preferences", preferences: next }); }
    catch {
      setStatus({ ...status, preferences: previous });
      setMessage("That preference could not be saved.");
    }
  }

  async function sendTest() {
    setLoading(true);
    setMessage("");
    try {
      const result = await post({ action: "test" });
      setMessage(result.delivered ? "Test sent. Check this device now." : "No active device received the test.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "The test could not be sent."); }
    finally { setLoading(false); }
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className={settings ? "flex min-h-14 w-full items-center gap-3 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 hover:text-[#0066cc]" : "inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm hover:border-sky-300"} aria-label="Phone notification settings"><Bell className="h-4 w-4 text-[#0071e3]" />Phone notifications</button>
    {open ? <div className="fixed inset-0 z-[170] grid place-items-end bg-slate-950/40 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="notification-settings-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}>
      <section className="max-h-[92dvh] w-full overflow-y-auto rounded-t-xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-lg sm:p-6">
        <header className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0071e3]">This device</p><h2 id="notification-settings-title" className="mt-1 text-xl font-semibold">Phone notifications</h2><p className="mt-1 text-sm text-slate-500">Receive Avantia alerts on this computer or phone.</p></div><button type="button" onClick={() => setOpen(false)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200" aria-label="Close notification settings"><X className="h-4 w-4" /></button></header>
        {!supported ? <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><strong className="block">Open Avantia in Safari</strong><span className="mt-1 block">The ChatGPT browser cannot receive iPhone notifications. In Safari, tap Share, Add to Home Screen, then open Avantia from the new icon.</span></div> : null}
        {supported ? <div className="mt-5 flex items-center gap-3 rounded-md border border-slate-200 p-3"><span className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${subscribed ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{subscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{subscribed ? "Active on this device" : "Not active on this device"}</p><p className="text-xs text-slate-500">{status ? `${status.deviceCount} connected device${status.deviceCount === 1 ? "" : "s"}` : "Checking devices..."}</p></div></div> : null}
        {supported ? <button type="button" disabled={loading || !status} onClick={subscribed ? disable : enable} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : subscribed ? <BellOff className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}{subscribed ? "Turn off on this device" : "Enable on this device"}</button> : null}
        {status ? <fieldset className="mt-5 border-t border-slate-200 pt-4"><legend className="text-sm font-semibold">Send me alerts for</legend><div className="mt-2 divide-y divide-slate-100">{preferenceLabels.map((item) => <label key={item.key} className="flex min-h-11 cursor-pointer items-center justify-between gap-4 py-2 text-sm font-medium"><span>{item.label}</span><input type="checkbox" checked={status.preferences[item.key]} onChange={(event) => updatePreference(item.key, event.target.checked)} className="h-5 w-5 accent-[#0071e3]" /></label>)}</div></fieldset> : null}
        {subscribed ? <button type="button" disabled={loading} onClick={sendTest} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-800 disabled:opacity-50"><Check className="h-4 w-4" />Send test notification</button> : null}
        {message ? <p role="status" className="mt-3 rounded-md bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900">{message}</p> : null}
      </section>
    </div> : null}
  </>;
}
