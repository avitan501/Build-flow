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
    <main className="min-h-screen overflow-x-clip bg-[#f5f7fa] pb-4 text-slate-950">
      <RecoveryLinkHandler />

      <div className="px-3 pt-3 sm:px-5 sm:pt-5">
        <section className="relative isolate mx-auto max-w-[88rem] overflow-hidden rounded-[30px] bg-[#071126] text-white shadow-[0_24px_70px_rgba(7,17,38,0.24)] sm:rounded-[36px]">
          <div
            className="absolute inset-0 -z-20 bg-cover bg-center"
            style={{ backgroundImage: "url(/images/buildflow-retail/hero.jpg)" }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 -z-10 bg-[#071126]/76" aria-hidden="true" />
          <div className="mx-auto flex min-h-[19rem] max-w-6xl flex-col justify-end px-6 py-8 sm:min-h-[23rem] sm:px-9 sm:py-11 lg:px-10">
            <AvantiaBuildLockup tone="light" />
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">
              Concierge service for every construction need.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              Better sourcing, clearer choices, and one place for every request.
            </p>
          </div>
        </section>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-11 lg:px-10">
        <div className="mb-5 max-w-2xl sm:mb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0066cc]">How we help</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-[#071126] sm:text-3xl">A simpler way to source for a project.</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {conciergePoints.map((point, index) => (
            <details
              key={point.title}
              className="group overflow-hidden rounded-[22px] border border-white/80 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.1)]"
            >
              <summary className="flex min-h-24 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0066cc] [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-start gap-4">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-xs font-bold text-[#0066cc]">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="block text-base font-semibold text-[#071126] sm:text-lg">{point.title}</span>
                    <span className="mt-1 block text-sm leading-5 text-slate-600">{point.summary}</span>
                  </span>
                </span>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xl font-light text-slate-600 transition group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="border-t border-slate-100 px-5 py-4 text-sm leading-6 text-slate-600">{point.body}</p>
            </details>
          ))}
        </div>

        <p className="pt-7 text-center text-sm font-semibold text-[#071126] sm:text-base">
          Sourcing support for contractors, developers, design professionals, and property owners.
        </p>
      </section>

      <section className="px-3 sm:px-5" aria-labelledby="coverage-heading">
        <div className="mx-auto grid max-w-6xl items-center gap-5 overflow-hidden rounded-[28px] border border-white bg-white px-5 py-7 shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:px-8 sm:py-9 lg:grid-cols-[minmax(15rem,0.7fr)_minmax(0,1.1fr)] lg:px-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0066cc]">Nationwide sourcing</p>
            <h2 id="coverage-heading" className="mt-2 text-2xl font-semibold leading-tight text-[#071126] sm:text-3xl">Covering 41 states.</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-600 sm:text-base">Local projects or out-of-state jobs, we help source construction materials where your work takes you.</p>
          </div>
          <div className="relative mx-auto aspect-[16/9] w-full max-w-md overflow-hidden lg:max-w-xl" data-testid="coverage-map">
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

      <div className="mt-8 px-3 sm:mt-10 sm:px-5">
        <ShopBrandShowcase compact />
      </div>
    </main>
  );
}
