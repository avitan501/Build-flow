import Image from "next/image";

import { RecoveryLinkHandler } from "@/components/auth/recovery-link-handler";
import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup";
import { ShopBrandShowcase } from "@/components/buildflow/shop-brand-showcase";

const conciergePoints = [
  {
    title: "Better pricing",
    summary: "We compare supplier prices before you order.",
    body: "Material prices change often. We check current options when you are ready to buy.",
  },
  {
    title: "Product guidance",
    summary: "We ask the right questions before pricing.",
    body: "Clear specifications help you receive the correct material without paying for unnecessary extras.",
  },
  {
    title: "Surplus savings",
    summary: "We search closeouts and liquidation inventory.",
    body: "When suitable inventory is available, we help you use it to lower your material cost.",
  },
  {
    title: "Bulk purchasing",
    summary: "Larger orders can unlock better pricing.",
    body: "We combine buying opportunities and reserve pricing when volume makes it worthwhile.",
  },
  {
    title: "Smarter alternatives",
    summary: "We suggest lower-cost products that still fit.",
    body: "When the original request is expensive, we look for practical substitutes that meet the project need.",
  },
  {
    title: "Specialty sourcing",
    summary: "We help locate uncommon construction products.",
    body: "Tell us the brand, size, finish, or specification and we will search beyond the usual local options.",
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
    <main className="min-h-screen overflow-x-clip bg-white text-slate-950">
      <RecoveryLinkHandler />

      <section className="relative isolate overflow-hidden border-b border-slate-200 bg-[#071126] text-white">
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/buildflow-retail/hero.jpg)" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 -z-10 bg-[#071126]/80" aria-hidden="true" />
        <div className="mx-auto flex min-h-[23rem] max-w-6xl flex-col justify-end px-5 py-10 sm:min-h-[28rem] sm:px-8 sm:py-14 lg:px-10">
          <AvantiaBuildLockup tone="light" />
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
            Concierge service for every construction need.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
            We source materials, compare options, and simplify every order.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
        <div className="grid border-t border-slate-200 md:grid-cols-2">
          {conciergePoints.map((point, index) => (
            <details
              key={point.title}
              className={`group border-b border-slate-200 md:px-7 ${index % 2 === 0 ? "md:border-r md:pl-0" : "md:pr-0"}`}
            >
              <summary className="flex min-h-28 cursor-pointer list-none items-center justify-between gap-4 py-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0066cc] [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-start gap-4">
                  <span className="pt-0.5 text-xs font-semibold text-[#0066cc]">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="block text-lg font-semibold text-[#071126] sm:text-xl">{point.title}</span>
                    <span className="mt-1 block text-sm leading-5 text-slate-600">{point.summary}</span>
                  </span>
                </span>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xl font-light text-slate-600 transition group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="pb-5 pl-10 pr-12 text-sm leading-6 text-slate-600 sm:text-base">{point.body}</p>
            </details>
          ))}
        </div>

        <p className="py-10 text-center text-base font-semibold text-[#071126] sm:text-lg">
          Sourcing support for contractors, developers, design professionals, and property owners.
        </p>
      </section>

      <section className="border-y border-slate-200 bg-[#f5f7fa]" aria-labelledby="coverage-heading">
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[minmax(16rem,0.65fr)_minmax(0,1.35fr)] lg:px-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0066cc]">Nationwide sourcing</p>
            <h2 id="coverage-heading" className="mt-2 text-3xl font-semibold leading-tight text-[#071126] sm:text-4xl">Covering 41 states.</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-600 sm:text-base">Local projects or out-of-state jobs, we help source construction materials where your work takes you.</p>
          </div>
          <div className="relative aspect-[16/9] overflow-hidden" data-testid="coverage-map">
            <Image src="/images/buildflow-retail/us-coverage-map.webp" alt="Map showing Avantia Build coverage across the United States" fill sizes="(min-width: 1024px) 58vw, 100vw" className="object-contain" />
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

      <ShopBrandShowcase compact />
    </main>
  );
}
