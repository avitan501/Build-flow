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

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h10" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="m18.5 3 .6 1.9L21 5.5l-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6.6-1.9Z" />
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

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  )
}

function QuotesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v16" />
      <path d="M16 7.5c0-1.4-1.8-2.5-4-2.5s-4 1.1-4 2.5 1.8 2.5 4 2.5 4 1.1 4 2.5-1.8 2.5-4 2.5-4-1.1-4-2.5" />
    </svg>
  )
}

function OrdersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 19 7v10l-7 4-7-4V7l7-4Z" />
      <path d="m3 7 9 5 9-5" />
      <path d="M12 12v9" />
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

function HeaderAction({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition active:scale-[0.98]"
    >
      {children}
    </Link>
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
  const recentProjects = projectList.slice(0, 3)
  const hasProjects = recentProjects.length > 0
  const activeProjects = projectList.filter((project) => project.status === "active").length
  const draftProjects = projectList.filter((project) => project.status === "draft").length
  const leadProjectId = recentProjects[0]?.id
  const materialsHref = leadProjectId ? `/materials?projectId=${leadProjectId}` : "/materials"
  const quotesHref = leadProjectId ? `/quotes?projectId=${leadProjectId}` : "/quotes"
  const ordersHref = leadProjectId ? `/orders?projectId=${leadProjectId}` : "/orders"

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff7ff_0%,#f8fbff_42%,#eef5fc_100%)] px-4 py-4 pb-28 text-slate-900 sm:px-8 sm:pb-10 lg:px-10 lg:pb-12">
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <section className="rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(239,246,255,0.9))] p-4 shadow-[0_20px_50px_rgba(148,163,184,0.12)] sm:p-5">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-800 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition active:scale-[0.98]">
              <MenuIcon />
            </Link>
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[22px] border border-sky-100 bg-white px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#173d88_0%,#0e2341_100%)] text-lg font-semibold text-white shadow-[0_10px_20px_rgba(14,35,65,0.18)]">
                BF
              </div>
              <div className="min-w-0">
                <p className="truncate text-[1.05rem] font-semibold tracking-[-0.03em] text-slate-950">BuildFlow</p>
                <p className="truncate text-[12px] text-slate-500">Construction materials + project flow</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HeaderAction href="/search">
                <SearchIcon />
              </HeaderAction>
              <HeaderAction href="/dashboard">
                <UserIcon />
              </HeaderAction>
              <HeaderAction href="/ai">
                <div className="relative flex items-center justify-center">
                  <span className="text-lg font-semibold text-slate-900">AI</span>
                  <span className="absolute -right-1 -top-1 text-[10px] text-fuchsia-500">✦</span>
                </div>
              </HeaderAction>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-sky-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(242,248,255,0.94))] p-5 shadow-[0_18px_42px_rgba(148,163,184,0.12)] sm:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Projects</p>
          <h1 className="mt-3 text-[2.2rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[3rem]">Your projects</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Create a new project or open an existing workspace to manage plans, materials, quotes, and orders.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.18em]">
            <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-600 shadow-[0_8px_20px_rgba(148,163,184,0.08)]">Client</span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700 shadow-[0_8px_20px_rgba(148,163,184,0.08)]">Projects Hub</span>
          </div>

          <div className="mt-6 rounded-[30px] border border-sky-100 bg-white p-5 shadow-[0_16px_36px_rgba(148,163,184,0.12)] sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Primary Action</p>
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

          <div className="mt-8 flex items-center justify-between gap-3">
            <h2 className="text-[1.9rem] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[2rem]">My projects</h2>
            {projectList.length > 3 ? (
              <Link href="/projects/all" className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700">
                View all projects <ChevronRightIcon />
              </Link>
            ) : null}
          </div>

          {hasProjects ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {recentProjects.map((project) => (
                <div key={project.id} className="rounded-[24px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.88))] p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-700">
                      <GridIcon />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[1.05rem] font-semibold tracking-[-0.03em] text-slate-950">{project.name}</div>
                      <div className="mt-1 text-[12px] text-slate-500">
                        {formatProjectStatus(project.status)} · {formatProjectDate(project.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Workspace
                  </div>
                  <Link href={`/projects/${project.id}`} className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_20px_rgba(148,163,184,0.08)] transition active:scale-[0.99]">
                    Open Workspace
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[24px] border border-dashed border-sky-200 bg-sky-50/70 p-5 text-sm text-slate-600">
              No projects yet. Start a new project to create your first workspace.
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-[1.9rem] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[2rem]">Project tools</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Link href={materialsHref} className="flex items-center gap-3 rounded-[24px] border border-sky-100 bg-white p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition active:scale-[0.99]">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-700"><GridIcon /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[1.02rem] font-semibold tracking-[-0.03em] text-slate-950">Materials</div>
                  <p className="mt-1 text-sm leading-5 text-slate-500">Review material items</p>
                </div>
                <span className="text-slate-400"><ChevronRightIcon /></span>
              </Link>

              <Link href={quotesHref} className="flex items-center gap-3 rounded-[24px] border border-sky-100 bg-white p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition active:scale-[0.99]">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700"><QuotesIcon /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[1.02rem] font-semibold tracking-[-0.03em] text-slate-950">Quotes</div>
                  <p className="mt-1 text-sm leading-5 text-slate-500">Check pricing</p>
                </div>
                <span className="text-slate-400"><ChevronRightIcon /></span>
              </Link>

              <Link href={ordersHref} className="flex items-center gap-3 rounded-[24px] border border-sky-100 bg-white p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition active:scale-[0.99]">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"><OrdersIcon /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[1.02rem] font-semibold tracking-[-0.03em] text-slate-950">Orders</div>
                  <p className="mt-1 text-sm leading-5 text-slate-500">Track approved orders</p>
                </div>
                <span className="text-slate-400"><ChevronRightIcon /></span>
              </Link>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-[1.9rem] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[2rem]">Overview</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="flex items-center gap-3 rounded-[24px] border border-sky-100 bg-white p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-700"><FolderOverviewIcon /></span>
                <div className="flex-1">
                  <div className="text-[2rem] font-semibold leading-none tracking-[-0.05em] text-slate-950">{projectList.length}</div>
                  <div className="mt-1 text-sm text-slate-500">Total</div>
                </div>
                <span className="text-slate-400"><ChevronRightIcon /></span>
              </div>

              <div className="flex items-center gap-3 rounded-[24px] border border-sky-100 bg-white p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700"><CheckIcon /></span>
                <div className="flex-1">
                  <div className="text-[2rem] font-semibold leading-none tracking-[-0.05em] text-slate-950">{activeProjects}</div>
                  <div className="mt-1 text-sm text-slate-500">Active</div>
                </div>
                <span className="text-slate-400"><ChevronRightIcon /></span>
              </div>

              <div className="flex items-center gap-3 rounded-[24px] border border-sky-100 bg-white p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700"><FileIcon /></span>
                <div className="flex-1">
                  <div className="text-[2rem] font-semibold leading-none tracking-[-0.05em] text-slate-950">{draftProjects}</div>
                  <div className="mt-1 text-sm text-slate-500">Draft</div>
                </div>
                <span className="text-slate-400"><ChevronRightIcon /></span>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}
