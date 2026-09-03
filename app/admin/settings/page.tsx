import Link from "next/link";
import { Mail, MessageCircle, PhoneCall } from "lucide-react";

import { checkCommunicationConnectionsAction, sendOrderNotificationTestAction } from "@/app/admin/settings/actions";
import { requireManagerPortalProfile } from "@/lib/auth";

type DeliveryStatus = "sent" | "failed" | "not_configured" | "skipped";

function deliveryLabel(status?: string) {
  if (status === "sent") return "Sent";
  if (status === "failed") return "Failed";
  if (status === "not_configured") return "Email provider not configured";
  if (status === "skipped") return "Skipped";
  return null;
}

function deliveryClass(status?: string) {
  return status === "sent"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-rose-200 bg-rose-50 text-rose-800";
}

type ConnectionStatus = "connected" | "not-connected";

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ owner?: DeliveryStatus; client?: DeliveryStatus; clientReason?: "domain" | "provider"; check?: "complete" | "failed"; quo?: ConnectionStatus; whatsapp?: ConnectionStatus; websiteEmail?: ConnectionStatus; supabaseEmail?: ConnectionStatus }> }) {
  const { access } = await requireManagerPortalProfile();
  const params = await searchParams;
  const ownerResult = deliveryLabel(params.owner);
  const clientResult = deliveryLabel(params.client);

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 pb-28 pt-6 text-slate-950 sm:px-8 sm:pb-12">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-2xl border-b border-slate-200 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Manager</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Manager Settings</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Check communication availability without exposing passwords or integration keys.</p>
        </div>
        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5"><div><h2 className="font-bold">Communication connections</h2><p className="mt-1 text-xs text-slate-500">Website and secure broker availability, without exposing credentials.</p></div><form action={checkCommunicationConnectionsAction}><button type="submit" className="min-h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">Test connections</button></form></div>
          {params.check ? <p role="status" className={`border-b px-4 py-3 text-sm font-semibold ${params.check === "complete" ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-rose-100 bg-rose-50 text-rose-800"}`}>{params.check === "complete" ? "Connection check completed." : "The connection check could not complete."}</p> : null}
          <div className="grid md:grid-cols-4">{[
            { key: "quo" as const, label: "Q U O", icon: PhoneCall },
            { key: "whatsapp" as const, label: "WhatsApp", icon: MessageCircle },
            { key: "websiteEmail" as const, label: "Website direct email", icon: Mail },
            { key: "supabaseEmail" as const, label: "Supabase email fallback", icon: Mail },
          ].map((item) => { const Icon = item.icon; const status = params[item.key]; return <div key={item.key} className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"><Icon className="h-5 w-5 text-[#0066cc]" /><div><p className="text-sm font-semibold">{item.label}</p><p className={`text-xs font-semibold ${status === "connected" ? "text-emerald-700" : status === "not-connected" ? "text-amber-700" : "text-slate-500"}`}>{status === "connected" ? "Connected" : status === "not-connected" ? "Not connected" : "Press Test connections"}</p></div></div>; })}</div>
        </section>
        {ownerResult || clientResult ? (
          <div className="mt-6 grid gap-2 sm:grid-cols-2" role="status" aria-live="polite">
            <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${deliveryClass(params.owner)}`}>Owner notification: {ownerResult}</div>
            <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${deliveryClass(params.client)}`}>
              <p>Client confirmation: {clientResult}</p>
              {params.clientReason === "domain" ? <p className="mt-1 text-xs font-medium leading-5">Verify an Avantia sending domain in Resend before sending to client addresses.</p> : null}
              {params.clientReason === "provider" ? <p className="mt-1 text-xs font-medium leading-5">The email provider rejected this delivery. Check the Resend delivery log.</p> : null}
            </div>
          </div>
        ) : null}
        {access.owner ? <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#0066cc] text-white"><Mail className="h-5 w-5" /></span>
            <h2 className="mt-4 text-lg font-bold">Order email notifications</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <div><p className="font-semibold text-slate-950">Owner receives new requests</p><p className="text-slate-500">avitanneto@gmail.com</p></div>
              <div><p className="font-semibold text-slate-950">Client receives confirmation</p><p className="text-slate-500">The email on the client account</p></div>
            </div>
            <form action={sendOrderNotificationTestAction} className="mt-5">
              <button type="submit" className="min-h-11 w-full rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white">Send test to both emails</button>
              <p className="mt-2 text-xs leading-5 text-slate-500">Test client: info@fivetownsbuilders.com</p>
            </form>
          </section>
          <Link href="/admin/whatsapp/settings" className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-600 text-white"><MessageCircle className="h-5 w-5" /></span>
            <h2 className="mt-4 text-lg font-bold">WhatsApp</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Open the existing WhatsApp delivery configuration.</p>
            <span className="mt-5 inline-flex text-sm font-semibold text-[#0066cc]">Open settings</span>
          </Link>
        </div> : <p className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-600">Connection credentials and owner delivery tests remain restricted to David.</p>}
      </div>
    </main>
  );
}
