import Link from "next/link";

import { RecoveryLinkHandler } from "@/components/auth/recovery-link-handler";
import { JourneyStrip, ProgressMiniCards, statusButtonClass, statusClasses } from "@/components/buildflow/wireframe";
import { getBuildflowWireframeData } from "@/lib/buildflow-wireframe";

export default function Home() {
  const { specMap } = getBuildflowWireframeData();
  const home = specMap.get("home");
  const dashboard = specMap.get("dashboard");

  if (!home || !dashboard) {
    throw new Error("Missing BuildFlow wireframe route data.");
  }

  const authTone = statusClasses(dashboard.status);
  const whatsappTone = statusClasses(specMap.get("admin-whatsapp")?.status || "Preview");
  const ordersTone = statusClasses(specMap.get("orders")?.status || "Coming Soon");

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <RecoveryLinkHandler />
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-10 sm:px-8 lg:px-10">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">BuildFlow</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Build materials workflow, made easier to follow</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                Guests should know exactly how to begin: log in to start a project, create an account if needed, then move through upload, materials, and order approval inside the protected client flow.
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em]">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">Public / Client</span>
                <span className={`rounded-full border px-3 py-1 ${authTone.badge}`}>Client flow live</span>
                <span className={`rounded-full border px-3 py-1 ${ordersTone.badge}`}>Order approval partial</span>
                <span className={`rounded-full border px-3 py-1 ${whatsappTone.badge}`}>Protected ops stay separate</span>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:min-w-80">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Homepage progress</div>
              <div className="mt-3 text-2xl font-semibold text-slate-900">{home.progress}% complete</div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-slate-900" style={{ width: `${home.progress}%` }} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">Missing: {home.missing.join(" · ")}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">4-step client flow</h2>
              <p className="mt-1 text-sm text-slate-500">One obvious path first. Internal tools stay separate.</p>
            </div>
          </div>
          <div className="mt-5">
            <JourneyStrip activeStep={0} />
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Start here</h2>
              <p className="mt-1 text-sm text-slate-500">For guests, the first step is account access. Project work begins after login.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr]">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Primary action</div>
              <Link href="/start-project" className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
                Log in to Start Project
              </Link>
              <p className="mt-3 text-sm leading-6 text-emerald-900">Guests are routed into the protected client flow before creating projects or uploading plans.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Need access?</div>
              <Link href="/signup" className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
                Create Account
              </Link>
              <p className="mt-3 text-sm leading-6 text-slate-600">New clients can create an account first, then continue into the same guided project flow.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Preview</div>
              <Link href="/demo/client-flow" className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-sky-300 bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-600">
                View Demo Client Flow
              </Link>
              <p className="mt-3 text-sm leading-6 text-slate-600">Use the public demo if you want to understand the steps before signing in.</p>
            </div>
          </div>
        </section>

        <ProgressMiniCards specs={[dashboard, specMap.get("projects")!, specMap.get("upload")!, specMap.get("orders")!]} />

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Client entry</div>
            <h2 className="mt-2 text-lg font-semibold">For guests starting the process</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">The homepage should explain how to get access first, then continue into the protected project workflow.</p>
          </article>
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">After login</div>
            <h2 className="mt-2 text-lg font-semibold">For the actual working client journey</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Project setup, uploads, materials, quotes, and orders belong inside the signed-in client flow.</p>
          </article>
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Protected operations</div>
            <h2 className="mt-2 text-lg font-semibold">Kept separate from public onboarding</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Internal tools and operations stay out of the public homepage so the client entry path stays calm and clear.</p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">After login journey overview</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">These are the protected steps the client sees after account access is complete.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className={statusButtonClass("Preview", true)}>Start Project</div>
              <div className={statusButtonClass("Coming Soon", true)}>Upload Plans</div>
              <div className={statusButtonClass("Coming Soon", true)}>Review Materials</div>
              <div className={statusButtonClass("Coming Soon", true)}>Review Quote</div>
              <div className={statusButtonClass(home.actions[3]?.status || "Coming Soon", true)}>Approve Order</div>
              <div className={statusButtonClass(dashboard.status, true)}>Client Dashboard</div>
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">What still needs work</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
              {home.missing.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              Guests should start with login or account creation first. Protected workflow pages remain behind auth until the client enters the portal.
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
