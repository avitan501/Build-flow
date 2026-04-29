import Link from "next/link";

import { RecoveryLinkHandler } from "@/components/auth/recovery-link-handler";
import { ProgressMiniCards, statusButtonClass, statusClasses } from "@/components/buildflow/wireframe";
import { getBuildflowWireframeData } from "@/lib/buildflow-wireframe";

const clientSteps = [
  "Dashboard",
  "Project",
  "Upload",
  "Materials",
  "Quote",
  "Orders",
] as const;

export default function Home() {
  const { specMap } = getBuildflowWireframeData();
  const home = specMap.get("home");
  const dashboard = specMap.get("dashboard");
  const buildMap = specMap.get("admin-build-map");
  const projects = specMap.get("projects");
  const upload = specMap.get("upload");
  const materials = specMap.get("materials");
  const quotes = specMap.get("quotes");
  const orders = specMap.get("orders");

  if (!home || !dashboard || !buildMap || !projects || !upload || !materials || !quotes || !orders) {
    throw new Error("Missing BuildFlow wireframe route data.");
  }

  const authTone = statusClasses(dashboard.status);
  const whatsappTone = statusClasses(specMap.get("admin-whatsapp")?.status || "Preview");
  const quotesTone = statusClasses(quotes.status);
  const ordersTone = statusClasses(orders.status);

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <RecoveryLinkHandler />
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-10 sm:px-8 lg:px-10">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">BuildFlow</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">BuildFlow guides every client from login to project setup, uploads, quote review, and final order tracking</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                Start on the homepage, move into the dashboard hub after login, then continue through project setup, uploads, materials, quote review, and order tracking.
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em]">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">Public / Client</span>
                <span className={`rounded-full border px-3 py-1 ${authTone.badge}`}>Client dashboard live</span>
                <span className={`rounded-full border px-3 py-1 ${quotesTone.badge}`}>Quote review preview</span>
                <span className={`rounded-full border px-3 py-1 ${ordersTone.badge}`}>Orders partial</span>
                <span className={`rounded-full border px-3 py-1 ${whatsappTone.badge}`}>WhatsApp ops separate</span>
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
              <h2 className="text-lg font-semibold">Homepage to order journey</h2>
              <p className="mt-1 text-sm text-slate-500">Show the full path clearly: Dashboard → Project → Upload → Materials → Quote → Orders.</p>
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
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Continue your project journey</h2>
              <p className="mt-1 text-sm text-slate-500">The homepage should send clients into the dashboard hub, then into the next clear BuildFlow step.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className="sm:col-span-2 xl:col-span-2">
              <Link href="/login" className="inline-flex w-full items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
                <span>Log in to Start Project</span>
              </Link>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Live access point. Login is required before project setup, uploads, and quote review.
              </p>
            </div>
            <div className="sm:col-span-2 xl:col-span-2">
              <Link href="/demo/client-flow" className="inline-flex w-full items-center justify-center rounded-2xl border border-sky-300 bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-600">
                <span>View Demo Client Flow</span>
              </Link>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Demo preview only. Public wireframe for testing the journey without real client data.
              </p>
            </div>
            <Link href="/dashboard" className={statusButtonClass(dashboard.status)}>
              <span>Dashboard Hub</span>
              <span className="ml-2 text-[11px] uppercase tracking-[0.16em] opacity-85">{dashboard.status}</span>
            </Link>
            <Link href="/projects/new" className={statusButtonClass(projects.status, projects.status === "Coming Soon")}>
              <span>Start New Project</span>
              <span className="ml-2 text-[11px] uppercase tracking-[0.16em] opacity-85">{projects.status}</span>
            </Link>
            <Link href="/upload" className={statusButtonClass(upload.status, upload.status === "Coming Soon")}>
              <span>Upload Plans</span>
              <span className="ml-2 text-[11px] uppercase tracking-[0.16em] opacity-85">{upload.status}</span>
            </Link>
            <Link href="/materials" className={statusButtonClass(materials.status, materials.status === "Coming Soon")}>
              <span>Review Materials</span>
              <span className="ml-2 text-[11px] uppercase tracking-[0.16em] opacity-85">{materials.status}</span>
            </Link>
            <Link href="/quotes" className={statusButtonClass(quotes.status, quotes.status === "Coming Soon")}>
              <span>Review Quote</span>
              <span className="ml-2 text-[11px] uppercase tracking-[0.16em] opacity-85">{quotes.status}</span>
            </Link>
            <Link href="/orders" className={statusButtonClass(orders.status, orders.status === "Coming Soon")}>
              <span>Track Order</span>
              <span className="ml-2 text-[11px] uppercase tracking-[0.16em] opacity-85">{orders.status}</span>
            </Link>
          </div>
        </section>

        <ProgressMiniCards specs={[dashboard, projects, upload, quotes, orders]} />

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Client Flow</div>
            <h2 className="mt-2 text-lg font-semibold">For customers and project teams</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Every page should clearly point to the next step in the portal journey.</p>
          </article>
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Admin / Ops</div>
            <h2 className="mt-2 text-lg font-semibold">Kept separate from the client path</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Internal control screens should not compete with client onboarding or project actions.</p>
          </article>
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Delivery tracking</div>
            <h2 className="mt-2 text-lg font-semibold">The final client reassurance step</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">The journey should end with status clarity, not uncertainty after approval.</p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Access points</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href="/projects/new" className="inline-flex items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
                Start Project
              </Link>
              <Link href="/dashboard" className={statusButtonClass(dashboard.status)}>
                Client Dashboard
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                Log In
              </Link>
              <Link href="/signup" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                Create Account
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
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Wireframe note</div>
              <p className="mt-2 leading-6">This remains a safe UI rewrite only. It should clarify the journey without changing auth, database behavior, or admin runtime.</p>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
