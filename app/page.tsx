import { RecoveryLinkHandler } from "@/components/auth/recovery-link-handler";
import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup";
import { ShopBrandShowcase } from "@/components/buildflow/shop-brand-showcase";

const conciergePoints = [
  {
    title: "Market pricing",
    body: "We compare prices when you are ready to buy.",
  },
  {
    title: "Right questions",
    body: "We confirm exactly what your project needs.",
  },
  {
    title: "Closeout savings",
    body: "We find quality surplus and liquidation deals.",
  },
  {
    title: "Volume pricing",
    body: "We use buying power to secure better pricing.",
  },
  {
    title: "Better alternatives",
    body: "We suggest lower-cost options that still fit.",
  },
  {
    title: "Hard-to-find items",
    body: "We source products others cannot find.",
  },
];

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
          Working with designers, developers, and builders.
        </p>
      </section>

      <ShopBrandShowcase compact />
    </main>
  );
}
