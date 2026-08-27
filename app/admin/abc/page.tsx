import { ArrowLeft, CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { AbcSupplyPricing } from "@/components/buildflow/abc-supply-pricing";
import { requireAdminProfile } from "@/lib/auth";

export default async function ManagerAbcPricingPage() {
  await requireAdminProfile();

  const demoSteps = [
    { href: "/account/abc", label: "Customer connection", external: true },
    { href: "#ship-to", label: "Ship-To" },
    { href: "#branch", label: "Authorized branch" },
    { href: "#product-search", label: "Product search" },
    { href: "#unit-quantity", label: "Unit & quantity" },
    { href: "#availability-price", label: "Availability & price" },
    { href: "#demo-notes", label: "Demo script" },
  ];

  return <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-8 lg:px-10 lg:py-9">
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/goals-progress#abc-supply-demo" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#0066cc]"><ArrowLeft className="h-4 w-4" />ABC task</Link>
      <header className="mt-3 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Manager · ABC certification</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">ABC Supply demo</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Customer-authorized product search and private ABC pricing.</p></div><div className="flex flex-wrap gap-2"><span className="inline-flex w-fit items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800"><CheckCircle2 className="h-4 w-4" />Review · Sep 3, 2:30 PM ET</span><span className="inline-flex w-fit items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"><ShieldCheck className="h-4 w-4" />Owner protected</span></div></header>

      <nav aria-label="ABC demo menu" className="sticky top-2 z-20 mt-5 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <p className="px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Demo menu</p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {demoSteps.map((step, index) => step.external ? <Link key={step.href} href={step.href} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-sky-300 hover:text-[#0066cc]">{index + 1}. {step.label}<ExternalLink className="h-3 w-3" /></Link> : <a key={step.href} href={step.href} className="inline-flex min-h-9 shrink-0 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-sky-300 hover:text-[#0066cc]">{index + 1}. {step.label}</a>)}
        </div>
      </nav>

      <section className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center">
        <div><h2 className="text-lg font-semibold">Certification position</h2><p className="mt-1 text-sm leading-6 text-slate-600">AvantiaBuild lets an ABC customer connect myABCsupply, select that customer&apos;s Ship-To and authorized branch, then search, choose a valid unit and quantity, verify availability, and request the customer-specific price. ABC Supply remains the seller.</p></div>
        <Link href="/account/abc" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">Open customer flow<ExternalLink className="h-4 w-4" /></Link>
      </section>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">ABC Supply sandbox</h2><p className="mt-1 text-sm text-slate-500">Source System ID 798 · certification test data</p></div><span className="rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">Not production pricing</span></div><div className="mt-5"><AbcSupplyPricing /></div></section>

      <section id="demo-notes" className="mt-5 scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">Demo script</h2>
        <ol className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <li className="rounded-md bg-slate-50 p-3"><strong className="text-slate-950">1. Customer</strong><span className="mt-1 block">“The ABC customer signs in and authorizes AvantiaBuild.”</span></li>
          <li className="rounded-md bg-slate-50 p-3"><strong className="text-slate-950">2. Account</strong><span className="mt-1 block">“We load only the customer&apos;s Ship-To accounts and branches.”</span></li>
          <li className="rounded-md bg-slate-50 p-3"><strong className="text-slate-950">3. Product</strong><span className="mt-1 block">“Search is limited to the selected authorized branch.”</span></li>
          <li className="rounded-md bg-slate-50 p-3"><strong className="text-slate-950">4. Price</strong><span className="mt-1 block">“We send item, unit, quantity, branch, and Ship-To for the private price.”</span></li>
          <li className="rounded-md bg-slate-50 p-3"><strong className="text-slate-950">5. Availability</strong><span className="mt-1 block">“Available means the branch offers the item; it is not a stock count.”</span></li>
          <li className="rounded-md bg-slate-50 p-3"><strong className="text-slate-950">6. Support</strong><span className="mt-1 block">“We show clear ABC errors and do not display guessed prices.”</span></li>
        </ol>
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>ABC-controlled setup:</strong> Complete Customer connection before the review; TPA private pricing requires that customer&apos;s OAuth token. If ABC&apos;s Sandbox sign-in says the page timed out, API Support must confirm the test-user assignment. Sandbox accounts and authorized branches also come from ABC, so AvantiaBuild cannot add a New York branch locally. API ordering is not presented in this demo, so no Sandbox order is submitted.</div>
      </section>
    </div>
  </main>;
}
