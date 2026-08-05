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

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

type ProjectsPageProps = {
  searchParams?: Promise<{ status?: string; show?: string }>
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
  const showAllProjects = params.show === "all"
  const displayedProjects = showAllProjects ? visibleProjects : visibleProjects.slice(0, 3)
  const showAllHref = selectedStatus === "all" ? "/projects?show=all" : `/projects?status=${selectedStatus}&show=all`
  const showRecentHref = selectedStatus === "all" ? "/projects" : `/projects?status=${selectedStatus}`
  const activeProjects = projectList.filter((project) => project.status === "active").length
  const draftProjects = projectList.filter((project) => project.status === "draft").length
  return (
    <main className="min-h-screen bg-[#f7f8fa] pb-28 text-[#101828] sm:pb-12">
      <section className="border-b border-[#eaecf0] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0066cc]">Project Workspace</p>
            <h1 className="mt-1 text-[2rem] font-semibold leading-tight text-[#101828] sm:text-[2.5rem]">Projects</h1>
          </div>
          <Link href="/projects/new" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-[#0676e8] px-4 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(6,118,232,0.2)] transition-[background-color,transform,box-shadow] hover:bg-[#005fc7] hover:shadow-[0_8px_20px_rgba(6,118,232,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066cc] focus-visible:ring-offset-2 active:scale-[0.98]">
            <PlusIcon />
            <span>New Project</span>
          </Link>
        </div>
      </section>

      {user ? (
        <section className="border-b border-[#eaecf0] bg-[#f7f8fa]">
          <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-8 lg:px-10">
            <nav aria-label="Filter projects by status" className="grid grid-cols-3 gap-1 rounded-[18px] border border-[#e4e7ec] bg-[#eef0f3] p-1">
              {[
                { href: "/projects?status=all", status: "all", label: "All", count: projectList.length },
                { href: "/projects?status=active", status: "active", label: "Active", count: activeProjects },
                { href: "/projects?status=draft", status: "draft", label: "Draft", count: draftProjects },
              ].map((item) => {
                const active = selectedStatus === item.status
                return (
                  <Link key={item.status} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-[3.75rem] min-w-0 flex-col items-center justify-center rounded-[14px] px-2 text-center transition-[background-color,box-shadow,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066cc] ${active ? "bg-white text-[#101828] shadow-[0_3px_10px_rgba(16,24,40,0.08)]" : "text-[#667085] hover:bg-white/60"}`}>
                    <span className="text-lg font-semibold tabular-nums leading-none">{item.count}</span>
                    <span className="mt-1 text-xs font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </section>
      ) : null}

      <section className="bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
          {user ? (
            <div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0066cc]">{selectedStatus === "all" ? "Latest activity" : `${selectedStatus} projects`}</p>
                  <h2 className="mt-1 text-xl font-semibold text-[#101828]">Recent Projects</h2>
                </div>
                <span className="text-xs text-[#667085]">{visibleProjects.length} total</span>
              </div>

              {visibleProjects.length > 0 ? (
                <div className="mt-4 grid gap-2">
              {displayedProjects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`} className="flex items-center justify-between gap-3 rounded-[16px] border border-[#e5e7eb] bg-white px-4 py-3 text-sm font-semibold text-[#101828] shadow-[0_5px_18px_rgba(16,24,40,0.04)] transition-[border-color,box-shadow,transform] hover:border-[#b9d7ff] hover:shadow-[0_8px_22px_rgba(16,24,40,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066cc] active:scale-[0.99]">
                  <span className="min-w-0">
                    <span className="block truncate">{project.name}</span>
                    {project.address && project.address.trim() !== project.name.trim() ? <span className="mt-0.5 block truncate text-xs font-normal text-slate-500">{project.address}</span> : null}
                  </span>
                  <span className="shrink-0 text-slate-400"><ChevronRightIcon /></span>
                </Link>
              ))}
              {visibleProjects.length > 3 ? (
                <Link href={showAllProjects ? showRecentHref : showAllHref} className="mt-1 inline-flex min-h-10 items-center justify-center rounded-full border border-[#d0d5dd] bg-white px-4 text-sm font-semibold text-[#0066cc] transition-colors hover:bg-[#f5f9ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066cc]">
                  {showAllProjects ? "Show recent projects" : `Show all ${visibleProjects.length} projects`}
                </Link>
              ) : null}
                </div>
              ) : (
                <div className="mt-4 rounded-[16px] border border-dashed border-[#d0d5dd] bg-[#f9fafb] px-4 py-8 text-center text-sm text-[#667085]">
                  No {selectedStatus === "all" ? "projects" : selectedStatus + " projects"} yet.
                </div>
              )}
            </div>
          ) : (
            <GuestProjectsPanel />
          )}
        </div>
      </section>
    </main>
  )
}
