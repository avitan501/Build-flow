import { RecoveryLinkHandler } from "@/components/auth/recovery-link-handler";

const conciergePoints = [
  {
    title: "Current market pricing",
    body: "Material and trade costs change with supply, demand, and world events. We compare the market when you are ready to buy.",
  },
  {
    title: "The right questions",
    body: "We clarify what you actually need, then compare knowledgeable service with lower-cost sources that may sell the same item.",
  },
  {
    title: "Liquidation opportunities",
    body: "We look for quality surplus, closeout, and liquidation inventory that can reduce the cost of your project.",
  },
  {
    title: "Bulk and reserved pricing",
    body: "When volume creates leverage, we can buy in bulk or reserve favorable pricing before costs move.",
  },
  {
    title: "Smarter alternatives",
    body: "Before you commit, we can adjust the order and recommend a more economical equivalent that still fits the job.",
  },
  {
    title: "Hard-to-find items",
    body: "For specific products that are not widely stocked, we search beyond the usual suppliers to find the right source.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-clip bg-white pb-28 text-slate-950 sm:pb-16">
      <RecoveryLinkHandler />

      <section className="relative isolate overflow-hidden border-b border-slate-200 bg-[#071126] text-white">
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/buildflow-retail/hero.jpg)" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 -z-10 bg-[#071126]/80" aria-hidden="true" />
        <div className="mx-auto flex min-h-[23rem] max-w-6xl flex-col justify-end px-5 py-10 sm:min-h-[28rem] sm:px-8 sm:py-14 lg:px-10">
          <p className="text-sm font-semibold text-sky-200">Avantia Build</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
            Concierge service for every construction need.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
            We compare, source, and simplify materials and trades so every project gets the right option at the right time.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
        <div className="grid border-t border-slate-200 md:grid-cols-2">
          {conciergePoints.map((point, index) => (
            <article
              key={point.title}
              className={`border-b border-slate-200 py-6 md:px-7 ${index % 2 === 0 ? "md:border-r md:pl-0" : "md:pr-0"}`}
            >
              <p className="text-sm font-semibold text-[#0066cc]">{String(index + 1).padStart(2, "0")}</p>
              <h2 className="mt-2 text-xl font-semibold text-[#071126]">{point.title}</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">{point.body}</p>
            </article>
          ))}
        </div>

        <p className="py-10 text-center text-lg font-semibold text-[#071126] sm:text-xl">
          Working with designers, homeowners, and builders.
        </p>
      </section>
    </main>
  );
}
