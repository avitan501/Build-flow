import { ArrowLeft, Check, Phone } from "lucide-react";
import Link from "next/link";

import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup";
import { CampaignFlyerActions } from "@/components/buildflow/campaign-flyer-actions";
import { requireAdminProfile } from "@/lib/auth";

export default async function BeatYourQuoteFlyerPage() {
  await requireAdminProfile();

  return (
    <main className="min-h-screen bg-[#eef1f5] px-4 py-6 text-slate-950 print:bg-white print:p-0 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/admin/goals-progress" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700"><ArrowLeft className="h-4 w-4" />Back to goals</Link>
          <CampaignFlyerActions />
        </div>

        <article className="overflow-hidden rounded-lg bg-white shadow-xl print:rounded-none print:shadow-none">
          <header className="flex items-center justify-between gap-5 border-b border-slate-200 px-6 py-5 sm:px-10">
            <AvantiaBuildLockup />
            <span className="text-right text-xs font-bold uppercase tracking-[0.14em] text-[#0066cc]">Construction materials</span>
          </header>
          <div className="grid gap-8 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0071e3]">Already have a supplier quote?</p>
              <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight sm:text-6xl">Let us try to beat your material quote.</h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">Send us the quote you already received. We compare the materials, quantities, pricing, and delivery terms.</p>
              <ul className="mt-7 grid gap-3 text-base font-semibold text-slate-800 sm:grid-cols-2">{["Same material list", "Clear price comparison", "Delivery terms reviewed", "No account needed"].map((item) => <li key={item} className="flex items-center gap-2"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-4 w-4" /></span>{item}</li>)}</ul>
            </div>
            <aside className="rounded-lg bg-[#071126] p-6 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-300">Start here</p>
              <p className="mt-3 break-words text-xl font-semibold">build.avantiap.com/beat-a-quote</p>
              <div className="my-5 h-px bg-white/20" />
              <a href="tel:+15169088319" className="flex items-center gap-2 text-lg font-semibold"><Phone className="h-5 w-5" />(516) 908-8319</a>
              <p className="mt-2 text-sm text-slate-300">Call or text for help.</p>
            </aside>
          </div>
          <footer className="bg-[#0071e3] px-6 py-5 text-center text-lg font-bold text-white sm:px-10">Upload your quote. We compare. You decide.</footer>
        </article>
      </div>
    </main>
  );
}
