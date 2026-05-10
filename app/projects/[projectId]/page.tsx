import Link from "next/link";
import { notFound } from "next/navigation";

import { PremiumBackLink, PremiumBadge, PremiumHero, PremiumInfoCard, PremiumMutedPanel, PremiumPageShell, PremiumSection } from "@/components/buildflow/premium-page";
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

type ProjectStepStatus = "Live" | "Partial Live";

function getStepTone(status: ProjectStepStatus) {
  return status === "Partial Live" ? "amber" as const : "emerald" as const;
}

const nextSteps = (projectId: string) => [
  { title: "Upload Plans", status: "Live", href: `/upload?projectId=${projectId}` },
  { title: "Materials", status: "Live", href: `/materials?projectId=${projectId}` },
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
    <PremiumPageShell maxWidth="max-w-6xl">
      <PremiumHero
        eyebrow="Project workspace"
        title={project.name}
        description="Review project details, stay aligned on the next step, and move smoothly through your client workflow."
        badges={
          <>
            <PremiumBadge>{formatProjectStatus(project.status)}</PremiumBadge>
            <PremiumBadge tone="emerald">Created {formatProjectDate(project.created_at)}</PremiumBadge>
          </>
        }
        aside={<PremiumBackLink href="/projects">Back to Projects</PremiumBackLink>}
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <PremiumSection title="Project details" description="Core project information stays visible here before you take the next action.">
          <div className="grid gap-4 sm:grid-cols-2">
            <PremiumInfoCard label="Project name" value={project.name} />
            <PremiumInfoCard label="Status" value={formatProjectStatus(project.status)} />
            <PremiumInfoCard label="Address" value={project.address || "No address added yet."} spanTwo />
            <PremiumInfoCard label="Created date" value={formatProjectDate(project.created_at)} />
            <PremiumInfoCard label="Last updated" value={formatProjectDate(project.updated_at)} />
          </div>
        </PremiumSection>

        <PremiumSection title="Next steps" description="Each step below takes you directly into the live client workflow.">
          <div className="grid gap-3">
            {nextSteps(project.id).map((step) => (
              <Link key={step.title} href={step.href} className="inline-flex items-center justify-between rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition active:scale-[0.99]">
                <span>{step.title}</span>
                <PremiumBadge tone={getStepTone(step.status)}>{step.status}</PremiumBadge>
              </Link>
            ))}
          </div>
        </PremiumSection>
      </div>

      <PremiumSection title="Workflow overview" description="A simple view of what is available for this project right now.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {nextSteps(project.id).map((step) => (
            <div key={step.title} className="rounded-[24px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.84))] p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">{step.title}</div>
                <PremiumBadge tone={getStepTone(step.status)}>{step.status}</PremiumBadge>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {step.title === "Orders"
                  ? "Order creation is available, while tracking and downstream delivery updates are still being finished."
                  : `Open ${step.title.toLowerCase()} to continue this project.`}
              </p>
            </div>
          ))}
        </div>
      </PremiumSection>

      <PremiumSection title="Project timeline" description="Recent project activity appears here as your workflow moves forward.">
        {timelineEvents && timelineEvents.length > 0 ? (
          <div className="grid gap-4">
            {timelineEvents.map((event) => (
              <article key={event.id} className="rounded-[24px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.84))] p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{event.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                      <PremiumBadge>{event.source}</PremiumBadge>
                      <PremiumBadge tone="sky">{event.event_type}</PremiumBadge>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-slate-500">{formatProjectTimelineDate(event.created_at)}</div>
                </div>
                {event.description ? <p className="mt-3 text-sm leading-6 text-slate-600">{event.description}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <PremiumMutedPanel>No timeline events yet.</PremiumMutedPanel>
        )}
      </PremiumSection>
    </PremiumPageShell>
  );
}
