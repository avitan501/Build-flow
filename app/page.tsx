import Link from "next/link";

import { RecoveryLinkHandler } from "@/components/auth/recovery-link-handler";
import { MobileHomeHeader } from "@/components/buildflow/mobile-home-header";
import { getSessionWithProfile } from "@/lib/auth";

const flowSteps = [
  {
    title: "Create Project",
    number: "1",
    text: "Open the project and keep the basics in one place.",
  },
  {
    title: "Upload Plans",
    number: "2",
    text: "Send drawings, photos, and notes from the field.",
  },
  {
    title: "Review Materials & Quote",
    number: "3",
    text: "See what is needed before anything moves forward.",
  },
  {
    title: "Approve Order",
    number: "4",
    text: "Stay in control before any order is confirmed.",
  },
];

const featureCards = [
  {
    eyebrow: "Projects",
    title: "Organize jobs clearly",
    body: "Keep job details, address, timeline, and client info ready before uploads begin.",
    hrefKey: "projects" as const,
    accent: "from-sky-100 via-white to-blue-50",
    iconBg: "bg-sky-600",
  },
  {
    eyebrow: "Uploads",
    title: "Collect plans fast",
    body: "Send plans, photos, and documents so the next material step has the right context.",
    hrefKey: "upload" as const,
    accent: "from-cyan-50 via-white to-sky-50",
    iconBg: "bg-cyan-500",
  },
  {
    eyebrow: "Orders",
    title: "Review with confidence",
    body: "Review quotes, approve orders, and keep project decisions lined up in one flow.",
    hrefKey: "orders" as const,
    accent: "from-amber-50 via-white to-orange-50",
    iconBg: "bg-amber-500",
  },
];

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
    <main className="min-h-screen overflow-x-clip bg-[linear-gradient(180deg,#f7fbff_0%,#eef6ff_45%,#ffffff_100%)] text-slate-900">
      <RecoveryLinkHandler />

      <section className="relative mx-auto flex min-h-screen max-w-4xl flex-col gap-5 px-4 pb-28 pt-4 sm:gap-6 sm:px-8 sm:pb-12 sm:pt-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.18),_transparent_58%)]" />
        <MobileHomeHeader uploadHref={uploadHref} aiHref="/ai" />

        <section className="rounded-[30px] border border-sky-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,247,255,0.92))] px-5 py-5 shadow-[0_20px_50px_rgba(148,163,184,0.12)] sm:px-6 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">How BuildFlow works</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">One clear path from project setup to approval</h2>
            </div>
            <span className="shrink-0 rounded-full border border-sky-100 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-sm">4 steps</span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {flowSteps.map((step) => (
              <div key={step.number} className="rounded-[26px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(241,247,255,0.82))] px-4 py-4 shadow-[0_12px_28px_rgba(148,163,184,0.08)]">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(180deg,#0f315f_0%,#17457b_100%)] text-xs font-semibold text-white shadow-[0_10px_20px_rgba(14,35,65,0.18)]">{step.number}</div>
                <p className="mt-3 text-sm font-semibold text-slate-900">{step.title}</p>
                <p className="mt-1.5 text-xs leading-5 text-slate-600">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {featureCards.map((card) => (
            <article key={card.title} className={`min-w-0 rounded-[28px] border border-sky-100 bg-gradient-to-br ${card.accent} p-5 shadow-[0_18px_40px_rgba(148,163,184,0.1)] sm:p-6`}>
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.iconBg} text-white shadow-[0_12px_24px_rgba(148,163,184,0.16)]`}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 19h16" />
                  <path d="M5 19V9l7-4 7 4v10" />
                  <path d="M9 19v-5h6v5" />
                </svg>
              </div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{card.eyebrow}</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
              <Link href={hrefs[card.hrefKey]} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#0e2341] underline underline-offset-4 active:scale-[0.99]">
                Log in to view {card.eyebrow.toLowerCase()}
              </Link>
            </article>
          ))}
        </section>

        <section className="rounded-[28px] border border-sky-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(232,243,255,0.88))] p-5 shadow-[0_18px_46px_rgba(148,163,184,0.12)] sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Search materials</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">Find what you need after login</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">Search materials we supply or have, then keep your selections connected to the project flow.</p>
          <div className="mt-4 flex min-h-14 items-center gap-3 rounded-[20px] border border-sky-100 bg-white px-4 py-3 text-slate-900 shadow-[0_12px_26px_rgba(148,163,184,0.1)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span className="text-sm text-slate-500">Log in to search materials we supply or have</span>
          </div>
          <Link href={shopHref} className="mt-4 inline-flex text-sm font-semibold text-sky-700 underline underline-offset-4 active:scale-[0.99]">
            Open search after login
          </Link>
        </section>

        <section className="rounded-[24px] border border-sky-100 bg-white px-5 py-4 text-center shadow-[0_12px_28px_rgba(148,163,184,0.08)]">
          <p className="text-sm font-medium text-slate-700">Nothing is ordered, charged, or sent without approval.</p>
        </section>
      </section>
    </main>
  );
}
