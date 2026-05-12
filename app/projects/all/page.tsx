import Link from "next/link"

import { requireSignedInProfile } from "@/lib/auth"
import { PROJECT_CREATION_STATUS_LABEL, type ProjectRecord } from "@/lib/projects"

function formatProjectDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatProjectStatus(status: ProjectRecord["status"]) {
  if (status === "active") return "Active"
  if (status === "archived") return "Archived"
  return "Draft"
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

export default async function AllProjectsPage() {
  const { supabase, user } = await requireSignedInProfile()

  const { data: projectRows, error: projectsError } = await supabase
    .from("projects")
    .select("id, owner_id, name, address, status, created_at, updated_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .returns<ProjectRecord[]>()

  if (projectsError) {
    throw new Error("Failed to load projects.")
  }

  const projectList = projectRows ?? []
  const hasProjects = projectList.length > 0

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff7ff_0%,#f8fbff_42%,#eef5fc_100%)] px-4 py-4 pb-28 text-slate-900 sm:px-8 sm:pb-10 lg:px-10 lg:pb-12">
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <section className="rounded-[32px] border border-sky-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(242,248,255,0.94))] p-5 shadow-[0_18px_42px_rgba(148,163,184,0.12)] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Projects</p>
              <h1 className="mt-3 text-[2.1rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2.7rem]">All Projects</h1>
              <p className="mt-4 text-base leading-8 text-slate-600">View every project and open the right workspace when you are ready.</p>
            </div>
            <Link href="/projects" className="inline-flex items-center gap-2 rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_20px_rgba(148,163,184,0.08)] transition active:scale-[0.99]">
              <ChevronLeftIcon />
              Back to Projects
            </Link>
          </div>
        </section>

        {hasProjects ? (
          <section className="grid gap-4">
            {projectList.map((project) => {
              const workspaceHref = `/projects/${project.id}`
              const uploadHref = `/upload?projectId=${project.id}`
              const materialsHref = `/materials?projectId=${project.id}`
              const quotesHref = `/quotes?projectId=${project.id}`
              const ordersHref = `/orders?projectId=${project.id}`

              return (
                <article key={project.id} className="rounded-[28px] border border-sky-100/90 bg-white p-5 shadow-[0_16px_40px_rgba(148,163,184,0.1)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-700">
                        <FolderIcon />
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold tracking-[-0.03em] text-slate-950">{project.name}</h2>
                        <p className="mt-1 text-sm font-medium text-slate-500">{formatProjectStatus(project.status)} · Created {formatProjectDate(project.created_at)}</p>
                        {project.address ? <p className="mt-2 text-sm leading-6 text-slate-600">{project.address}</p> : null}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 lg:min-w-[12rem] lg:items-end">
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                        Workspace
                      </span>
                      <Link href={workspaceHref} className="inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_30px_rgba(220,168,69,0.22)] transition active:scale-[0.99] lg:w-auto">
                        Open Workspace
                      </Link>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={uploadHref} className="inline-flex items-center justify-center rounded-full border border-sky-100 bg-sky-50/70 px-4 py-2 text-sm font-semibold text-sky-700 transition active:scale-[0.99]">
                      Upload
                    </Link>
                    <Link href={materialsHref} className="inline-flex items-center justify-center rounded-full border border-sky-100 bg-sky-50/70 px-4 py-2 text-sm font-semibold text-sky-700 transition active:scale-[0.99]">
                      Materials
                    </Link>
                    <Link href={quotesHref} className="inline-flex items-center justify-center rounded-full border border-emerald-100 bg-emerald-50/80 px-4 py-2 text-sm font-semibold text-emerald-700 transition active:scale-[0.99]">
                      Quote
                    </Link>
                    <Link href={ordersHref} className="inline-flex items-center justify-center rounded-full border border-amber-100 bg-amber-50/80 px-4 py-2 text-sm font-semibold text-amber-700 transition active:scale-[0.99]">
                      Orders
                    </Link>
                  </div>
                </article>
              )
            })}
          </section>
        ) : (
          <section className="rounded-[28px] border border-sky-100/90 bg-white p-6 shadow-[0_16px_40px_rgba(148,163,184,0.1)]">
            <h2 className="text-xl font-semibold text-slate-950">No projects yet.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Create your first project to begin your workspace.</p>
            <Link href="/projects/new" className="mt-4 inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_30px_rgba(220,168,69,0.22)] transition active:scale-[0.99]">
              <span>Start New Project</span>
              <span className="ml-2 text-[11px] uppercase tracking-[0.16em] opacity-80">{PROJECT_CREATION_STATUS_LABEL}</span>
            </Link>
          </section>
        )}
      </section>
    </main>
  )
}
