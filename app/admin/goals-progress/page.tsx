import { ArrowUpRight, Check, Clock3, Target } from "lucide-react";

import { requireAdminProfile } from "@/lib/auth";

const SHOP_PREVIEW_URL = "https://build-flow-wfl3-em41309w2-avitanneto-1804s-projects.vercel.app/shop";

type GoalStep = { label: string; complete: boolean; current?: boolean };

const steps: GoalStep[] = [
  { label: "Shop design updated", complete: true },
  { label: "Phone and desktop checks passed", complete: true },
  { label: "Owner review", complete: false, current: true },
  { label: "Publish to build.avantiap.com", complete: false },
];

export default async function GoalsProgressPage() {
  await requireAdminProfile();

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Manager Portal</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal sm:text-4xl">Goals &amp; Progress</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Track private website improvements and review them before they are published.</p>
        </header>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="shop-goal-title">
          <div className="grid gap-5 border-b border-slate-200 p-5 sm:grid-cols-[1fr_auto] sm:items-start sm:p-6">
            <div className="flex min-w-0 gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-[#0066cc]">
                <Target className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Website improvement</p>
                <h2 id="shop-goal-title" className="mt-1 text-xl font-semibold tracking-normal">Update the Shop experience</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Review the redesigned service and material shopping page before deciding whether to publish it on the main website.</p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              Owner review
            </span>
          </div>

          <div className="grid gap-8 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Progress</p>
                  <p className="mt-1 text-xs text-slate-500">Two steps remain under owner control.</p>
                </div>
                <strong className="text-2xl font-semibold tabular-nums">50%</strong>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" aria-label="Goal is 50 percent complete">
                <div className="h-full w-1/2 rounded-full bg-[#0071e3]" />
              </div>

              <ol className="mt-6 grid gap-3 sm:grid-cols-2">
                {steps.map((step) => (
                  <li key={step.label} className="flex min-h-12 items-center gap-3 border-b border-slate-100 py-2 text-sm font-medium">
                    <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${step.complete ? "border-emerald-600 bg-emerald-600 text-white" : step.current ? "border-[#0071e3] text-[#0071e3]" : "border-slate-300 text-slate-400"}`}>
                      {step.complete ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                    </span>
                    {step.label}
                  </li>
                ))}
              </ol>
            </div>

            <aside className="border-t border-slate-200 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <p className="text-sm font-semibold">Current preview</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">This opens separately and does not change the production website.</p>
              <a
                href={SHOP_PREVIEW_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2"
              >
                Open Shop preview
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
