import Link from "next/link";

import { ProgressMiniCards, statusButtonClass, statusClasses } from "@/components/buildflow/wireframe";
import { requireSignedInProfile } from "@/lib/auth";
import { getBuildflowWireframeData } from "@/lib/buildflow-wireframe";

const clientSteps = [
  "Dashboard",
  "Projects",
  "Upload",
  "Materials",
  "Quote",
  "Orders",
] as const;

const journeyActions = [
  { label: "Start New Project", href: "/projects/new", status: "Preview" as const },
  { label: "Upload Plans", href: "/upload", status: "Coming Soon" as const },
  { label: "Review Materials", href: "/materials", status: "Coming Soon" as const },
  { label: "Review Quote", href: "/quotes", status: "Preview" as const },
  { label: "Track Order", href: "/orders", status: "Preview" as const },
] as const;

export default async function DashboardPage() {
  const { user, profile } = await requireSignedInProfile();
  const { specMap } = getBuildflowWireframeData();
  const dashboard = specMap.get("dashboard");
  const projects = specMap.get("projects");
  const upload = specMap.get("upload");
  const materials = specMap.get("materials");
  const quotes = specMap.get("quotes");
  const orders = specMap.get("orders");

  if (!dashboard || !projects || !upload || !materials || !quotes || !orders) {
    throw new Error("Missing BuildFlow dashboard route data.");
  }

  const statusTone = statusClasses(dashboard.status);
  const isPending = profile?.approval_status === "pending";

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-900 sm:px-8 lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Client Flow · signed in</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {isPending ? "Pending Approval" : "Your BuildFlow Project Dashboard"}
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                {isPending
                  ? "Your account is pending approval. Your account is pending admin approval."
                  : `This dashboard is your hub after login. Signed in as ${user.email}. Use it to move from projects into upload, materials, quote review, and final order tracking.`}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">Who this page is for: Client Flow</span>
              </div>
            </div>
            <div className="grid gap-3 sm:min-w-72">
              <span className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${isPending ? "border-orange-200 bg-orange-50 text-orange-700" : statusTone.badge}`}>
                {isPending ? "Pending" : dashboard.status}
              </span>
              <div className={`rounded-2xl border px-4 py-3 text-sm ${isPending ? "border-orange-200 bg-orange-50 text-orange-700" : statusTone.card}`}>
                {isPending ? "Pending account state · limited access" : `${dashboard.progress}% complete · ${100 - dashboard.progress}% remaining`}
              </div>
            </div>
          </div>

          {isPending ? (
            <div className="mt-6 rounded-3xl border border-orange-200 bg-orange-50 p-5 text-orange-700">
              <div className="text-xs font-semibold uppercase tracking-[0.16em]">Next step</div>
              <p className="mt-3 text-sm leading-6">Pending Approval. Your account is pending approval.</p>
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status badge</div>
              <div className="mt-3 text-sm text-slate-700">{profile?.approval_status ?? "pending"} · role {profile?.role ?? "client"}</div>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Purpose</div>
              <div className="mt-3 text-sm text-slate-700">{isPending ? "Show account approval state until admin review is complete." : dashboard.purpose}</div>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Missing to 100%</div>
              <div className="mt-3 text-sm text-slate-700">{isPending ? "Admin approval, approved-client actions, and project workflow access" : dashboard.missing[0]}</div>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Next step</div>
              <div className="mt-3 text-sm text-slate-700">{isPending ? "Wait for admin approval before full client actions are enabled." : dashboard.nextStep}</div>
            </article>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Continue your project journey</h2>
              <p className="mt-1 text-sm text-slate-500">Dashboard is the client hub after login, with one clear path into each major step.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            {clientSteps.map((step, index) => (
              <div key={step} className={`rounded-2xl border px-4 py-4 ${index === 0 ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Step {index + 1}</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{step}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {isPending ? (
              <>
                <div className={statusButtonClass("Coming Soon", true)}>Start New Project</div>
                <div className={statusButtonClass("Coming Soon", true)}>Upload Plans</div>
                <div className={statusButtonClass("Coming Soon", true)}>Review Materials</div>
                <div className={statusButtonClass("Coming Soon", true)}>Review Quote</div>
                <div className={statusButtonClass("Preview", true)}>Track Order</div>
              </>
            ) : (
              journeyActions.map((action, index) => {
                const dynamicStatus = index === 1 ? upload.status : index === 2 ? materials.status : index === 3 ? quotes.status : index === 4 ? orders.status : action.status;
                return (
                  <Link key={action.href} href={action.href} className={statusButtonClass(dynamicStatus)}>
                    {action.label}
                  </Link>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Journey compass</h2>
              <p className="mt-1 text-sm text-slate-500">Use the dashboard as the hub, then move into projects, uploads, materials, quotes, and final order tracking.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            {clientSteps.map((step, index) => {
              const hrefs = ["/dashboard", "/projects/new", "/upload", "/materials", "/quotes", "/orders"] as const;
              return (
                <Link
                  key={step}
                  href={hrefs[index]}
                  className={`rounded-2xl border px-4 py-4 transition ${index === 0 ? "border-emerald-300 bg-emerald-50 hover:bg-emerald-100" : "border-slate-200 bg-slate-50 hover:bg-white"}`}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Step {index + 1}</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">{step}</div>
                </Link>
              );
            })}
          </div>
        </section>

        <ProgressMiniCards specs={[projects, upload, materials, quotes, orders]} />

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Status panels</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className={`rounded-3xl border p-5 ${statusClasses(projects.status).card}`}>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Projects</div>
                <p className="mt-3 text-sm text-slate-700">{isPending ? "Locked until admin approval is complete." : `${projects.progress}% complete. ${projects.nextStep}`}</p>
              </div>
              <div className={`rounded-3xl border p-5 ${statusClasses(upload.status).card}`}>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Upload</div>
                <p className="mt-3 text-sm text-slate-700">{isPending ? "Locked until admin approval is complete." : `${upload.progress}% complete. ${upload.nextStep}`}</p>
              </div>
              <div className={`rounded-3xl border p-5 ${statusClasses(materials.status).card}`}>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Materials</div>
                <p className="mt-3 text-sm text-slate-700">{isPending ? "Locked until admin approval is complete." : `${materials.progress}% complete. ${materials.nextStep}`}</p>
              </div>
              <div className={`rounded-3xl border p-5 ${statusClasses(quotes.status).card}`}>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Quote Review</div>
                <p className="mt-3 text-sm text-slate-700">{isPending ? "Locked until admin approval is complete." : `${quotes.progress}% complete. ${quotes.nextStep}`}</p>
              </div>
              <div className={`rounded-3xl border p-5 ${statusClasses(orders.status).card}`}>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Orders</div>
                <p className="mt-3 text-sm text-slate-700">{isPending ? "Locked until admin approval is complete." : `${orders.progress}% complete. ${orders.nextStep}`}</p>
              </div>
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">What is missing</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
              {(isPending
                ? [
                    "Admin approval",
                    "Approved-client actions",
                    "Project and order workflow access",
                  ]
                : dashboard.missing
              ).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Wireframe note</div>
              <p className="mt-2 leading-6">This dashboard rewrite stays UI-only. It should guide the client clearly without changing permissions, data, or runtime behavior.</p>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
