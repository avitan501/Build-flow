import Link from "next/link";

import { ProgressMiniCards, statusButtonClass, statusClasses } from "@/components/buildflow/wireframe";
import { requireAdminProfile } from "@/lib/auth";
import { getBuildflowWireframeData, type RouteSpec } from "@/lib/buildflow-wireframe";

const flowLabels: Record<RouteSpec["flow"], string> = {
  client: "Client flow",
  admin: "Admin flow",
  whatsapp: "WhatsApp flow",
  ai: "AI Takeoff flow",
  orders: "Order flow",
};

const flowOrder: RouteSpec["flow"][] = ["client", "admin", "whatsapp", "ai", "orders"];

export default async function AdminBuildMapPage() {
  await requireAdminProfile();
  const { specMap, specs, liveData } = getBuildflowWireframeData();
  const buildMap = specMap.get("admin-build-map");

  if (!buildMap) {
    throw new Error("Missing Build Map route spec.");
  }

  const tone = statusClasses(buildMap.status);
  const flows = flowOrder.map((flow) => ({
    flow,
    items: specs.filter((spec) => spec.flow === flow),
  }));

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-900 sm:px-8 lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Admin only · main clickable map</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Build Map</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                Clickable wireframe map of the whole BuildFlow system. Every page shows status, progress, missing pieces, and next step.
              </p>
            </div>
            <div className="grid gap-3 sm:min-w-72">
              <span className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${tone.badge}`}>
                {buildMap.status}
              </span>
              <div className={`rounded-2xl border px-4 py-3 text-sm ${tone.card}`}>
                {buildMap.progress}% complete · {100 - buildMap.progress}% remaining
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Live health source</div>
              <p className="mt-3 text-sm text-slate-700">Control Center JSON drives progress and status colors where possible.</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Current blocker</div>
              <p className="mt-3 text-sm text-slate-700">{liveData.current_blocker || "No blocker recorded."}</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">What is missing</div>
              <p className="mt-3 text-sm text-slate-700">{buildMap.missing.join(" · ")}</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Next step</div>
              <p className="mt-3 text-sm text-slate-700">{buildMap.nextStep}</p>
            </article>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dashboard" className={statusButtonClass(specMap.get("dashboard")?.status || "Preview")}>Open Dashboard</Link>
            <Link href="/admin/users" className={statusButtonClass(specMap.get("admin-users")?.status || "Preview")}>Open Admin Users</Link>
            <Link href="http://5.78.189.133:3000/admin/flow-check?password=BuildFlowOwner2800" className={statusButtonClass(buildMap.status)}>
              Open Control Center
            </Link>
          </div>
        </section>

        <ProgressMiniCards specs={specs.filter((spec) => ["home", "dashboard", "admin-users", "admin-whatsapp", "orders", "takeoff-review"].includes(spec.key))} />

        {flows.map(({ flow, items }) => (
          <section key={flow} className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{flowLabels[flow]}</h2>
                <p className="mt-1 text-sm text-slate-500">Route map with simple labels, visible status colors, and next step links.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {items.map((item) => {
                const itemTone = statusClasses(item.status);
                return (
                  <article key={item.key} className={`rounded-[26px] border p-5 ${itemTone.card}`}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${itemTone.badge}`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{item.purpose}</p>
                        <p className="mt-3 text-sm text-slate-600">Route: {item.href}</p>
                      </div>
                      <div className="min-w-44 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-slate-700">
                        {item.progress}% complete
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80">
                      <div className="h-full rounded-full bg-slate-900" style={{ width: `${item.progress}%` }} />
                    </div>
                    <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
                      <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Missing</div>
                        <ul className="mt-2 space-y-1 text-sm text-slate-700">
                          {item.missing.map((missing) => (
                            <li key={missing}>• {missing}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Next step</div>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{item.nextStep}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link href={item.href} className={statusButtonClass(item.status, item.status === "Coming Soon")}>
                        Open {item.title}
                      </Link>
                      <Link href="/admin/build-map" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white/60">
                        Back to Build Map
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}
