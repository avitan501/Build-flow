import Link from "next/link";

import { RecoveryLinkHandler } from "@/components/auth/recovery-link-handler";
import { JourneyStrip, ProgressMiniCards, statusButtonClass, statusClasses } from "@/components/buildflow/wireframe";
import { getBuildflowWireframeData } from "@/lib/buildflow-wireframe";

export default function Home() {
  const { specMap } = getBuildflowWireframeData();
  const home = specMap.get("home");
  const dashboard = specMap.get("dashboard");
  const buildMap = specMap.get("admin-build-map");

  if (!home || !dashboard || !buildMap) {
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
                Clear first step, clear next step, and no fake promises. Start the project, upload plans, review materials, then approve the order.
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em]">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">Public / Client</span>
                <span className={`rounded-full border px-3 py-1 ${authTone.badge}`}>Client flow live</span>
                <span className={`rounded-full border px-3 py-1 ${whatsappTone.badge}`}>WhatsApp operations preview</span>
                <span className={`rounded-full border px-3 py-1 ${ordersTone.badge}`}>Order approval partial</span>
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
              <p className="mt-1 text-sm text-slate-500">Primary action first, then the next safe step.</p>
            </div>
            <Link href="/admin/build-map" className="text-sm font-semibold text-slate-700 underline underline-offset-4">
              Back to Build Map
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link href="/projects/new" className="inline-flex items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
              Start Project
            </Link>
            <Link href="/upload" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
              Upload Plans
            </Link>
            <Link href="/materials" className={statusButtonClass(home.actions[2]?.status || "Coming Soon", home.actions[2]?.status === "Coming Soon")}>
              Review Materials
            </Link>
            <Link href="/orders" className={statusButtonClass(home.actions[3]?.status || "Coming Soon", home.actions[3]?.status === "Coming Soon")}>
              Approve Order
            </Link>
          </div>
        </section>

        <ProgressMiniCards specs={[dashboard, specMap.get("projects")!, specMap.get("upload")!, specMap.get("orders")!]} />

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Client Flow</div>
            <h2 className="mt-2 text-lg font-semibold">For customers and project teams</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Start a project, upload plans, review draft materials, and move toward order approval.</p>
          </article>
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Admin / Ops</div>
            <h2 className="mt-2 text-lg font-semibold">For internal control and review</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">User approvals, route visibility, system status, and internal review screens stay protected.</p>
          </article>
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">WhatsApp Operations</div>
            <h2 className="mt-2 text-lg font-semibold">For inbound message review only</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Read-only inbox visibility, importer status, and safe admin-side review. No sending is enabled.</p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Access points</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href="/projects/new" className="inline-flex items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
                Start Project
              </Link>
              <Link href="/upload" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                Upload Plans
              </Link>
              <Link href="/dashboard" className={statusButtonClass(dashboard.status)}>
                Client Dashboard
              </Link>
              <Link href="/admin/build-map" className={statusButtonClass(buildMap.status)}>
                Admin Build Map
              </Link>
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">What still needs work</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
              {home.missing.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                Log In
              </Link>
              <Link href="/signup" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                Create Account
              </Link>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
