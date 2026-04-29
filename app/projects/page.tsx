import Link from "next/link";

import { requireSignedInProfile } from "@/lib/auth";

const journeySteps = ["Project", "Upload", "Materials", "Quote", "Orders"] as const;

const previewProjects = [
  {
    name: "Nassau Kitchen Refresh",
    status: "Preview project",
    nextStep: "Upload Plans",
  },
  {
    name: "Garden Apartment Buildout",
    status: "Demo content",
    nextStep: "Review Materials",
  },
] as const;

export default async function ProjectsPage() {
  await requireSignedInProfile();

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-900 sm:px-8 lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Client Projects</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">My BuildFlow Projects</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                Manage your projects, upload plans, review materials, approve quotes, and track orders.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">Signed-in client</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">Projects hub</span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">Protected client page</span>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:min-w-80">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Primary action</div>
              <Link
                href="/projects/new"
                className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                Start New Project
              </Link>
              <p className="mt-3 text-sm leading-6 text-slate-600">Use this page as the place to start a project or jump into the next step.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">Journey reminder</h2>
            <p className="mt-1 text-sm text-slate-500">Keep the next client step obvious from the projects overview.</p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {journeySteps.map((step, index) => (
              <div key={step} className={`rounded-2xl border px-4 py-4 ${index === 0 ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Step {index + 1}</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{step}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Project list preview</h2>
            <p className="mt-1 text-sm text-slate-500">Placeholder cards stay clearly marked as preview content until real project data is connected.</p>
            <div className="mt-5 grid gap-3">
              {previewProjects.map((project) => (
                <div key={project.name} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{project.name}</div>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{project.status}</div>
                    </div>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                      Next: {project.nextStep}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Next actions</h2>
            <div className="mt-4 grid gap-3">
              <Link href="/projects/new" className="inline-flex items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
                Start New Project
              </Link>
              <Link href="/upload" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                Upload Plans
              </Link>
              <Link href="/materials" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                Review Materials
              </Link>
              <Link href="/quotes" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                Review Quote
              </Link>
              <Link href="/orders" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                Track Orders
              </Link>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
