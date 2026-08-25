import { ArrowLeft, CheckCircle2, Link2, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { AbcSupplyPricing } from "@/components/buildflow/abc-supply-pricing";
import { callAbcBridge } from "@/lib/abc-supply/bridge";
import { requireSignedInProfile } from "@/lib/auth";

type Props = { searchParams?: Promise<{ abc?: string }> };
type Connection = { connected: boolean; environment?: "sandbox" | "production"; updatedAt?: string };

const messages: Record<string, { className: string; text: string }> = {
  connected: { className: "border-emerald-200 bg-emerald-50 text-emerald-900", text: "myABCsupply connected successfully." },
  disconnected: { className: "border-slate-200 bg-slate-50 text-slate-700", text: "myABCsupply was disconnected." },
  denied: { className: "border-amber-200 bg-amber-50 text-amber-900", text: "The ABC connection was cancelled." },
  "invalid-flow": { className: "border-red-200 bg-red-50 text-red-800", text: "The ABC connection request expired. Please start it again." },
  "connection-failed": { className: "border-red-200 bg-red-50 text-red-800", text: "ABC could not finish the connection. Please try again or contact AvantiaBuild support." },
};

export default async function AbcAccountPage({ searchParams }: Props) {
  await requireSignedInProfile();
  const params = (await searchParams) || {};
  const message = params.abc ? messages[params.abc] : null;
  let connection: Connection = { connected: false };
  let statusError = "";
  try {
    const payload = await callAbcBridge({ action: "connectionStatus" });
    if (payload?.connection && typeof payload.connection === "object") connection = payload.connection as Connection;
  } catch {
    statusError = "ABC connection status is temporarily unavailable.";
  }

  return <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-8 lg:px-10 lg:py-9">
    <div className="mx-auto max-w-5xl space-y-5">
      <Link href="/account" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#0066cc]"><ArrowLeft className="h-4 w-4" />Account &amp; Settings</Link>

      <header className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Supplier connection</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Connect myABCsupply</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Authorize AvantiaBuild to show only your ABC Ship-To accounts, eligible branches, products those branches offer, valid units, and private account pricing.</p></div>
          <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${connection.connected ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}><ShieldCheck className="h-4 w-4" />{connection.connected ? `Connected · ${connection.environment || "ABC"}` : "Not connected"}</span>
        </div>
        {message ? <p className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${message.className}`}>{message.text}</p> : null}
        {statusError ? <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{statusError}</p> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          {connection.connected ? <form action="/api/integrations/abc/disconnect" method="post"><button className="min-h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Disconnect myABCsupply</button></form> : <Link href="/api/integrations/abc/connect" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white hover:bg-[#0077ed]"><Link2 className="h-4 w-4" />Connect myABCsupply</Link>}
          <a href="https://www.abcsupply.com/abc-connect/" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">About ABC Connect</a>
        </div>
      </header>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-semibold">ABC-approved customer workflow</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {["Select authorized Ship-To account", "Select its authorized ABC branch", "Search ABC products offered there", "Choose ABC unit and quantity", "Verify the branch offers the item", "Request private account price"].map((step, index) => <div key={step} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{index + 1}. {step}</span></div>)}
        </div>
      </section>

      <section className="rounded-[28px] border border-sky-200 bg-sky-50 p-5 text-sm leading-6 text-slate-700">
        <h2 className="font-semibold text-slate-950">New York service setup</h2>
        <p className="mt-1">AvantiaBuild serves Cedarhurst, New York 11516. ABC has public New York locations, but private pricing can only use the branches ABC returns for the connected customer&apos;s selected Ship-To account. If no New York branch appears, the customer must ask their ABC account administrator or branch representative to add the correct New York location.</p>
      </section>

      {connection.connected ? <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-xl font-semibold">Build an ABC material estimate</h2><p className="mt-1 text-sm leading-6 text-slate-600">ABC Supply remains the material seller. AvantiaBuild retrieves the customer&apos;s authorized information and does not submit an order from this screen.</p><div className="mt-5"><AbcSupplyPricing connectionMode="connected-user" /></div></section> : <section className="rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-center"><h2 className="text-lg font-semibold">Connect before pricing</h2><p className="mt-2 text-sm text-slate-600">The customer&apos;s ABC authorization is required before AvantiaBuild can retrieve Ship-To accounts or private prices.</p></section>}

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-700"><h2 className="font-semibold text-slate-950">Support plan</h2><p className="mt-1">Primary integration contact: David Avitan, AvantiaBuild · office@build.avantiap.com. AvantiaBuild handles connection and workflow questions; ABC Supply handles account eligibility, branch authorization, material availability, final pricing, delivery, and purchasing.</p></section>
    </div>
  </main>;
}
