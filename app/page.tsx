import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Clock3, FileUp, PackageSearch, PlayCircle, Sparkles, Truck } from "lucide-react";

import { RecoveryLinkHandler } from "@/components/auth/recovery-link-handler";
import { CoverageScrollSection } from "@/components/buildflow/coverage-scroll-section";
import { ShopBrandShowcase } from "@/components/buildflow/shop-brand-showcase";
import { WhatsAppIcon } from "@/components/buildflow/whatsapp-icon";
import { SHOP_TOOL_CATEGORIES } from "@/lib/shop-tools";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "Avantia Build | You Build. We Handle the Materials.",
  description: "Send your plans or material list. We compare suppliers, organize the order, and arrange jobsite delivery.",
  path: "/",
  openGraphTitle: "Avantia Build | Materials Priced & Delivered",
});

const orderSteps = [
  {
    title: "Upload",
    body: "Plan or list",
    icon: FileUp,
  },
  {
    title: "Takeoff",
    body: "AI prepares the list",
    icon: Sparkles,
  },
  {
    title: "Compare",
    body: "Price and availability",
    icon: PackageSearch,
  },
  {
    title: "Approve",
    body: "You review the order",
    icon: Check,
  },
  {
    title: "Deliver",
    body: "We arrange the jobsite",
    icon: Truck,
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
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">Your construction materials desk</p>
            <h1 className="mt-2 max-w-4xl text-[2.5rem] font-semibold leading-[1.03] text-balance sm:text-6xl">
              You Build. We Handle the Materials.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-6 text-slate-100 sm:text-xl sm:leading-8">
              Upload your plans or material list. We identify what you need, compare suppliers, organize the order, and coordinate delivery.
            </p>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-sky-100 sm:text-base">
              AI-assisted takeoffs. Verified by our team. Approved by you.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/shop" className="group inline-flex min-h-14 items-center justify-between gap-4 rounded-lg bg-white px-3 py-2.5 text-sm font-bold text-[#071126] shadow-[0_14px_34px_rgba(0,0,0,0.24)] transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40 sm:min-w-64">
                <span className="inline-flex items-center gap-3"><span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#e8f3ff] text-[#0071e3]"><PackageSearch className="h-5 w-5" aria-hidden="true" /></span>Start a Material Request</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/request-quote" className="group inline-flex min-h-14 items-center justify-between gap-4 rounded-lg border border-white/45 bg-white/10 px-3 py-2.5 text-sm font-bold text-white shadow-[0_14px_34px_rgba(0,0,0,0.16)] backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 sm:min-w-64">
                <span className="inline-flex items-center gap-3"><span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/15"><FileUp className="h-5 w-5" aria-hidden="true" /></span>Send Us Your Plans</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a href="#product-demo" className="group inline-flex min-h-14 items-center justify-between gap-4 rounded-lg border border-sky-200/45 bg-[#071126]/35 px-3 py-2.5 text-sm font-bold text-white shadow-[0_14px_34px_rgba(0,0,0,0.16)] backdrop-blur-sm transition-colors hover:bg-[#071126]/55 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 sm:min-w-56">
                <span className="inline-flex items-center gap-3"><span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-sky-300/15 text-sky-100"><PlayCircle className="h-5 w-5" aria-hidden="true" /></span>Watch the demo</span>
                <span className="text-xs font-semibold text-sky-100">20 sec</span>
              </a>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-semibold">
              <span className="inline-flex min-h-8 items-center gap-2 text-slate-100"><Check className="h-4 w-4 text-emerald-300" aria-hidden="true" />No account needed</span>
              <span className="inline-flex min-h-8 items-center gap-2 text-slate-100"><Clock3 className="h-4 w-4 text-sky-200" aria-hidden="true" />Reply within 24 hours</span>
              <a href="https://wa.me/15169088319?text=Hi%20Avantia%20Build%2C%20I%20need%20help%20starting%20a%20material%20order." target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-md text-emerald-100 underline decoration-emerald-200/50 underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                <WhatsAppIcon className="h-4 w-4" />
                Need help? WhatsApp us
              </a>
            </div>
            </div>
          </div>
        </section>
      </div>

      <section className="px-3 py-4 sm:px-5 sm:py-5" aria-labelledby="how-it-works-heading">
        <div data-testid="homepage-island" className="mx-auto max-w-[88rem]">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0066cc]">How it works</p>
              <h2 id="how-it-works-heading" className="mt-1 text-xl font-semibold text-balance text-[#071126] sm:text-2xl">From plan to jobsite</h2>
            </div>
            <p className="hidden text-sm text-slate-500 sm:block">Five clear steps. You approve before we order.</p>
          </div>
          <ol className="grid grid-cols-5 overflow-hidden rounded-[18px] border border-slate-200 bg-slate-200">
            {orderSteps.map((point) => {
              const Icon = point.icon;
              return (
                <li key={point.title} className="grid min-h-[6.25rem] min-w-0 content-start justify-items-center gap-1 bg-white px-1 py-3 text-center sm:min-h-[7.5rem] sm:justify-items-start sm:gap-1.5 sm:px-4 sm:py-4 sm:text-left">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-[#0066cc]"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <h3 className="text-[11px] font-bold leading-4 text-[#071126] sm:mt-1 sm:text-sm">{point.title}</h3>
                    <p className="hidden text-xs leading-5 text-slate-600 sm:block">{point.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

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

      <section id="product-demo" className="scroll-mt-24 px-3 py-4 sm:px-5 sm:py-6" aria-labelledby="product-demo-heading">
        <div data-testid="homepage-demo" className="mx-auto grid max-w-[88rem] overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_20px_54px_rgba(7,17,38,0.09)] lg:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.7fr)]">
          <div className="bg-[#071126] p-2.5 sm:p-4">
            <video
              className="aspect-video w-full rounded-[18px] bg-[#071126] object-cover shadow-[0_16px_42px_rgba(0,0,0,0.28)]"
              controls
              playsInline
              preload="metadata"
              poster="/videos/avantia-materials-demo-phone-poster.png"
              aria-label="Avantia Build material request walkthrough on an iPhone"
            >
              <source src="/videos/avantia-materials-demo-phone.mp4" type="video/mp4" />
              <source src="/videos/avantia-materials-demo-phone.webm" type="video/webm" />
              <track src="/videos/avantia-materials-demo-phone.vtt" kind="captions" srcLang="en" label="English" />
              Your browser does not support the video player. You can still <a href="/videos/avantia-materials-demo-phone.mp4">open the Avantia Build phone demo video</a>.
            </video>
          </div>
          <div className="flex flex-col justify-center px-6 py-8 sm:px-9 sm:py-10 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0066cc]">Under 20 seconds</p>
            <h2 id="product-demo-heading" className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.035em] text-balance text-[#071126] sm:text-4xl">See how fast ordering can be.</h2>
            <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">Choose the material, add the quantity and delivery notes, then review the complete request in one place.</p>
            <ul className="mt-6 grid gap-3 text-sm font-semibold text-[#071126]">
              {["Choose size and quantity", "Add delivery notes", "Review the complete order", "Confirm when everything looks right"].map((point) => (
                <li key={point} className="flex items-center gap-3"><span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Check className="h-3.5 w-3.5" aria-hidden="true" /></span>{point}</li>
              ))}
            </ul>
            <Link href="/shop" className="mt-7 inline-flex min-h-12 items-center justify-between gap-4 rounded-lg bg-[#0071e3] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(0,113,227,0.22)] transition-colors hover:bg-[#0066cc] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200">
              Start your request
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <CoverageScrollSection />
    </main>
  );
}
