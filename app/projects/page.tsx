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

function ProjectsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="7" height="7" rx="1.5" />
      <rect x="14" y="4" width="7" height="7" rx="1.5" />
      <rect x="3" y="13" width="7" height="7" rx="1.5" />
      <rect x="14" y="13" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

function ToolIcon({ kind }: { kind: "materials" | "quotes" | "orders" }) {
  if (kind === "materials") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
        <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
        <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
        <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
      </svg>
    )
  }

  if (kind === "quotes") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4v16" />
        <path d="M16 7.5c0-1.4-1.8-2.5-4-2.5s-4 1.1-4 2.5 1.8 2.5 4 2.5 4 1.1 4 2.5-1.8 2.5-4 2.5-4-1.1-4-2.5" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 19 7v10l-7 4-7-4V7l7-4Z" />
      <path d="m3 7 9 5 9-5" />
      <path d="M12 12v9" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

export default async function ProjectsPage() {
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
  const recentProjects = projectList.slice(0, 4)
  const hasProjects = recentProjects.length > 0

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#eef6ff_45%,#ffffff_100%)] px-4 py-5 pb-28 text-slate-900 sm:px-8 sm:pb-10 lg:px-10 lg:pb-12">
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <section className="rounded-[32px] border border-sky-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(242,248,255,0.94))] p-5 shadow-[0_18px_42px_rgba(148,163,184,0.12)] sm:p-7">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Projects</p>
            <h1 className="mt-3 text-[2.15rem] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[3rem]">Your projects</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              Create a new project or open an existing workspace to manage plans, materials, quotes, and orders.
            </p>
          </div>

          <div className="mt-6 rounded-[30px] border border-sky-100 bg-white p-5 shadow-[0_16px_36px_rgba(148,163,184,0.12)] sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Primary action</p>
            <Link href="/projects/new" className="mt-4 flex w-full items-center justify-between gap-3 rounded-[24px] bg-[linear-gradient(180deg,#f6cf69_0%,#e9b846_100%)] px-4 py-4 text-slate-950 shadow-[0_16px_30px_rgba(220,168,69,0.22)] transition active:scale-[0.99] sm:px-5">
              <span className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-amber-800 shadow-[0_8px_18px_rgba(15,23,42,0.08)]">
                  <PlusIcon />
                </span>
                <span className="text-lg font-semibold tracking-[-0.03em]">Start New Project</span>
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-800">
                {PROJECT_CREATION_STATUS_LABEL}
              </span>
            </Link>
            <p className="mt-4 text-base leading-8 text-slate-600">Create a new job or continue from an existing workspace.</p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-[26px] border border-sky-100/90 bg-white p-5 shadow-[0_16px_40px_rgba(148,163,184,0.1)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">My Projects</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {hasProjects ? "Open one of your recent workspaces and keep the next step obvious." : "Start your first project to create a workspace."}
                </p>
              </div>
              {projectList.length > 4 ? <div className="text-sm font-semibold text-sky-700">View all projects</div> : null}
            </div>

            {hasProjects ? (
              <div className="mt-4 grid gap-3">
                {recentProjects.map((project) => (
                  <div key={project.id} className="rounded-[22px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.88))] p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-700">
                          <ProjectsIcon />
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{project.name}</div>
                          <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {formatProjectStatus(project.status)} · {formatProjectDate(project.created_at)}
                          </div>
                          {project.address ? <p className="mt-2 text-sm leading-6 text-slate-600">{project.address}</p> : null}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:items-end">
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                          Workspace
                        </span>
                        <Link href={`/projects/${project.id}`} className="inline-flex items-center justify-center rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_20px_rgba(148,163,184,0.08)] transition active:scale-[0.99]">
                          Open Workspace
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[22px] border border-dashed border-sky-200 bg-sky-50/70 p-5 text-sm text-slate-600">
                No projects yet. Start a new project to create your first workspace.
              </div>
            )}
          </section>

          <section className="rounded-[26px] border border-sky-100/90 bg-white p-5 shadow-[0_16px_40px_rgba(148,163,184,0.1)]">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Project tools</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Move into the next project-related action without leaving the hub.</p>
            </div>

            <div className="mt-4 grid gap-3">
              <Link href="/materials" className="flex items-center gap-3 rounded-[22px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.88))] p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition active:scale-[0.99]">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-700"><ToolIcon kind="materials" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900">Materials</div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Review material items</p>
                </div>
                <span className="text-slate-400"><ChevronRightIcon /></span>
              </Link>

              <Link href="/quotes" className="flex items-center gap-3 rounded-[22px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.88))] p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition active:scale-[0.99]">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700"><ToolIcon kind="quotes" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900">Quotes</div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Check pricing and approvals</p>
                </div>
                <span className="text-slate-400"><ChevronRightIcon /></span>
              </Link>

              <Link href="/orders" className="flex items-center gap-3 rounded-[22px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.88))] p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition active:scale-[0.99]">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700"><ToolIcon kind="orders" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900">Orders</div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Track approved orders</p>
                </div>
                <span className="text-slate-400"><ChevronRightIcon /></span>
              </Link>
            </div>
          </section>
        </section>
      </section>
    </main>
  )
}
