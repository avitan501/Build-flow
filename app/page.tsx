import Link from "next/link";

import { RecoveryLinkHandler } from "@/components/auth/recovery-link-handler";
import { MobileBottomDock } from "@/components/buildflow/mobile-bottom-dock";
import { MobileHomeHeader } from "@/components/buildflow/mobile-home-header";
import { getSessionWithProfile } from "@/lib/auth";

const journeySteps = ["Project", "Upload", "Materials", "Quote", "Orders"];

export default async function Home() {
  const { user } = await getSessionWithProfile();
  const accountHref = user ? "/dashboard" : "/login";

  return (
    <main className="min-h-screen bg-[#eef3f9] text-slate-900">
      <RecoveryLinkHandler />

      <section className="mx-auto flex min-h-screen max-w-6xl flex-col gap-5 px-4 pb-28 pt-4 sm:gap-6 sm:px-8 sm:pb-12 sm:pt-8 lg:px-10">
        <MobileHomeHeader accountHref={accountHref} />

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Client journey</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">After login, BuildFlow keeps the next step clear</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">Mobile-first</span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-5">
              {journeySteps.map((step, index) => (
                <div key={step} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Step {index + 1}</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">{step}</div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              Start with account access, then move from project setup to upload, materials, quote review, and order approval without mixing in internal tools.
            </p>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Start actions</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">Simple, client-facing entry</h2>
            <div className="mt-5 grid gap-3">
              <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#0e2341] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#13315a]">
                Log in to Start Project
              </Link>
              <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white">
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
          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Projects</p>
            <h3 className="mt-2 text-lg font-semibold">Start with the right job</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Keep your project address, timeline, and client info organized before any uploads begin.</p>
            <Link href="/projects" className="mt-4 inline-flex text-sm font-semibold text-[#0e2341] underline underline-offset-4">
              View projects
            </Link>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Uploads</p>
            <h3 className="mt-2 text-lg font-semibold">Send plans or site photos fast</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Upload drawings, room photos, or field notes so the next material step has the right context.</p>
            <Link href="/upload" className="mt-4 inline-flex text-sm font-semibold text-[#0e2341] underline underline-offset-4">
              Go to upload
            </Link>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Orders</p>
            <h3 className="mt-2 text-lg font-semibold">Review and approve with confidence</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">BuildFlow keeps materials, quotes, and order decisions lined up in one clean client path.</p>
            <Link href="/orders" className="mt-4 inline-flex text-sm font-semibold text-[#0e2341] underline underline-offset-4">
              See order flow
            </Link>
          </article>
        </section>
      </section>

      <MobileBottomDock accountHref={accountHref} />
    </main>
  );
}
