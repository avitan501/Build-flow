import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ClipboardList, Clock3, FileUp, MessageCircle, PackageCheck, PackageSearch } from "lucide-react";

import { RecoveryLinkHandler } from "@/components/auth/recovery-link-handler";
import { ShopBrandShowcase } from "@/components/buildflow/shop-brand-showcase";
import { SHOP_TOOL_CATEGORIES } from "@/lib/shop-tools";

const orderSteps = [
  {
    eyebrow: "Step 1",
    title: "Upload Your Plan",
    body: "Send a blueprint, material list, or photo.",
    icon: PackageSearch,
  },
  {
    eyebrow: "Step 2",
    title: "AI Builds the Takeoff",
    body: "AI extracts the materials. Our team checks every quantity.",
    icon: ClipboardList,
  },
  {
    eyebrow: "Step 3",
    title: "Approve Your Order",
    body: "You approve the list and pricing. We place the order and arrange delivery.",
    icon: PackageCheck,
  },
];

const HOME_DEPARTMENT_SLUGS = [
  "framing",
  "electrical",
  "tile-work",
  "sheet-rock",
  "door-and-molding",
  "wood-floor",
  "siding",
  "roofing",
  "window",
] as const;

const HOME_DEPARTMENT_LABELS: Partial<Record<(typeof HOME_DEPARTMENT_SLUGS)[number], string>> = {
  "tile-work": "Tile",
  "sheet-rock": "Drywall",
  "door-and-molding": "Doors & Molding",
  "wood-floor": "Flooring",
  window: "Windows",
};

const homeDepartments = HOME_DEPARTMENT_SLUGS.map((slug) => {
  const department = SHOP_TOOL_CATEGORIES.find((category) => category.slug === slug);
  if (!department) throw new Error(`Missing homepage department: ${slug}`);
  return { ...department, label: HOME_DEPARTMENT_LABELS[slug] ?? department.label };
});

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
          <Image
            src="/images/buildflow-retail/avantia-jobsite-material-delivery-v2.webp"
            alt=""
            fill
            priority
            sizes="(min-width: 1440px) 1408px, 100vw"
            className="-z-20 object-cover object-[62%_center] sm:object-center"
          />
          <div className="absolute inset-0 -z-10 bg-[#071126]/62 sm:bg-[linear-gradient(90deg,rgba(7,17,38,0.84)_0%,rgba(7,17,38,0.64)_48%,rgba(7,17,38,0.28)_100%)]" aria-hidden="true" />
          <div className="mx-auto flex min-h-[26rem] max-w-6xl flex-col justify-end px-6 py-7 sm:min-h-[30rem] sm:px-9 sm:py-9 lg:px-10">
            <div className="page-enter-motion">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">Material ordering made easy</p>
            <h1 className="mt-2 max-w-4xl text-[2.5rem] font-semibold leading-[1.03] text-balance sm:text-6xl">
              Get Materials Priced and Delivered.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-6 text-slate-100 sm:text-xl sm:leading-8">
              Upload a plan or list. AI prepares the material takeoff, our team verifies it, and you approve before we order.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/request-quote" className="group inline-flex min-h-14 items-center justify-between gap-4 rounded-lg bg-white px-3 py-2.5 text-sm font-bold text-[#071126] shadow-[0_14px_34px_rgba(0,0,0,0.24)] transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40 sm:min-w-64">
                <span className="inline-flex items-center gap-3"><span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#e8f3ff] text-[#0071e3]"><FileUp className="h-5 w-5" aria-hidden="true" /></span>Upload Plan or List</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="#departments" className="group inline-flex min-h-14 items-center justify-between gap-4 rounded-lg border border-white/45 bg-white/10 px-3 py-2.5 text-sm font-bold text-white shadow-[0_14px_34px_rgba(0,0,0,0.16)] backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 sm:min-w-64">
                <span className="inline-flex items-center gap-3"><span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/15"><PackageSearch className="h-5 w-5" aria-hidden="true" /></span>Choose Materials</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-semibold">
              <span className="inline-flex min-h-8 items-center gap-2 text-slate-100"><Check className="h-4 w-4 text-emerald-300" aria-hidden="true" />No account needed</span>
              <span className="inline-flex min-h-8 items-center gap-2 text-slate-100"><Clock3 className="h-4 w-4 text-sky-200" aria-hidden="true" />Reply within 24 hours</span>
              <a href="https://wa.me/19292077156?text=Hi%20Avantia%20Build%2C%20I%20need%20help%20starting%20a%20material%20order." target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-md text-emerald-100 underline decoration-emerald-200/50 underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Need help? WhatsApp us
              </a>
            </div>
            </div>
          </div>
        </section>
      </div>

      <div className="px-3 py-2 sm:px-5 sm:py-3">
        <div data-testid="homepage-island" className="mx-auto max-w-[88rem] overflow-hidden">
          <ShopBrandShowcase compact transparent />
        </div>
      </div>

      <section id="departments" className="scroll-mt-24 border-y border-slate-200 bg-white px-3 py-7 sm:px-5 sm:py-9" aria-labelledby="departments-heading">
        <div data-testid="homepage-island" className="mx-auto max-w-[88rem]">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <h2 id="departments-heading" className="text-2xl font-semibold text-balance text-[#071126] sm:text-3xl">Choose Materials</h2>
            <p className="max-w-lg text-sm leading-6 text-slate-600">Tap what you need. Answer a few quick questions.</p>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-5 sm:gap-x-5 lg:grid-cols-9">
            {homeDepartments.map((department) => (
              <Link key={department.slug} href={`/shop/${department.slug}`} aria-label={department.label} className="group flex min-w-0 flex-col items-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-4">
                <span className="relative aspect-square w-full max-w-28 overflow-hidden rounded-lg bg-[#f5f7fa] transition-colors group-hover:bg-slate-200/70">
                  <Image src={department.imageUrl} alt={department.imageAlt} fill sizes="(max-width: 639px) 30vw, (max-width: 1023px) 18vw, 10vw" className="object-contain p-1 mix-blend-multiply" />
                </span>
                <span className="mt-2 block min-w-0 text-[13px] font-semibold leading-4 text-[#071126] sm:text-sm">{department.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-3 py-6 sm:px-5 sm:py-8" aria-labelledby="how-it-works-heading">
        <div data-testid="homepage-island" className="mx-auto max-w-[88rem]">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0066cc]">How it works</p>
            <h2 id="how-it-works-heading" className="mt-1 text-2xl font-semibold text-balance text-[#071126]">Three simple steps</h2>
          </div>
          <div className="grid overflow-hidden rounded-[20px] border border-slate-200 bg-white md:grid-cols-3">
            {orderSteps.map((point) => {
              const Icon = point.icon;
              return (
                <article key={point.title} className="grid grid-cols-[2.75rem_1fr] gap-3 border-b border-slate-200 px-5 py-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-sky-50 text-[#0066cc]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0066cc]">{point.eyebrow}</p>
                    <h3 className="mt-1 text-base font-bold text-[#071126]">{point.title}</h3>
                    <p className="mt-1 text-sm leading-5 text-slate-600">{point.body}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-5 px-3 sm:px-5" aria-labelledby="coverage-heading">
        <div data-testid="homepage-island" className="mx-auto grid max-w-[88rem] items-center gap-3 overflow-hidden rounded-[22px] border border-slate-200/70 bg-white px-5 py-5 shadow-[0_12px_36px_rgba(15,23,42,0.06)] sm:px-7 sm:py-6 lg:grid-cols-[minmax(14rem,0.8fr)_minmax(0,1fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0066cc]">Across the U.S.</p>
            <h2 id="coverage-heading" className="mt-1.5 text-xl font-semibold leading-tight text-[#071126] sm:text-2xl">Serving 41 states.</h2>
            <p className="mt-2 max-w-md text-sm leading-5 text-slate-600">Tell us the job location. We find options nearby.</p>
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
