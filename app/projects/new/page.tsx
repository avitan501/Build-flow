import Link from "next/link";

import { statusButtonClass } from "@/components/buildflow/wireframe";
import { requireSignedInProfile } from "@/lib/auth";
import { PROJECT_CREATION_ACTIVATION_MESSAGE, PROJECT_CREATION_STATUS_LABEL } from "@/lib/projects";

import { createProjectAction } from "./actions";

const steps = ["Start Project", "Upload Plans", "Review Materials", "Review Quote", "Track Order"] as const;

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  await requireSignedInProfile();
  const params = (await searchParams) ?? {};
  const errorMessage =
    params.error === "project-name-required"
      ? "Project name is required."
      : params.error === "create-failed"
        ? "Project could not be created right now."
        : null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#f8fbff_45%,#eef4fb_100%)] px-4 py-4 pb-28 text-slate-900 sm:px-8 sm:py-6 sm:pb-10 lg:px-10">
      <section className="mx-auto flex max-w-5xl flex-col gap-4">
        <section className="rounded-[30px] border border-sky-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,248,255,0.94))] p-5 shadow-[0_18px_40px_rgba(148,163,184,0.12)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Projects</p>
              <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2.6rem]">Start a project</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-[15px]">Add the essentials now. You can keep building the project after this step.</p>
            </div>
            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900 shadow-[0_10px_24px_rgba(16,185,129,0.08)] lg:max-w-xs">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Status</div>
              <p className="mt-2 leading-6">{PROJECT_CREATION_ACTIVATION_MESSAGE}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700">Signed-in client</span>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">Protected page</span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">{PROJECT_CREATION_STATUS_LABEL}</span>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.10)] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">New project</h2>
                <p className="mt-1 text-sm text-slate-500">Only the required details to get started.</p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                Required name
              </div>
            </div>

            <form action={createProjectAction} className="mt-5 space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/55 p-4">
                <label htmlFor="project-name" className="text-sm font-semibold text-slate-900">
                  Project name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="project-name"
                  name="name"
                  type="text"
                  required
                  placeholder="Example: Nassau Kitchen Refresh"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50/55 p-4">
                <label htmlFor="project-address" className="text-sm font-semibold text-slate-900">
                  Address
                </label>
                <textarea
                  id="project-address"
                  name="address"
                  rows={4}
                  placeholder="Project address or job location"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              {errorMessage ? (
                <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">Could not create project</div>
                  <p className="mt-1.5 leading-6">{errorMessage}</p>
                </div>
              ) : null}

              <div className="rounded-[22px] border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Live now</div>
                <p className="mt-1.5 leading-6">Project creation saves a real draft project right away.</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-sky-200 bg-[linear-gradient(180deg,#1d9bf0_0%,#1570ef_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(21,112,239,0.24)] transition hover:brightness-105"
                >
                  Create project
                </button>
                <Link href="/projects" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                  Back to Projects
                </Link>
              </div>
            </form>
          </article>

          <aside className="flex flex-col gap-4">
            <article className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.10)] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[1.05rem] font-semibold tracking-[-0.03em] text-slate-950">Project flow</h2>
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">5 steps</span>
              </div>
              <div className="mt-4 space-y-2.5">
                {steps.map((step, index) => (
                  <div
                    key={step}
                    className={`flex items-center gap-3 rounded-[20px] border px-3.5 py-3 ${
                      index === 0 ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-slate-50/80"
                    }`}
                  >
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        index === 0 ? "bg-white text-sky-700 shadow-sm" : "bg-white text-slate-500"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1 text-sm font-semibold text-slate-900">{step}</div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.10)] sm:p-6">
              <h2 className="text-[1.05rem] font-semibold tracking-[-0.03em] text-slate-950">Next action</h2>
              <div className="mt-4 grid gap-3">
                <div className={statusButtonClass("Coming Soon", true)}>Continue to Upload Plans</div>
              </div>
              <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Upload Plans stays available as the next step after the project is created.
              </div>
            </article>
          </aside>
        </section>
      </section>
    </main>
  );
}
