import Link from "next/link";

import { RecoveryLinkHandler } from "@/components/auth/recovery-link-handler";
import { MobileHomeHeader } from "@/components/buildflow/mobile-home-header";
import { getSessionWithProfile } from "@/lib/auth";

const flowSteps = [
  { title: "Create Project", number: "1" },
  { title: "Upload Plans", number: "2" },
  { title: "Review Materials & Quote", number: "3" },
  { title: "Approve Order", number: "4" },
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
    <main className="min-h-screen overflow-x-clip bg-[#eef3f9] text-slate-900">
      <RecoveryLinkHandler />

      <section className="mx-auto flex min-h-screen max-w-4xl flex-col gap-5 px-4 pb-28 pt-4 sm:gap-6 sm:px-8 sm:pb-12 sm:pt-8">
        <MobileHomeHeader uploadHref={uploadHref} aiHref="#" />

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">How BuildFlow works</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">One clear path from project setup to approval</h2>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">4 steps</span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {flowSteps.map((step) => (
              <div key={step.number} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0e2341] text-xs font-semibold text-white">{step.number}</div>
                <p className="mt-3 text-sm font-semibold text-slate-900">{step.title}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Projects</p>
            <h3 className="mt-2 text-lg font-semibold">Projects</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Keep job details, address, timeline, and client info organized before uploads begin.</p>
            <Link href={projectsHref} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#0e2341] underline underline-offset-4 active:scale-[0.99]">
              Log in to view projects
            </Link>
          </article>

          <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Uploads</p>
            <h3 className="mt-2 text-lg font-semibold">Uploads</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Send plans, photos, and documents so the next material step has the right context.</p>
            <Link href={uploadHref} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#0e2341] underline underline-offset-4 active:scale-[0.99]">
              Log in to upload
            </Link>
          </article>

          <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Orders</p>
            <h3 className="mt-2 text-lg font-semibold">Orders</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Review quotes, approve orders, and keep project decisions lined up in one flow.</p>
            <Link href={ordersHref} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#0e2341] underline underline-offset-4 active:scale-[0.99]">
              Log in to see orders
            </Link>
          </article>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-[#0e2341] p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)] sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Search materials</p>
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white px-4 py-3 text-slate-900 opacity-95">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span className="text-sm text-slate-500">Log in to search materials we supply or have</span>
          </div>
          <Link href={shopHref} className="mt-4 inline-flex text-sm font-semibold text-slate-200 underline underline-offset-4 active:scale-[0.99]">
            Open search after login
          </Link>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-700">Nothing is ordered, charged, or sent without approval.</p>
        </section>
      </section>
    </main>
  );
}
