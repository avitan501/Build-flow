import {
  PremiumActionTile,
  PremiumBadge,
  PremiumHero,
  PremiumIconBadge,
  PremiumInfoCard,
  PremiumMutedPanel,
  PremiumPageShell,
  PremiumPrimaryButton,
  PremiumSection,
} from "@/components/buildflow/premium-page";
import { requireSignedInProfile } from "@/lib/auth";
import type { ProjectEventRecord, ProjectRecord } from "@/lib/projects";

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

function DockIcon({ type }: { type: "project" | "upload" | "activity" | "start" }) {
  if (type === "upload") return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 16V5" /><path d="m7 10 5-5 5 5" /><path d="M5 19h14" /></svg>;
  if (type === "activity") return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 12h4l2-5 4 10 2-5h4" /></svg>;
  if (type === "start") return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>;
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
        eyebrow="Dashboard"
        title={`Welcome${firstName ? `, ${firstName}` : ""}`}
        description={isPending ? "Your account is almost ready. You can review your projects now, and the full workflow will open up after approval." : "Use this space as your command center for starting a project, opening a workspace, uploading plans, and checking recent activity."}
        badges={
          <>
            <PremiumBadge>Client</PremiumBadge>
            <PremiumBadge tone={isPending ? "amber" : "emerald"}>{isPending ? "Approval pending" : "Ready"}</PremiumBadge>
          </>
        }
        aside={
          <div className="rounded-[26px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.9))] p-5 shadow-[0_16px_36px_rgba(148,163,184,0.12)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Start here</div>
            <div className="mt-3 text-2xl font-semibold text-slate-950">{recentProjects.length}</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{recentProjects.length > 0 ? "Open a workspace or upload the next plan set." : "Create your first project to begin."}</p>
            <div className="mt-4">
              <PremiumPrimaryButton href="/projects/new">Start Project</PremiumPrimaryButton>
            </div>
          </div>
        }
      />

      {isPending ? (
        <PremiumMutedPanel tone="amber">
          <div className="text-xs font-semibold uppercase tracking-[0.16em]">Approval in progress</div>
          <p className="mt-2 leading-6">You can review your dashboard now. More actions will unlock as soon as approval is complete.</p>
        </PremiumMutedPanel>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PremiumInfoCard label="Welcome" value={firstName ? `${firstName}, you're signed in.` : "You are signed in."} />
        <PremiumInfoCard label="Start project" value="Create a new workspace anytime" />
        <PremiumInfoCard label="My projects" value={`${recentProjects.length} recent project${recentProjects.length === 1 ? "" : "s"}`} />
        <PremiumInfoCard label="Upload plans" value={recentProjects.length > 0 ? "Ready for your next file" : "Start a project first"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <PremiumSection title="My projects" description="Open your latest workspace and keep moving.">
          {recentProjects.length > 0 ? (
            <div className="grid gap-3">
              {recentProjects.map((project) => (
                <PremiumActionTile
                  key={project.id}
                  href={`/projects/${project.id}`}
                  title={project.name}
                  detail={project.address ? `${project.address} · Updated ${formatProjectDate(project.updated_at)}` : `Updated ${formatProjectDate(project.updated_at)}`}
                  badge={<PremiumBadge tone="emerald">Open</PremiumBadge>}
                  icon={<PremiumIconBadge tone="sky"><DockIcon type="project" /></PremiumIconBadge>}
                />
              ))}
            </div>
          ) : (
            <PremiumMutedPanel>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">No projects yet</div>
              <p className="mt-2 leading-6">Create your first project to unlock uploads, materials, quotes, and orders.</p>
            </PremiumMutedPanel>
          )}
        </PremiumSection>

        <PremiumSection title="Quick actions" description="Keep the next step obvious.">
          <div className="grid gap-3">
            <PremiumActionTile href="/projects/new" title="Start Project" detail="Create a new client project workspace." icon={<PremiumIconBadge tone="amber"><DockIcon type="start" /></PremiumIconBadge>} />
            <PremiumActionTile href="/projects" title="View My Projects" detail="See every project in one place." icon={<PremiumIconBadge tone="slate"><DockIcon type="project" /></PremiumIconBadge>} />
            <PremiumActionTile href="/upload" title="Upload Plans" detail="Send a plan set into the right workspace." badge={<PremiumBadge tone="sky">Live</PremiumBadge>} icon={<PremiumIconBadge tone="sky"><DockIcon type="upload" /></PremiumIconBadge>} />
          </div>
        </PremiumSection>
      </div>

      <PremiumSection title={activity.length > 0 ? "Recent activity" : "Timeline"} description="Latest project updates appear here when available.">
        {activity.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {activity.map((event) => (
              <article key={event.id} className="rounded-[22px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.84))] p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <PremiumIconBadge tone="slate"><DockIcon type="activity" /></PremiumIconBadge>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{event.title}</h3>
                      {event.description ? <p className="mt-1 text-sm leading-6 text-slate-600">{event.description}</p> : null}
                    </div>
                  </div>
                  <PremiumBadge tone="sky">{event.event_type}</PremiumBadge>
                </div>
                <div className="mt-3 text-xs font-medium text-slate-500">{event.source} · {formatTimelineDate(event.created_at)}</div>
              </article>
            ))}
          </div>
        ) : (
          <PremiumMutedPanel>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">No recent activity yet</div>
            <p className="mt-2 leading-6">As you upload plans or move through a project, updates will land here.</p>
          </PremiumMutedPanel>
        )}
      </PremiumSection>
    </PremiumPageShell>
  );
}
