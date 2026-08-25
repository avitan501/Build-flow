import { ArrowLeft, Link2, ShieldCheck } from "lucide-react";
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
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Supplier connection</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Connect myABCsupply</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Connect your ABC account to search products and view your account pricing.</p></div>
          <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${connection.connected ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}><ShieldCheck className="h-4 w-4" />{connection.connected ? `Connected · ${connection.environment || "ABC"}` : "Not connected"}</span>
        </div>
        {message ? <p className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${message.className}`}>{message.text}</p> : null}
        {statusError ? <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{statusError}</p> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          {connection.connected ? <form action="/api/integrations/abc/disconnect" method="post"><button className="min-h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Disconnect myABCsupply</button></form> : <Link href="/api/integrations/abc/connect" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white hover:bg-[#0077ed]"><Link2 className="h-4 w-4" />Connect myABCsupply</Link>}
          <a href="https://www.abcsupply.com/abc-connect/" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">About ABC Connect</a>
        </div>
        {!connection.connected ? <p className="mt-3 text-xs text-slate-500">ABC Supply will open securely for sign-in.</p> : null}
      </header>

      {connection.connected ? <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-xl font-semibold">ABC Supply pricing</h2><p className="mt-1 text-sm leading-6 text-slate-600">Choose your Ship-To account and branch, then search ABC products. ABC Supply remains the seller; this page does not place orders.</p><div className="mt-5"><AbcSupplyPricing connectionMode="connected-user" /></div></section> : <section className="rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-center"><h2 className="text-lg font-semibold">Connect to view pricing</h2><p className="mt-2 text-sm text-slate-600">Connect your myABCsupply account to continue.</p></section>}
    </div>
  </main>;
}
