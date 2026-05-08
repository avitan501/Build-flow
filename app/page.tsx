import type { ReactNode } from "react";
import Link from "next/link";

import { RecoveryLinkHandler } from "@/components/auth/recovery-link-handler";
import { MobileHomeHeader } from "@/components/buildflow/mobile-home-header";
import { getSessionWithProfile } from "@/lib/auth";

const flowSteps = [
  {
    number: "1",
    title: "Create Project",
    text: "Tell us about your project and location",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 19h16" />
        <path d="M5 19V9l7-4 7 4v10" />
        <path d="M9 19v-5h6v5" />
      </svg>
    ),
  },
  {
    number: "2",
    title: "Upload Plans",
    text: "Upload drawings, photos, and docs",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 16V5" />
        <path d="m7 10 5-5 5 5" />
        <path d="M5 19h14" />
      </svg>
    ),
  },
  {
    number: "3",
    title: "Review Materials & Quote",
    text: "We find materials and get you quotes",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 7h12" />
        <path d="M6 12h12" />
        <path d="M6 17h8" />
      </svg>
    ),
  },
  {
    number: "4",
    title: "Approve Order",
    text: "Confirm and track your order in one place",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m9 12 2 2 4-4" />
        <circle cx="12" cy="12" r="8" />
      </svg>
    ),
  },
];

const featureCards = [
  {
    title: "Projects",
    description: "Organize all your projects and keep everything in one place.",
    hrefKey: "projects" as const,
    iconBg: "bg-[#295fc3]",
    image:
      "https://source.unsplash.com/featured/900x900/?lumber-yard,building-materials,usa",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 19h16" />
        <path d="M5 19V9l7-4 7 4v10" />
        <path d="M9 19v-5h6v5" />
      </svg>
    ),
  },
  {
    title: "Uploads",
    description: "Upload plans, photos, and documents securely.",
    hrefKey: "upload" as const,
    iconBg: "bg-[#33b3b0]",
    image:
      "https://source.unsplash.com/featured/900x900/?construction-materials,pallets,warehouse",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 16V5" />
        <path d="m7 10 5-5 5 5" />
        <path d="M5 19h14" />
      </svg>
    ),
  },
  {
    title: "Orders",
    description: "Track quotes, approve orders, and monitor deliveries.",
    hrefKey: "orders" as const,
    iconBg: "bg-[#cb7d2c]",
    image:
      "https://source.unsplash.com/featured/900x900/?hardware-store,building-supplies,usa",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
      </svg>
    ),
  },
];

function FeatureCard({ title, description, href, image, icon, iconBg }: { title: string; description: string; href: string; image: string; icon: ReactNode; iconBg: string }) {
  return (
    <Link href={href} className="group relative min-h-[16rem] overflow-hidden rounded-[24px] border border-white/12 bg-[#122445] shadow-[0_22px_52px_rgba(2,8,23,0.28)] transition active:scale-[0.99]">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${image}')` }} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,18,38,0.08)_0%,rgba(6,18,38,0.34)_38%,rgba(6,18,38,0.86)_100%)]" />
      <div className="relative flex h-full flex-col justify-end p-4 text-white">
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${iconBg} shadow-[0_14px_28px_rgba(15,23,42,0.28)]`}>
          {icon}
        </div>
        <h3 className="text-[1.65rem] font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 max-w-[16rem] text-sm leading-6 text-slate-200">{description}</p>
        <div className="mt-4 flex justify-end">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/6 text-white transition group-hover:bg-white/12">
            <svg viewBox="0 0 20 20" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 10h12" /><path d="m10 4 6 6-6 6" /></svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function Home() {
  const { user } = await getSessionWithProfile();
  const isSignedIn = Boolean(user);
  const gatedHref = isSignedIn ? null : "/login";
  const projectsHref = gatedHref ?? "/projects";
  const uploadHref = gatedHref ?? "/upload";
  const ordersHref = gatedHref ?? "/orders";
  const shopHref = gatedHref ?? "/shop";

  const hrefs = {
    projects: projectsHref,
    upload: uploadHref,
    orders: ordersHref,
  };

  return (
    <main className="min-h-screen overflow-x-clip bg-[linear-gradient(180deg,#f4faff_0%,#edf6ff_48%,#ffffff_100%)] text-slate-900">
      <RecoveryLinkHandler />

      <section className="mx-auto flex min-h-screen max-w-4xl flex-col gap-5 px-3 pb-28 pt-3 sm:gap-6 sm:px-8 sm:pb-12 sm:pt-8">
        <MobileHomeHeader uploadHref={uploadHref} aiHref="#" />

        <section className="rounded-[30px] border border-sky-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(235,245,255,0.92))] px-4 py-5 shadow-[0_24px_58px_rgba(148,163,184,0.14)] sm:px-6 sm:py-6">
          <div className="flex items-center gap-2">
            <h2 className="text-[1.65rem] font-semibold tracking-tight text-slate-950">How BuildFlow Works</h2>
            <span className="h-2 w-2 rounded-full bg-sky-400" />
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {flowSteps.map((step, index) => (
              <div key={step.number} className="relative text-center text-slate-900">
                {index < flowSteps.length - 1 ? <div className="pointer-events-none absolute left-[60%] top-8 hidden h-px w-[80%] border-t border-dashed border-sky-200 lg:block" /> : null}
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(239,246,255,0.9))] text-sky-700 shadow-[0_12px_26px_rgba(148,163,184,0.14)]">
                  {step.icon}
                </div>
                <div className="mx-auto -mt-3 flex h-6 w-6 items-center justify-center rounded-full bg-[linear-gradient(180deg,#f2c86a,#dca445)] text-[11px] font-bold text-slate-950 shadow-[0_8px_18px_rgba(220,164,69,0.26)]">
                  {step.number}
                </div>
                <h3 className="mt-3 text-lg font-semibold leading-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {featureCards.map((card) => (
            <FeatureCard
              key={card.title}
              title={card.title}
              description={card.description}
              href={hrefs[card.hrefKey]}
              image={card.image}
              icon={card.icon}
              iconBg={card.iconBg}
            />
          ))}
        </section>

        <section className="relative overflow-hidden rounded-[28px] border border-sky-100/90 bg-[linear-gradient(180deg,#f8fbff_0%,#eaf4ff_100%)] shadow-[0_24px_52px_rgba(148,163,184,0.14)]">
          <div className="absolute inset-0 bg-cover bg-center opacity-90" style={{ backgroundImage: "url('https://source.unsplash.com/featured/1400x900/?construction-supplies,materials-store,warehouse')" }} />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(248,251,255,0.96)_0%,rgba(234,244,255,0.88)_48%,rgba(234,244,255,0.38)_100%)]" />
          <div className="relative px-4 py-5 sm:px-6 sm:py-6">
            <div className="flex items-center gap-2">
              <h3 className="text-[1.6rem] font-semibold tracking-tight text-slate-950">Search Materials</h3>
              <span className="h-2 w-2 rounded-full bg-sky-400" />
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">Find the right materials for your project</p>

            <div className="mt-4 flex min-h-14 items-center gap-3 rounded-[18px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.92))] px-4 text-slate-900 shadow-[0_16px_34px_rgba(148,163,184,0.12)] backdrop-blur-md">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <span className="text-sm text-slate-500">Search materials, categories, or brands...</span>
            </div>

            <Link href={shopHref} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sky-700 underline underline-offset-4 active:scale-[0.99]">
              Open search after login
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
