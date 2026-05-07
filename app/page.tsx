import Link from "next/link";

import { RecoveryLinkHandler } from "@/components/auth/recovery-link-handler";
import { MobileHomeHeader } from "@/components/buildflow/mobile-home-header";
import { getSessionWithProfile } from "@/lib/auth";

const flowSteps = [
  {
    title: "Create Project",
    number: "1",
    tint: "border-emerald-200/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.95),rgba(255,255,255,0.92))]",
    badge: "bg-emerald-500",
    text: "Open the job and keep the basics in one place.",
    accent: "bg-emerald-300/50",
  },
  {
    title: "Upload Plans",
    number: "2",
    tint: "border-sky-200/80 bg-[linear-gradient(180deg,rgba(240,249,255,0.96),rgba(255,255,255,0.92))]",
    badge: "bg-sky-500",
    text: "Send photos, drawings, and notes from the field.",
    accent: "bg-sky-300/50",
  },
  {
    title: "Review Materials & Quote",
    number: "3",
    tint: "border-violet-200/80 bg-[linear-gradient(180deg,rgba(245,243,255,0.96),rgba(255,255,255,0.92))]",
    badge: "bg-violet-500",
    text: "See what is needed before anything moves forward.",
    accent: "bg-violet-300/50",
  },
  {
    title: "Approve Order",
    number: "4",
    tint: "border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.96),rgba(255,255,255,0.92))]",
    badge: "bg-amber-500",
    text: "Stay in control before any order is confirmed.",
    accent: "bg-amber-300/50",
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

  return (
    <main className="min-h-screen overflow-x-clip bg-[linear-gradient(180deg,#edf4fb_0%,#f9fbff_34%,#f6faf6_72%,#f3f7f3_100%)] text-slate-900">
      <RecoveryLinkHandler />

      <section className="relative mx-auto flex min-h-screen max-w-4xl flex-col gap-5 px-4 pb-28 pt-4 sm:gap-6 sm:px-8 sm:pb-12 sm:pt-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] bg-[radial-gradient(circle_at_top,_rgba(14,35,65,0.1),_transparent_58%)]" />
        <div className="pointer-events-none absolute right-0 top-28 -z-10 h-32 w-32 rounded-full bg-violet-200/20 blur-3xl" />
        <MobileHomeHeader uploadHref={uploadHref} aiHref="#" />

        <section className="relative overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(255,255,255,0.78))] p-5 shadow-[0_18px_54px_rgba(148,163,184,0.16)] backdrop-blur-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">How BuildFlow works</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">One clear path from project setup to approval</h2>
            </div>
            <span className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-sm">4 steps</span>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(circle_at_bottom,_rgba(14,35,65,0.04),transparent_65%)]" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {flowSteps.map((step) => (
              <div key={step.number} className={`relative overflow-hidden rounded-[28px] border px-4 py-4 shadow-[0_14px_34px_rgba(148,163,184,0.09)] ${step.tint}`}>
                <div className={`absolute right-3 top-3 h-10 w-10 rounded-full blur-xl ${step.accent}`} />
                <div className={`relative flex h-9 w-9 items-center justify-center rounded-[18px] ${step.badge} text-xs font-semibold text-white shadow-[0_8px_18px_rgba(15,23,42,0.12)] ring-4 ring-white/60`}>{step.number}</div>
                <p className="relative mt-3 text-sm font-semibold text-slate-900">{step.title}</p>
                <p className="relative mt-1.5 text-xs leading-5 text-slate-600">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="relative min-w-0 overflow-hidden rounded-[32px] border border-emerald-200/65 bg-gradient-to-br from-white via-emerald-50/72 to-emerald-100/72 p-5 shadow-[0_18px_42px_rgba(16,185,129,0.08)] sm:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-emerald-200/60 bg-white/65 text-emerald-700 shadow-[0_10px_24px_rgba(16,185,129,0.08)]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 19h16" />
                <path d="M5 19V9l7-4 7 4v10" />
                <path d="M9 19v-5h6v5" />
              </svg>
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700/80">Projects</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">Projects</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Keep job details, address, timeline, and client info organized before uploads begin.</p>
            <Link href={projectsHref} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#0e2341] underline underline-offset-4 active:scale-[0.99]">
              Log in to view projects
            </Link>
          </article>

          <article className="relative min-w-0 overflow-hidden rounded-[32px] border border-sky-200/65 bg-gradient-to-br from-white via-sky-50/74 to-cyan-100/70 p-5 shadow-[0_18px_42px_rgba(56,189,248,0.1)] sm:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-sky-200/60 bg-white/65 text-sky-700 shadow-[0_10px_24px_rgba(56,189,248,0.09)]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="m8 11 2-2 2 2 4-4 2 2" />
              </svg>
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700/80">Uploads</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">Uploads</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Send plans, photos, and documents so the next material step has the right context.</p>
            <Link href={uploadHref} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#0e2341] underline underline-offset-4 active:scale-[0.99]">
              Log in to upload
            </Link>
          </article>

          <article className="relative min-w-0 overflow-hidden rounded-[32px] border border-violet-200/65 bg-gradient-to-br from-white via-violet-50/74 to-fuchsia-100/68 p-5 shadow-[0_18px_42px_rgba(139,92,246,0.09)] sm:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-violet-200/60 bg-white/65 text-violet-700 shadow-[0_10px_24px_rgba(139,92,246,0.08)]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 7h12" />
                <path d="M6 12h12" />
                <path d="M6 17h8" />
                <path d="m17 16 2 2 4-4" />
              </svg>
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700/80">Orders</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">Orders</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Review quotes, approve orders, and keep project decisions lined up in one flow.</p>
            <Link href={ordersHref} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#0e2341] underline underline-offset-4 active:scale-[0.99]">
              Log in to see orders
            </Link>
          </article>
        </section>

        <section className="relative overflow-hidden rounded-[32px] border border-[#17355c] bg-[linear-gradient(135deg,#0d203b_0%,#132f53_54%,#15596a_100%)] p-5 text-white shadow-[0_24px_56px_rgba(15,23,42,0.22)] sm:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
          <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 bg-sky-300/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Search materials</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Find what you need after login</h3>
              <p className="mt-2 text-sm leading-6 text-slate-200">Search materials we supply or have, then keep your selections connected to the project flow.</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.14),rgba(125,211,252,0.08))] text-sky-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_rgba(15,23,42,0.12)]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-[24px] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] px-4 py-3 text-slate-900 shadow-[0_14px_30px_rgba(15,23,42,0.14)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span className="text-sm text-slate-500">Log in to search materials we supply or have</span>
          </div>
          <Link href={shopHref} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-100 underline underline-offset-4 active:scale-[0.99]">
            <span>Open search after login</span>
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 10h12" /><path d="m10 4 6 6-6 6" /></svg>
          </Link>
        </section>

        <section className="rounded-[28px] border border-amber-200/70 bg-gradient-to-r from-white via-amber-50/70 to-white px-5 py-4 text-center shadow-[0_14px_34px_rgba(245,158,11,0.08)]">
          <p className="text-sm font-medium text-slate-700">Nothing is ordered, charged, or sent without approval.</p>
        </section>
      </section>
    </main>
  );
}
