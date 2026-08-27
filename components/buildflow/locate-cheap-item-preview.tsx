"use client";

import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Copy,
  FileDown,
  Globe2,
  LockKeyhole,
  Mail,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

const steps = ["Website", "Items & Prices", "Suppliers & Email"];

const exampleItems = [
  { selected: true, item: "20A tamper-resistant duplex receptacle", category: "Devices", use: "General wall outlets", quantity: 40, sitePrice: "$4.28 ea", lowPrice: "$3.98 ea", difference: "$12.00", match: "Exact Match", source: "Authorized retailer", tone: "emerald" },
  { selected: true, item: "12/2 NM-B copper wire · 250 ft", category: "Wire & cable", use: "Residential branch circuits", quantity: 6, sitePrice: "$139.00", lowPrice: "$132.00", difference: "$42.00", match: "Exact Match", source: "Manufacturer listing", tone: "emerald" },
  { selected: false, item: "20-space / 40-circuit load center", category: "Panels", use: "Residential distribution", quantity: 1, sitePrice: "Quote", lowPrice: "$168.00", difference: "Not comparable", match: "Comparable", source: "National retailer", tone: "amber" },
];

function Progress({ current }: { current: number }) {
  return <ol className="grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-white" aria-label="Locate Cheap Item progress">
    {steps.map((label, index) => {
      const number = index + 1;
      const complete = number < current;
      const active = number === current;
      return <li key={label} className={`flex min-h-12 items-center gap-2 border-r border-slate-200 px-3 last:border-r-0 ${active ? "bg-slate-950 text-white" : "text-slate-600"}`}>
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${complete ? "bg-emerald-600 text-white" : active ? "bg-white text-slate-950" : "bg-slate-100 text-slate-500"}`}>{complete ? <Check className="h-3.5 w-3.5" /> : number}</span>
        <span className="truncate text-xs font-semibold sm:text-sm">{label}</span>
      </li>;
    })}
  </ol>;
}

function StatusPill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "emerald" | "amber" | "sky" }) {
  const classes = tone === "emerald" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-900" : tone === "sky" ? "border-sky-200 bg-sky-50 text-sky-800" : "border-slate-200 bg-slate-50 text-slate-700";
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${classes}`}>{children}</span>;
}

export function LocateCheapItemPreview({ enabled }: { enabled: boolean }) {
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const disabled = !enabled;

  function copyList() {
    void navigator.clipboard?.writeText(exampleItems.map((item) => `${item.quantity} × ${item.item}`).join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return <main className="min-h-screen bg-[#f3f6f9] px-3 py-4 text-slate-950 sm:px-5 lg:px-7">
    <div className="mx-auto max-w-[1480px]">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-300 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#0066cc]">Manager · AI Tools</p><StatusPill tone="amber">Coming Soon</StatusPill></div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Locate Cheap Item</h1>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600 sm:text-sm">Source-backed supplier research and pricing review. AI prepares; a manager verifies every item, source, contact, and message.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm"><LockKeyhole className="h-4 w-4 text-emerald-700" /><span><strong className="text-slate-900">Preview safe</strong><br />No supplier email or order</span></div>
      </header>

      <div className="mt-4"><Progress current={step} /></div>

      {!enabled ? <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-950"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>Review mode.</strong> The production feature flag is off. You can inspect the complete flow and examples; live research, saving, and email remain locked until approval and end-to-end testing.</p></div> : null}

      <section className="mt-4 grid gap-3 xl:grid-cols-[minmax(260px,.72fr)_minmax(0,2.1fr)]">
        <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-[#0066cc]" /><h2 className="text-sm font-bold">1 · Enter website</h2></div>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-[11px] font-bold text-slate-700">Website URL<input type="url" defaultValue="https://www.example-electrical-supply.com" disabled={disabled} className="h-10 rounded-md border border-slate-300 px-3 text-sm disabled:bg-slate-50 disabled:text-slate-500" /></label>
            <div className="grid grid-cols-2 gap-2"><label className="grid gap-1 text-[11px] font-bold text-slate-700">ZIP code<input defaultValue="11516" disabled={disabled} inputMode="numeric" className="h-10 rounded-md border border-slate-300 px-3 text-sm disabled:bg-slate-50" /></label><label className="grid gap-1 text-[11px] font-bold text-slate-700">Project<select disabled={disabled} defaultValue="New house construction" className="h-10 rounded-md border border-slate-300 bg-white px-2 text-xs disabled:bg-slate-50"><option>New house construction</option><option>Renovation</option><option>Addition</option><option>Commercial construction</option><option>Custom</option></select></label></div>
            <label className="grid gap-1 text-[11px] font-bold text-slate-700">Notes<textarea disabled={disabled} placeholder="Brands, specifications, delivery needs…" className="min-h-20 resize-y rounded-md border border-slate-300 p-3 text-sm disabled:bg-slate-50" /></label>
            <button type="button" disabled={disabled} onClick={() => setStep(2)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#0071e3] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"><Search className="h-4 w-4" />Analyze website</button>
          </div>
          <div className="mt-4 border-t border-slate-200 pt-3 text-[11px] leading-5 text-slate-500"><ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-emerald-700" />Public pages only. No login, CAPTCHA, paywall, security bypass, or automatic ordering.</div>
        </aside>

        <div className="min-w-0 space-y-3">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#0066cc]">Example category analysis</p><h2 className="text-sm font-bold">Electrical supply · Ground-up residential</h2></div><div className="flex gap-1.5"><StatusPill tone="emerald">Public source</StatusPill><StatusPill tone="sky">Checked Aug 27, 2026</StatusPill></div></div>
            <dl className="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-4"><div className="bg-white p-3"><dt className="text-[10px] font-bold uppercase text-slate-500">Company type</dt><dd className="mt-1 text-xs font-semibold">Electrical distributor</dd></div><div className="bg-white p-3"><dt className="text-[10px] font-bold uppercase text-slate-500">Service area</dt><dd className="mt-1 text-xs font-semibold">NY metro · verify delivery</dd></div><div className="bg-white p-3"><dt className="text-[10px] font-bold uppercase text-slate-500">Categories found</dt><dd className="mt-1 text-xs font-semibold">Panels, devices, wire, boxes</dd></div><div className="bg-white p-3"><dt className="text-[10px] font-bold uppercase text-slate-500">Pricing</dt><dd className="mt-1 text-xs font-semibold">Public + quote-required</dd></div></dl>
            <div className="flex flex-wrap gap-1.5 px-4 py-3">{["Breakers", "Outlets", "Wire & cable", "Electrical boxes", "Switches", "Conduit", "Smoke / CO", "Grounding"].map((value) => <StatusPill key={value}>{value}</StatusPill>)}</div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#0066cc]">2 · Items & prices</p><h2 className="text-sm font-bold">Review every comparison</h2></div><div className="flex gap-2"><button type="button" onClick={copyList} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-xs font-bold"><Copy className="h-3.5 w-3.5" />{copied ? "Copied" : "Copy list"}</button><button type="button" disabled className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-bold text-slate-400"><FileDown className="h-3.5 w-3.5" />Download</button></div></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="w-10 px-3 py-2">Use</th><th className="px-3 py-2">Item</th><th className="px-3 py-2">Construction use</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Website</th><th className="px-3 py-2">Lowest verified</th><th className="px-3 py-2">Difference</th><th className="px-3 py-2">Match</th><th className="px-3 py-2">Source</th></tr></thead><tbody>{exampleItems.map((item) => <tr key={item.item} className="border-t border-slate-100 align-top"><td className="px-3 py-3"><input type="checkbox" defaultChecked={item.selected} disabled={disabled} aria-label={`Select ${item.item}`} /></td><td className="max-w-64 px-3 py-3 font-bold">{item.item}</td><td className="px-3 py-3 text-slate-600">{item.use}</td><td className="px-3 py-3">{item.quantity}</td><td className="px-3 py-3">{item.sitePrice}</td><td className="px-3 py-3 font-bold">{item.lowPrice}<span className="mt-1 block text-[10px] font-normal text-slate-500">Price + package verified</span></td><td className="px-3 py-3">{item.difference}</td><td className="px-3 py-3"><StatusPill tone={item.tone as "emerald" | "amber"}>{item.match}</StatusPill>{item.match === "Comparable" ? <span className="mt-1 block max-w-40 text-[10px] leading-4 text-slate-500">Different breaker compatibility; never treated as exact.</span> : null}</td><td className="px-3 py-3"><span className="font-semibold">{item.source}</span><button type="button" disabled className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[#0066cc] disabled:text-slate-400">Open source <ArrowUpRight className="h-3 w-3" /></button></td></tr>)}</tbody></table></div>
          </section>

          <section className="grid gap-3 lg:grid-cols-[.85fr_1.15fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#0066cc]">Verified contact example</p><h2 className="text-sm font-bold">Supplier sales desk</h2></div><StatusPill tone="emerald">Source verified</StatusPill></div><dl className="mt-3 grid gap-2 text-xs"><div><dt className="text-slate-500">Contact type</dt><dd className="font-semibold">Official quote-request form</dd></div><div><dt className="text-slate-500">Source</dt><dd className="font-semibold text-[#0066cc]">Official company contact page</dd></div><div><dt className="text-slate-500">Email</dt><dd className="font-semibold">Not publicly listed — no address guessed</dd></div></dl></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#0066cc]">3 · Test email preview</p><h2 className="text-sm font-bold">TEST — DO NOT PROCESS</h2></div><Mail className="h-4 w-4 text-[#0066cc]" /></div><div className="mt-3 grid gap-1.5 rounded-lg bg-slate-50 p-3 text-xs"><p><span className="text-slate-500">To:</span> <strong>office@build.avantiap.com only</strong></p><p><span className="text-slate-500">Subject:</span> <strong>TEST — Construction Material Pricing Request — Electrical</strong></p><p className="mt-1 leading-5 text-slate-600">Avantia Build is requesting pricing and availability for the reviewed material list, including unit price, quantity, model, lead time, delivery cost, payment terms, discounts, and quote expiration.</p></div><div className="mt-3 flex flex-wrap justify-end gap-2"><button type="button" disabled className="h-9 rounded-md border border-slate-300 px-3 text-xs font-bold text-slate-400">Edit draft</button><button type="button" disabled className="h-9 rounded-md bg-slate-300 px-3 text-xs font-bold text-white">Send test</button></div></div>
          </section>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /><div><h2 className="text-sm font-bold text-emerald-950">Safety and approval flow</h2><p className="mt-1 text-xs leading-5 text-emerald-900">Public research → source and date recorded → exact/comparable review → manager edits → office-only test → owner confirms recipients and message → suppliers sent separately → delivery and reply logged. Duplicate sends are blocked. No analysis action sends email or places an order.</p></div></div></section>

      <div className="mt-4 flex flex-wrap justify-between gap-2"><button type="button" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="h-10 rounded-md border border-slate-300 bg-white px-4 text-xs font-bold disabled:opacity-40">Back</button><button type="button" onClick={() => setStep(Math.min(3, step + 1))} disabled={step === 3} className="h-10 rounded-md bg-slate-950 px-4 text-xs font-bold text-white disabled:opacity-40">Preview next step</button></div>
    </div>
  </main>;
}
