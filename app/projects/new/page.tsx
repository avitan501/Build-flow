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
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-900 sm:px-8 lg:px-10">
      <section className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Client Portal Flow</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Start a New Project</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                Create the project shell now with the minimum details, then continue into later workflow steps as those screens become fully active.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">Signed-in client</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">{PROJECT_CREATION_STATUS_LABEL}</span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">Protected client page</span>
              </div>
            </div>
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 sm:min-w-80">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Project creation</div>
              <p className="mt-3 text-sm leading-6">{PROJECT_CREATION_ACTIVATION_MESSAGE}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">Client journey</h2>
            <p className="mt-1 text-sm text-slate-500">Keep the next step obvious: start the project now, then continue to upload plans later.</p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {steps.map((step, index) => (
              <div key={step} className={`rounded-2xl border px-4 py-4 ${index === 0 ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Step {index + 1}</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{step}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Project setup form</h2>
            <p className="mt-1 text-sm text-slate-500">Use the minimum project details now. Upload and later workflow features stay preview or coming soon.</p>

            <form action={createProjectAction} className="mt-5 space-y-4">
              <div>
                <label htmlFor="project-name" className="text-sm font-semibold text-slate-900">
                  Project name
                </label>
                <input
                  id="project-name"
                  name="name"
                  type="text"
                  required
                  placeholder="Example: Nassau Kitchen Refresh"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </div>

              <div>
                <label htmlFor="project-address" className="text-sm font-semibold text-slate-900">
                  Address
                </label>
                <textarea
                  id="project-address"
                  name="address"
                  rows={4}
                  placeholder="Project address or job location"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </div>

              {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">Could not create project</div>
                  <p className="mt-2 leading-6">{errorMessage}</p>
                </div>
              ) : null}

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Live now</div>
                <p className="mt-2 leading-6">Project creation now saves a real draft project. Upload and later screens still stay preview or coming soon.</p>
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                Create Project
              </button>
            </form>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Next actions</h2>
            <div className="mt-4 grid gap-3">
              <div className={statusButtonClass("Coming Soon", true)}>Continue to Upload Plans</div>
              <Link href="/projects" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                Back to Projects
              </Link>
            </div>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">What happens later</div>
              <p className="mt-2 leading-6">After the project is created, the next meaningful milestone is Upload Plans, which remains clearly labeled as a future step.</p>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
