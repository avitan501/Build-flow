import Link from "next/link";

import { ProgressMiniCards, statusButtonClass, statusClasses } from "@/components/buildflow/wireframe";
import { requireSignedInProfile } from "@/lib/auth";
import { getBuildflowWireframeData } from "@/lib/buildflow-wireframe";

export default async function DashboardPage() {
  const { user, profile } = await requireSignedInProfile();
  const { specMap } = getBuildflowWireframeData();
  const dashboard = specMap.get("dashboard");
  const projects = specMap.get("projects");
  const upload = specMap.get("upload");
  const materials = specMap.get("materials");
  const orders = specMap.get("orders");
  const whatsapp = specMap.get("admin-whatsapp");

  if (!dashboard || !projects || !upload || !materials || !orders || !whatsapp) {
    throw new Error("Missing BuildFlow dashboard route data.");
  }

  const statusTone = statusClasses(dashboard.status);

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-900 sm:px-8 lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Client dashboard</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                Command center for the current client flow. Signed in as {user.email}. This is still a development skeleton, not a finished client portal.
              </p>
            </div>
            <div className="grid gap-3 sm:min-w-72">
              <span className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${statusTone.badge}`}>
                {dashboard.status}
              </span>
              <div className={`rounded-2xl border px-4 py-3 text-sm ${statusTone.card}`}>
                {dashboard.progress}% complete · {100 - dashboard.progress}% remaining
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status badge</div>
              <div className="mt-3 text-sm text-slate-700">{profile?.approval_status ?? "pending"} · role {profile?.role ?? "client"}</div>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Purpose</div>
              <div className="mt-3 text-sm text-slate-700">{dashboard.purpose}</div>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Missing to 100%</div>
              <div className="mt-3 text-sm text-slate-700">{dashboard.missing[0]}</div>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Next step</div>
              <div className="mt-3 text-sm text-slate-700">{dashboard.nextStep}</div>
            </article>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Main actions</h2>
              <p className="mt-1 text-sm text-slate-500">Folder / step workflow only. Preview and blocked areas stay visibly limited.</p>
            </div>
            <Link href="/admin/build-map" className="text-sm font-semibold text-slate-700 underline underline-offset-4">Back to Build Map</Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Link href="/projects" className={statusButtonClass(projects.status)}>My Projects</Link>
            <Link href="/upload" className={statusButtonClass(upload.status)}>Upload Plans</Link>
            <Link href={profile?.role === "admin" ? "/admin/whatsapp" : "/orders"} className={statusButtonClass(profile?.role === "admin" ? whatsapp.status : orders.status)}>
              WhatsApp Messages
            </Link>
            <Link href="/materials" className={statusButtonClass(materials.status)}>Materials</Link>
            <Link href="/orders" className={statusButtonClass(orders.status)}>Orders</Link>
            <button type="button" className={statusButtonClass(dashboard.status)}>Next Step</button>
          </div>
        </section>

        <ProgressMiniCards specs={[projects, upload, materials, orders]} />

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Status panels</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className={`rounded-3xl border p-5 ${statusClasses(projects.status).card}`}>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Projects</div>
                <p className="mt-3 text-sm text-slate-700">{projects.progress}% complete. {projects.nextStep}</p>
              </div>
              <div className={`rounded-3xl border p-5 ${statusClasses(upload.status).card}`}>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Upload</div>
                <p className="mt-3 text-sm text-slate-700">{upload.progress}% complete. {upload.nextStep}</p>
              </div>
              <div className={`rounded-3xl border p-5 ${statusClasses(materials.status).card}`}>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Materials</div>
                <p className="mt-3 text-sm text-slate-700">{materials.progress}% complete. {materials.nextStep}</p>
              </div>
              <div className={`rounded-3xl border p-5 ${statusClasses(orders.status).card}`}>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Orders</div>
                <p className="mt-3 text-sm text-slate-700">{orders.progress}% complete. {orders.nextStep}</p>
              </div>
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">What is missing</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
              {dashboard.missing.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            {profile?.role === "admin" ? (
              <Link href="/admin/users" className="mt-5 inline-flex items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
                Admin Users
              </Link>
            ) : null}
          </article>
        </section>
      </section>
    </main>
  );
}
