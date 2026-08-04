import Link from "next/link";

import { GuestProjectForm } from "@/components/buildflow/guest-project-form";
import { getSessionWithProfile } from "@/lib/auth";

import { createProjectAction } from "./actions";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; next?: string }>;
}) {
  const { user } = await getSessionWithProfile();
  const params = (await searchParams) ?? {};
  const nextPath = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/shop";
  const errorMessage =
    params.error === "project-name-required"
      ? "Project name is required."
      : params.error === "create-failed"
        ? "Project could not be created right now."
        : null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#f8fbff_45%,#eef4fb_100%)] px-4 py-5 pb-28 text-slate-900 sm:px-8 sm:py-8">
      <section className="mx-auto max-w-2xl">
        {user ? (
          <form action={createProjectAction} className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-[0_18px_42px_rgba(148,163,184,0.12)] sm:p-7">
          <input type="hidden" name="next" value={nextPath} />
          <div>
            <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2.4rem]">Start New Project</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Add the basic job details. You can upload plans and add materials after the project is created.</p>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="project-name" className="text-sm font-semibold text-slate-900">
                Project name <span className="text-rose-500">*</span>
              </label>
              <input
                id="project-name"
                name="name"
                type="text"
                required
                placeholder="Example: Smith kitchen renovation"
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
            </div>

            <div>
              <label htmlFor="project-address" className="text-sm font-semibold text-slate-900">
                Project address
              </label>
              <textarea
                id="project-address"
                name="address"
                rows={3}
                placeholder="Street, city, state"
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f6cf69_0%,#e9b846_100%)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_14px_28px_rgba(220,168,69,0.22)] transition active:scale-[0.99]"
            >
              Create Project
            </button>
            <Link href={nextPath} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition active:scale-[0.99]">
              Cancel
            </Link>
          </div>
        </form>
        ) : (
          <GuestProjectForm nextPath={nextPath} errorMessage={errorMessage} />
        )}
      </section>
    </main>
  );
}
