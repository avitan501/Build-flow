import Link from "next/link"

import { GuestProjectsPanel } from "@/components/buildflow/guest-projects-panel"
import { getSessionWithProfile } from "@/lib/auth"
import { type ProjectRecord } from "@/lib/projects"

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

function FolderOverviewIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20" />
      <path d="M6.5 22A2.5 2.5 0 0 1 4 19.5V6a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v3" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12 2.2 2.2 4.8-4.8" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
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

type ProjectsPageProps = {
  searchParams?: Promise<{ status?: string }>
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = (await searchParams) ?? {}
  const selectedStatus = params.status === "active" || params.status === "draft" ? params.status : "all"
  const { supabase, user } = await getSessionWithProfile()
  let projectList: ProjectRecord[] = []

  if (user) {
    const { data: projectRows, error: projectsError } = await supabase
      .from("projects")
      .select("id, owner_id, name, address, status, created_at, updated_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .returns<ProjectRecord[]>()

    if (projectsError) {
      throw new Error("Failed to load projects.")
    }

    projectList = projectRows ?? []
  }
  const visibleProjects = selectedStatus === "all" ? projectList : projectList.filter((project) => project.status === selectedStatus)
  const activeProjects = projectList.filter((project) => project.status === "active").length
  const draftProjects = projectList.filter((project) => project.status === "draft").length
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff7ff_0%,#f8fbff_42%,#eef5fc_100%)] px-4 py-4 pb-28 text-slate-900 sm:px-8 sm:pb-10 lg:px-10 lg:pb-12">
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <section className="rounded-[32px] border border-sky-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(242,248,255,0.94))] p-5 shadow-[0_18px_42px_rgba(148,163,184,0.12)] sm:p-7">
          <Link href="/projects/new" className="flex w-full items-center justify-center gap-3 rounded-[24px] bg-[linear-gradient(180deg,#f6cf69_0%,#e9b846_100%)] px-5 py-4 text-lg font-semibold tracking-[-0.03em] text-slate-950 shadow-[0_16px_30px_rgba(220,168,69,0.22)] transition active:scale-[0.99] sm:w-auto sm:self-start sm:px-7">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-amber-800 shadow-[0_8px_18px_rgba(15,23,42,0.08)]">
              <PlusIcon />
            </span>
            <span>Start New Project</span>
          </Link>

          <div className="mt-8">
            <h2 className="text-[1.9rem] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[2rem]">Overview</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Link href="/projects?status=all" className={`flex items-center gap-3 rounded-[24px] border bg-white p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition active:scale-[0.99] ${selectedStatus === "all" ? "border-sky-300 ring-2 ring-sky-100" : "border-sky-100"}`}>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-700"><FolderOverviewIcon /></span>
                <div className="flex-1">
                  <div className="text-[2rem] font-semibold leading-none tracking-[-0.05em] text-slate-950">{projectList.length}</div>
                  <div className="mt-1 text-sm text-slate-500">Total</div>
                </div>
                <span className="text-slate-400"><ChevronRightIcon /></span>
              </Link>

              <Link href="/projects?status=active" className={`flex items-center gap-3 rounded-[24px] border bg-white p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition active:scale-[0.99] ${selectedStatus === "active" ? "border-emerald-300 ring-2 ring-emerald-100" : "border-sky-100"}`}>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700"><CheckIcon /></span>
                <div className="flex-1">
                  <div className="text-[2rem] font-semibold leading-none tracking-[-0.05em] text-slate-950">{activeProjects}</div>
                  <div className="mt-1 text-sm text-slate-500">Active</div>
                </div>
                <span className="text-slate-400"><ChevronRightIcon /></span>
              </Link>

              <Link href="/projects?status=draft" className={`flex items-center gap-3 rounded-[24px] border bg-white p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition active:scale-[0.99] ${selectedStatus === "draft" ? "border-amber-300 ring-2 ring-amber-100" : "border-sky-100"}`}>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700"><FileIcon /></span>
                <div className="flex-1">
                  <div className="text-[2rem] font-semibold leading-none tracking-[-0.05em] text-slate-950">{draftProjects}</div>
                  <div className="mt-1 text-sm text-slate-500">Draft</div>
                </div>
                <span className="text-slate-400"><ChevronRightIcon /></span>
              </Link>
            </div>
          </div>

          {user && visibleProjects.length > 0 ? (
            <div className="mt-5 grid gap-2">
              {visibleProjects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`} className="flex items-center justify-between gap-3 rounded-[20px] border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_8px_18px_rgba(148,163,184,0.06)] transition active:scale-[0.99]">
                  <span className="truncate">{project.name}</span>
                  <span className="shrink-0 text-slate-400"><ChevronRightIcon /></span>
                </Link>
              ))}
            </div>
          ) : null}

          {!user ? (
            <div className="mt-5">
              <GuestProjectsPanel />
            </div>
          ) : null}
        </section>
      </section>
    </main>
  )
}
