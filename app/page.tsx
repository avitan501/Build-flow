import Link from "next/link";

import { RecoveryLinkHandler } from "@/components/auth/recovery-link-handler";
import { MobileHomeHeader } from "@/components/buildflow/mobile-home-header";
import { getSessionWithProfile } from "@/lib/auth";

const journeySteps = ["Project", "Upload", "Materials", "Quote", "Orders"];

export default async function Home() {
  const { user } = await getSessionWithProfile();
  const isSignedIn = Boolean(user);
  const accountHref = isSignedIn ? "/dashboard" : "/login";
  const gatedHref = isSignedIn ? null : "/login";
  const projectsHref = gatedHref ?? "/projects";
  const uploadHref = gatedHref ?? "/upload";
  const ordersHref = gatedHref ?? "/orders";
  const shopHref = gatedHref ?? "/shop";
  const aiHref = gatedHref ?? "/ai";

  return (
    <main className="min-h-screen overflow-x-clip bg-[#eef3f9] text-slate-900">
      <RecoveryLinkHandler />

      <section className="mx-auto flex min-h-screen max-w-6xl flex-col gap-5 px-4 pb-28 pt-4 sm:gap-6 sm:px-8 sm:pb-12 sm:pt-8 lg:px-10">
        <MobileHomeHeader accountHref={accountHref} uploadHref={uploadHref} aiHref={aiHref} />
        <div className="sm:hidden">
          <Link href={shopHref} className="block rounded-[28px] border border-[#25446d] bg-[#0e2341] p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)] active:scale-[0.99]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Search materials</p>
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-slate-900">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <span className="text-sm text-slate-500">{isSignedIn ? "Search materials we supply or have" : "Log in to search materials we supply or have"}</span>
            </div>
          </Link>
        </div>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Client journey</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">After login, BuildFlow keeps the next step clear</h2>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">Mobile-first</span>
            </div>

            <div className="-mx-1 mt-5 flex snap-x gap-3 overflow-x-auto px-1 pb-2 sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0 sm:grid-cols-5">
              {journeySteps.map((step, index) => (
                <div key={step} className="min-w-[138px] snap-start rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Step {index + 1}</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">{step}</div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              Start with account access, then move from project setup to upload, materials, quote review, and order approval without mixing in internal tools.
            </p>
          </article>

          <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Start actions</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">Simple, client-facing entry</h2>
            <div className="mt-5 grid gap-3">
              <Link href="/login" className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#0e2341] px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.99] hover:bg-[#13315a]">
                Log in to Start Project
              </Link>
              <Link href="/signup" className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition active:scale-[0.99] hover:bg-white">
                Create Account
              </Link>
            </div>

            <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">What happens after login</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <li>• Create or open your project</li>
                <li>• Upload plans, photos, or documents</li>
                <li>• Review materials prepared for the job</li>
                <li>• Check your quote before approval</li>
                <li>• Track orders and next actions</li>
              </ul>
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Projects</p>
            <h3 className="mt-2 text-lg font-semibold">Start with the right job</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Keep your project address, timeline, and client info organized before any uploads begin.</p>
            <Link href={projectsHref} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#0e2341] underline underline-offset-4 active:scale-[0.99]">
              {isSignedIn ? "View projects" : "Log in to view projects"}
            </Link>
          </article>

          <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Uploads</p>
            <h3 className="mt-2 text-lg font-semibold">Send plans or site photos fast</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Upload drawings, room photos, or field notes so the next material step has the right context.</p>
            <Link href={uploadHref} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#0e2341] underline underline-offset-4 active:scale-[0.99]">
              {isSignedIn ? "Go to upload" : "Log in to upload"}
            </Link>
          </article>

          <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Orders</p>
            <h3 className="mt-2 text-lg font-semibold">Review and approve with confidence</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">BuildFlow keeps materials, quotes, and order decisions lined up in one clean client path.</p>
            <Link href={ordersHref} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#0e2341] underline underline-offset-4 active:scale-[0.99]">
              {isSignedIn ? "See order flow" : "Log in to see orders"}
            </Link>
          </article>
        </section>
      </section>

    </main>
  );
}
