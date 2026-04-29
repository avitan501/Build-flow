import Link from "next/link";

const demoSteps = [
  "Demo Home",
  "Demo Project",
  "Demo Upload",
  "Demo Materials",
  "Demo Quote",
  "Demo Orders",
] as const;

export default function DemoClientFlowHomePage() {
  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-10 text-slate-900 sm:px-8 lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Public Demo</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">View the client flow without login</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                This demo path is public and wireframe-only. It lets Haim test the client journey from project start through demo order approval without touching auth, data, or admin systems.
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em]">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">Public demo</span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">No login required</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">UI only</span>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:min-w-80">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Demo goal</div>
              <div className="mt-3 text-2xl font-semibold text-slate-900">Reach Demo Orders</div>
              <p className="mt-3 text-sm leading-6 text-slate-600">Use this route to test the full wireframe path without getting redirected to login.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">Demo click path</h2>
            <p className="mt-1 text-sm text-slate-500">Follow this exact public wireframe path from start to demo order approval.</p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            {demoSteps.map((step, index) => (
              <div key={step} className={`rounded-2xl border px-4 py-4 ${index === 0 ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Step {index + 1}</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{step}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Start the public demo</h2>
              <p className="mt-1 text-sm text-slate-500">This stays separate from the protected client routes.</p>
            </div>
            <Link href="/demo/client-flow/project" className="inline-flex items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
              Start Demo Project
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
