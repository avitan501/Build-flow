import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ClipboardList, MessageCircle, PackageCheck, PackageSearch, PhoneOff } from "lucide-react";

import { RecoveryLinkHandler } from "@/components/auth/recovery-link-handler";
import { ShopBrandShowcase } from "@/components/buildflow/shop-brand-showcase";

const contractorBenefits = [
  {
    title: "Send One List",
    body: "We handle supplier calls, availability, substitutions, and follow-up.",
    icon: PhoneOff,
  },
  {
    title: "Compare Before You Buy",
    body: "We compare products, pricing, availability, and delivery options.",
    icon: PackageSearch,
  },
  {
    title: "Keep Every Project Organized",
    body: "Requests, quotes, invoices, attachments, and updates stay together.",
    icon: ClipboardList,
  },
];

const coverageDots = [
  [15, 14], [14, 23], [13, 38], [15, 51], [17, 57], [21, 47], [24, 55], [27, 39], [24, 29], [36, 44],
  [32, 57], [45, 66], [46, 75], [42, 72], [42, 55], [48, 47], [47, 39], [54, 28], [61, 38], [56, 49],
  [52, 75], [57, 60], [64, 56], [70, 64], [80, 84], [75, 75], [76, 56], [80, 53], [82, 48], [84, 43],
  [85, 40], [87, 35], [89, 30], [91, 23], [80, 29], [79, 38], [68, 34], [73, 36], [66, 44], [62, 31], [93, 17],
] as const;

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-clip bg-[#f5f7fa] pb-4 text-slate-950">
      <RecoveryLinkHandler />

      <div className="px-3 pt-3 sm:px-5 sm:pt-5">
        <section data-testid="homepage-island" className="relative isolate mx-auto max-w-[88rem] overflow-hidden rounded-[30px] bg-[#071126] text-white shadow-[0_22px_64px_rgba(7,17,38,0.22)] sm:rounded-[36px]">
          <div
            className="absolute inset-0 -z-20 bg-cover bg-center"
            style={{ backgroundImage: "url(/images/buildflow-retail/hero.jpg)" }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 -z-10 bg-[#071126]/60" aria-hidden="true" />
          <div className="mx-auto flex min-h-[24rem] max-w-6xl flex-col justify-end px-6 py-7 sm:min-h-[27rem] sm:px-9 sm:py-9 lg:px-10">
            <h1 className="max-w-4xl text-4xl font-semibold leading-[1.08] sm:text-6xl">
              Keep Your Crew Building. We’ll Handle the Materials.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-100 sm:text-xl sm:leading-8">
              Send us what you need once. Your Avantia Build coordinator sources options, places orders, coordinates deliveries, and keeps everything organized by project.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/shop" className="group inline-flex min-h-14 items-center justify-between gap-4 rounded-lg bg-white px-3 py-2.5 text-sm font-bold text-[#071126] shadow-[0_14px_34px_rgba(0,0,0,0.24)] transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40 sm:min-w-64">
                <span className="inline-flex items-center gap-3"><span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#e8f3ff] text-[#0071e3]"><PackageCheck className="h-5 w-5" aria-hidden="true" /></span>Start a Material Order</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <a href="https://wa.me/19292077156?text=Hi%20Avantia%20Build%2C%20I%20want%20to%20start%20a%20material%20order." target="_blank" rel="noreferrer" className="group inline-flex min-h-14 items-center justify-between gap-4 rounded-lg border border-white/25 bg-[#128c7e] px-3 py-2.5 text-sm font-bold text-white shadow-[0_14px_34px_rgba(0,0,0,0.2)] transition hover:bg-[#0f7a6e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 sm:min-w-64">
                <span className="inline-flex items-center gap-3"><span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/15"><MessageCircle className="h-5 w-5" aria-hidden="true" /></span>Message a Materials Coordinator</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </div>

      <div className="px-3 pt-3 sm:px-5 sm:pt-5">
        <div data-testid="homepage-island" className="mx-auto max-w-[88rem] overflow-hidden">
          <ShopBrandShowcase compact transparent />
        </div>
      </div>

      <section className="px-3 py-7 sm:px-5 sm:py-9">
        <div data-testid="homepage-island" className="mx-auto grid max-w-[88rem] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)] md:grid-cols-3">
          {contractorBenefits.map((point) => {
            const Icon = point.icon;
            return (
              <article key={point.title} className="border-b border-slate-200 px-5 py-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 sm:px-7">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-sky-50 text-[#0066cc]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <h3 className="mt-5 text-lg font-bold text-[#071126]">{point.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{point.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-5 px-3 sm:px-5" aria-labelledby="coverage-heading">
        <div data-testid="homepage-island" className="mx-auto grid max-w-[88rem] items-center gap-3 overflow-hidden rounded-[22px] border border-slate-200/70 bg-white px-5 py-5 shadow-[0_12px_36px_rgba(15,23,42,0.06)] sm:px-7 sm:py-6 lg:grid-cols-[minmax(14rem,0.8fr)_minmax(0,1fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0066cc]">Nationwide sourcing</p>
            <h2 id="coverage-heading" className="mt-1.5 text-xl font-semibold leading-tight text-[#071126] sm:text-2xl">Covering 41 states.</h2>
            <p className="mt-2 max-w-md text-sm leading-5 text-slate-600">Local or out of state, we source materials where your work takes you.</p>
          </div>
          <div className="relative mx-auto aspect-[16/9] w-full max-w-xs overflow-hidden sm:max-w-sm" data-testid="coverage-map">
            <Image src="/images/buildflow-retail/us-coverage-map.webp" alt="Map showing Avantia Build coverage across the United States" fill sizes="(min-width: 640px) 24rem, 100vw" className="object-contain" />
            {coverageDots.map(([left, top]) => (
              <span
                key={`${left}-${top}`}
                className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-[#0071e3] shadow-[0_0_0_2px_rgba(0,113,227,0.16)] sm:h-2.5 sm:w-2.5"
                style={{ left: `${left}%`, top: `${top}%` }}
                data-testid="coverage-dot"
                aria-hidden="true"
              />
            ))}
            <span className="sr-only">{coverageDots.length} coverage locations shown.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
