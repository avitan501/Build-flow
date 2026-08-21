import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { AbcSupplyPricing } from "@/components/buildflow/abc-supply-pricing";
import { requireAdminProfile } from "@/lib/auth";

export default async function ManagerAbcPricingPage() {
  await requireAdminProfile();

  return <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-8 lg:px-10 lg:py-9">
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/vendors" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#0066cc]"><ArrowLeft className="h-4 w-4" />Suppliers</Link>
      <header className="mt-3 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Manager · Suppliers</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">ABC Supply Private Pricing</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Account- and branch-specific material pricing through ABC&apos;s server connection.</p></div><span className="inline-flex w-fit items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"><ShieldCheck className="h-4 w-4" />Owner protected</span></header>
      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-semibold">Price a material</h2><p className="mt-1 text-sm leading-6 text-slate-500">Sandbox accounts remain in use until ABC attaches Avantia Build&apos;s production customer account.</p><div className="mt-5"><AbcSupplyPricing /></div></section>
    </div>
  </main>;
}
