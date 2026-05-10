import { notFound } from "next/navigation";

import { PremiumActionTile, PremiumBackLink, PremiumBadge, PremiumHero, PremiumIconBadge, PremiumInfoCard, PremiumMutedPanel, PremiumPageShell, PremiumSection } from "@/components/buildflow/premium-page";
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

function StepIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>;
}

const workflowSteps = (projectId: string) => [
  { title: "Upload Plans", status: "Live", href: `/upload?projectId=${projectId}`, detail: "Add plans and supporting files for this project." },
  { title: "Materials", status: "Live", href: `/materials?projectId=${projectId}`, detail: "Review and add material items tied to this workspace." },
  { title: "Quote", status: "Live", href: `/quotes?projectId=${projectId}`, detail: "Confirm pricing and approve the quote when it is ready." },
  { title: "Orders", status: "Partial Live", href: `/orders?projectId=${projectId}`, detail: "Create an order from an approved quote and review the current status." },
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
        description="See project details, take the next client action, and check recent timeline updates from one clear workspace."
        badges={
          <>
            <PremiumBadge>{formatProjectStatus(project.status)}</PremiumBadge>
            <PremiumBadge tone="emerald">Created {formatProjectDate(project.created_at)}</PremiumBadge>
          </>
        }
        aside={<PremiumBackLink href="/projects">Back to Projects</PremiumBackLink>}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <PremiumSection title="Project details" description="Core project information stays visible here.">
          <div className="grid gap-4 sm:grid-cols-2">
            <PremiumInfoCard label="Project name" value={project.name} />
            <PremiumInfoCard label="Status" value={formatProjectStatus(project.status)} />
            <PremiumInfoCard label="Address" value={project.address || "No address added yet."} spanTwo />
            <PremiumInfoCard label="Created date" value={formatProjectDate(project.created_at)} />
            <PremiumInfoCard label="Last updated" value={formatProjectDate(project.updated_at)} />
          </div>
        </PremiumSection>

        <PremiumSection title="Project actions" description="One clear action list for the live client workflow.">
          <div className="grid gap-3">
            {workflowSteps(project.id).map((step) => (
              <PremiumActionTile
                key={step.title}
                href={step.href}
                title={step.title}
                detail={step.detail}
                badge={<PremiumBadge tone={getStepTone(step.status)}>{step.status}</PremiumBadge>}
                icon={<PremiumIconBadge tone={step.status === "Partial Live" ? "amber" : "sky"}><StepIcon /></PremiumIconBadge>}
              />
            ))}
          </div>
        </PremiumSection>
      </div>

      <PremiumSection title="Project timeline" description="Recent project activity appears here as the workflow moves forward.">
        {timelineEvents && timelineEvents.length > 0 ? (
          <div className="grid gap-4">
            {timelineEvents.map((event) => (
              <article key={event.id} className="rounded-[22px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.84))] p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{event.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
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
