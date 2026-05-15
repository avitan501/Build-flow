import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSignedInProfile } from "@/lib/auth";
import type { ProjectEventRecord, ProjectRecord } from "@/lib/projects";

function formatProjectDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatProjectTimelineDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatProjectStatus(status: ProjectRecord["status"]) {
  if (status === "active") return "Active";
  if (status === "archived") return "Archived";
  return "Draft";
}

type ProjectStepStatus = "Live" | "Partial Live" | "Coming Soon";

function getStepStatusClass(status: ProjectStepStatus) {
  if (status === "Partial Live") {
    return "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100";
  }

  if (status === "Coming Soon") {
    return "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100";
}

const nextSteps = (projectId: string) => [
  { title: "Upload Plans", status: "Live", href: `/upload?projectId=${projectId}` },
  { title: "Materials", status: "Live", href: "/shop" },
  { title: "Quote", status: "Live", href: `/quotes?projectId=${projectId}` },
  { title: "Orders", status: "Partial Live", href: `/orders?projectId=${projectId}` },
] as const;

export default async function ProjectWorkspacePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { supabase, user } = await requireSignedInProfile();

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, owner_id, name, address, status, created_at, updated_at")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle<ProjectRecord>();

  if (error || !project) {
    notFound();
  }

  const { data: timelineEvents } = await supabase
    .from("project_events")
    .select("id, project_id, owner_id, event_type, source, title, description, metadata, created_at")
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .returns<ProjectEventRecord[]>();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#f8fbff_45%,#eef4fb_100%)] px-4 py-4 pb-28 text-slate-900 sm:px-8 sm:py-6 sm:pb-10 lg:px-10">
      <section className="mx-auto flex max-w-6xl flex-col gap-4">
        <section className="rounded-[30px] border border-sky-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,248,255,0.94))] p-5 shadow-[0_18px_40px_rgba(148,163,184,0.12)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Project</p>
              <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2.7rem]">{project.name}</h1>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700">{formatProjectStatus(project.status)}</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">Created {formatProjectDate(project.created_at)}</span>
                {project.updated_at !== project.created_at ? (
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">Updated {formatProjectDate(project.updated_at)}</span>
                ) : null}
              </div>
            </div>
            <Link
              href="/projects"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_8px_18px_rgba(148,163,184,0.08)] transition hover:bg-slate-50"
            >
              Back to Projects
            </Link>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.10)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Project details</h2>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Overview</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Status</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{formatProjectStatus(project.status)}</div>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Started</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{formatProjectDate(project.created_at)}</div>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 sm:col-span-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Address</div>
                <div className="mt-2 text-sm leading-6 font-semibold text-slate-900">{project.address || "No address added yet."}</div>
              </div>
            </div>
          </article>

          <aside className="flex flex-col gap-4">
            <article className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.10)] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Next actions</h2>
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workflow</span>
              </div>
              <div className="mt-4 grid gap-3">
                {nextSteps(project.id).map((step, index) => (
                  <Link
                    key={step.title}
                    href={step.href}
                    className={`flex items-center justify-between gap-3 rounded-[22px] border px-4 py-3.5 text-sm font-semibold transition ${getStepStatusClass(step.status)}`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-xs font-semibold text-slate-700 shadow-sm">{index + 1}</span>
                      <span>{step.title}</span>
                    </span>
                    <span className="text-[11px] uppercase tracking-[0.16em] opacity-85">{step.status}</span>
                  </Link>
                ))}
              </div>
            </article>

            <article className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.10)] sm:p-6">
              <h2 className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Project activity</h2>
              <p className="mt-1 text-sm text-slate-500">Latest updates for this project.</p>
              <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {timelineEvents && timelineEvents.length > 0 ? `${timelineEvents.length} update${timelineEvents.length === 1 ? "" : "s"} available below.` : "No updates yet."}
              </div>
            </article>
          </aside>
        </section>

        <section className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.10)] sm:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Timeline</h2>
              <p className="text-sm text-slate-500">Recent project updates.</p>
            </div>
          </div>

          {timelineEvents && timelineEvents.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {timelineEvents.map((event) => (
                <article key={event.id} className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900">{event.title}</h3>
                      {event.description ? <p className="mt-1.5 text-sm leading-6 text-slate-600">{event.description}</p> : null}
                    </div>
                    <div className="shrink-0 text-xs font-medium text-slate-500">{formatProjectTimelineDate(event.created_at)}</div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No timeline events yet.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
