import Link from "next/link";

import {
  PremiumBadge,
  PremiumHero,
  PremiumInfoCard,
  PremiumMutedPanel,
  PremiumPageShell,
  PremiumPrimaryButton,
  PremiumSection,
} from "@/components/buildflow/premium-page";
import { requireSignedInProfile } from "@/lib/auth";
import type { ProjectEventRecord, ProjectRecord } from "@/lib/projects";

function ActionLink({ href, label, status }: { href: string; label: string; status?: "Live" | "Partial Live" }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-between rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition active:scale-[0.99]"
    >
      <span>{label}</span>
      {status ? <PremiumBadge tone={status === "Partial Live" ? "amber" : "sky"}>{status}</PremiumBadge> : null}
    </Link>
  );
}

function formatProjectDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimelineDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function DashboardPage() {
  const { supabase, user, profile } = await requireSignedInProfile();

  const { data: projectsData, error: projectsError } = await supabase
    .from("projects")
    .select("id, owner_id, name, address, status, created_at, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(3)
    .returns<ProjectRecord[]>();

  if (projectsError) {
    throw new Error("Failed to load projects for dashboard.");
  }

  const projectIds = (projectsData ?? []).map((project) => project.id);
  let activity: ProjectEventRecord[] = [];

  if (projectIds.length > 0) {
    const { data: activityData, error: activityError } = await supabase
      .from("project_events")
      .select("id, project_id, owner_id, event_type, source, title, description, metadata, created_at")
      .in("project_id", projectIds)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(4)
      .returns<ProjectEventRecord[]>();

    if (activityError) {
      throw new Error("Failed to load dashboard activity.");
    }

    activity = activityData ?? [];
  }

  const recentProjects = projectsData ?? [];
  const isPending = profile?.approval_status === "pending";
  const firstName = profile?.full_name?.split(" ")[0]?.trim();

  return (
    <PremiumPageShell>
      <PremiumHero
        eyebrow="Client dashboard"
        title={`Welcome back${firstName ? `, ${firstName}` : ""}`}
        description={
          isPending
            ? "Your account is almost ready. You can review your dashboard now, and the full project workflow will unlock once approval is complete."
            : "Keep your active projects, uploads, and next steps in one clean BuildFlow workspace."
        }
        badges={
          <>
            <PremiumBadge>Signed-in client</PremiumBadge>
            <PremiumBadge tone={isPending ? "amber" : "emerald"}>{isPending ? "Approval pending" : "Ready"}</PremiumBadge>
          </>
        }
        aside={
          <div className="rounded-[28px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.9))] p-5 shadow-[0_16px_36px_rgba(148,163,184,0.12)]">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">At a glance</div>
            <div className="mt-3 text-2xl font-semibold text-slate-950">{recentProjects.length}</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {recentProjects.length === 1 ? "Project ready to continue." : `${recentProjects.length} projects ready to review.`}
            </p>
            <div className="mt-4">
              <PremiumPrimaryButton href="/projects/new">Start new project</PremiumPrimaryButton>
            </div>
          </div>
        }
      />

      {isPending ? (
        <PremiumMutedPanel tone="amber">
          <div className="text-xs font-semibold uppercase tracking-[0.16em]">Approval in progress</div>
          <p className="mt-2 leading-6">You can view your dashboard now. Project actions will open up as soon as your account is approved.</p>
        </PremiumMutedPanel>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PremiumInfoCard label="Account" value={profile?.approval_status === "approved" ? "Approved client" : "Pending approval"} />
        <PremiumInfoCard label="Projects" value={recentProjects.length} />
        <PremiumInfoCard label="Latest upload step" value={recentProjects.length > 0 ? "Ready when you are" : "Start a project first"} />
        <PremiumInfoCard label="Next best action" value={recentProjects.length > 0 ? "Continue your latest project" : "Create your first project"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <PremiumSection title="Continue your projects" description="Open a project workspace, upload plans, or keep moving toward review.">
          {recentProjects.length > 0 ? (
            <div className="grid gap-3">
              {recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block rounded-[26px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.88))] p-5 shadow-[0_12px_28px_rgba(148,163,184,0.1)] transition active:scale-[0.99]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-base font-semibold text-slate-950">{project.name}</div>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Updated {formatProjectDate(project.updated_at)}</div>
                      {project.address ? <p className="mt-3 text-sm leading-6 text-slate-600">{project.address}</p> : null}
                    </div>
                    <div className="flex flex-col gap-2 sm:items-end">
                      <PremiumBadge tone="emerald">Workspace ready</PremiumBadge>
                      <span className="inline-flex items-center justify-center rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                        Open project
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <PremiumMutedPanel>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">No projects yet</div>
              <p className="mt-2 leading-6">Start your first project to unlock uploads, materials, quotes, and orders in one place.</p>
            </PremiumMutedPanel>
          )}
        </PremiumSection>

        <PremiumSection title="Quick actions" description="Jump into the next client-facing step.">
          <div className="grid gap-3">
            <PremiumPrimaryButton href="/projects/new">Start new project</PremiumPrimaryButton>
            <ActionLink href="/projects" label="View all projects" />
            <ActionLink href="/upload" label="Upload plans" status="Live" />
            <ActionLink href="/materials" label="Review materials" status="Live" />
            <ActionLink href="/quotes" label="Review quote" status="Live" />
            <ActionLink href="/orders" label="Track orders" status="Partial Live" />
          </div>
        </PremiumSection>
      </div>

      <PremiumSection title="Recent project activity" description="Your latest updates appear here when activity is available.">
        {activity.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {activity.map((event) => (
              <article
                key={event.id}
                className="rounded-[24px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.84))] p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]"
              >
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <PremiumBadge>{event.source}</PremiumBadge>
                  <PremiumBadge tone="sky">{event.event_type}</PremiumBadge>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">{event.title}</h3>
                {event.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{event.description}</p> : null}
                <div className="mt-3 text-xs font-medium text-slate-500">{formatTimelineDate(event.created_at)}</div>
              </article>
            ))}
          </div>
        ) : (
          <PremiumMutedPanel>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">No recent activity yet</div>
            <p className="mt-2 leading-6">As you upload plans or move through your workflow, updates will appear here.</p>
          </PremiumMutedPanel>
        )}
      </PremiumSection>
    </PremiumPageShell>
  );
}
