import Link from "next/link";

import { RecoveryLinkHandler } from "@/components/auth/recovery-link-handler";
import { ProgressMiniCards, statusButtonClass, statusClasses } from "@/components/buildflow/wireframe";
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
  const takeoffTone = statusClasses(specMap.get("takeoff-review")?.status || "Coming Soon");
  const ordersTone = statusClasses(specMap.get("orders")?.status || "Coming Soon");

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <RecoveryLinkHandler />
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-10 sm:px-8 lg:px-10">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">BuildFlow skeleton</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Functional wireframe</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                Simple entry screen for the working flow. No finished-product polish, no fake live promises.
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em]">
                <span className={`rounded-full border px-3 py-1 ${authTone.badge}`}>Auth live</span>
                <span className={`rounded-full border px-3 py-1 ${whatsappTone.badge}`}>WhatsApp preview</span>
                <span className={`rounded-full border px-3 py-1 ${takeoffTone.badge}`}>AI Takeoff coming soon</span>
                <span className={`rounded-full border px-3 py-1 ${ordersTone.badge}`}>Orders coming soon</span>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:min-w-80">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Page progress</div>
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
              <h2 className="text-lg font-semibold">What BuildFlow does</h2>
              <p className="mt-1 text-sm text-slate-500">Five action buttons, folder-style workflow, short helper text only.</p>
            </div>
            <Link href="/admin/build-map" className="text-sm font-semibold text-slate-700 underline underline-offset-4">
              Back to Build Map
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {home.actions.map((action) => (
              action.href ? (
                <Link key={action.label} href={action.href} className={statusButtonClass(action.status || "Coming Soon", action.status === "Coming Soon") }>
                  <span>{action.label}</span>
                </Link>
              ) : null
            ))}
          </div>
        </section>

        <ProgressMiniCards specs={[dashboard, specMap.get("projects")!, specMap.get("upload")!, specMap.get("orders")!]} />

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Main buttons</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href="/signup" className="inline-flex items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
                Signup
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
                Login
              </Link>
              <Link href="/dashboard" className={statusButtonClass(dashboard.status)}>
                Dashboard
              </Link>
              <Link href="/admin/build-map" className={statusButtonClass(buildMap.status)}>
                Build Map
              </Link>
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">What is missing</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
              {home.missing.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            <button type="button" className="mt-5 inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
              Next Step
            </button>
          </article>
        </section>
      </section>
    </main>
  );
}
