import { PremiumActionTile, PremiumBadge, PremiumHero, PremiumIconBadge, PremiumInfoCard, PremiumMutedPanel, PremiumPageShell, PremiumPrimaryButton, PremiumSection } from "@/components/buildflow/premium-page";
import { requireSignedInProfile } from "@/lib/auth";
import { PROJECT_CREATION_STATUS_LABEL, type ProjectRecord } from "@/lib/projects";

function formatProjectDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatProjectStatus(status: ProjectRecord["status"]) {
  if (status === "active") return "Active";
  if (status === "archived") return "Archived";
  return "Draft";
}

function GridIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>;
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
}

export default async function ProjectsPage() {
  const { supabase, user } = await requireSignedInProfile();

  const { data: projectRows, error: projectsError } = await supabase
    .from("projects")
    .select("id, owner_id, name, address, status, created_at, updated_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .returns<ProjectRecord[]>();

  if (projectsError) {
    throw new Error("Failed to load projects.");
  }

  const projectList = projectRows ?? [];
  const hasProjects = projectList.length > 0;
  const activeProjects = projectList.filter((project) => project.status === "active").length;

  return (
    <PremiumPageShell>
      <PremiumHero
        eyebrow="Projects"
        title="Your projects"
        description="Keep every client project easy to scan, then open the right workspace when you're ready to upload plans, review materials, approve quotes, or track orders."
        badges={
          <>
            <PremiumBadge>Client</PremiumBadge>
            <PremiumBadge tone="emerald">Projects hub</PremiumBadge>
          </>
        }
        aside={
          <div className="rounded-[26px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.9))] p-5 shadow-[0_16px_36px_rgba(148,163,184,0.12)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Primary action</div>
            <div className="mt-3">
              <PremiumPrimaryButton href="/projects/new">
                <span>Start New Project</span>
                <span className="ml-2 text-[11px] uppercase tracking-[0.16em] opacity-80">{PROJECT_CREATION_STATUS_LABEL}</span>
              </PremiumPrimaryButton>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">Create a new job or continue from an existing workspace.</p>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <PremiumInfoCard label="All projects" value={projectList.length} />
        <PremiumInfoCard label="Active projects" value={activeProjects} />
        <PremiumInfoCard label="Next step" value={hasProjects ? "Open a workspace" : "Start New Project"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <PremiumSection title={hasProjects ? "Project list" : "Ready to start?"} description={hasProjects ? "Each project opens directly into its workspace." : "Create your first project to begin the client workflow."}>
          {hasProjects ? (
            <div className="grid gap-3">
              {projectList.map((project) => (
                <PremiumActionTile
                  key={project.id}
                  href={`/projects/${project.id}`}
                  title={project.name}
                  detail={`${formatProjectStatus(project.status)} · Created ${formatProjectDate(project.created_at)}${project.address ? ` · ${project.address}` : ""}`}
                  badge={<PremiumBadge tone="emerald">Workspace</PremiumBadge>}
                  icon={<PremiumIconBadge tone="sky"><GridIcon /></PremiumIconBadge>}
                />
              ))}
            </div>
          ) : (
            <PremiumMutedPanel>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">No projects yet</div>
              <p className="mt-2 leading-6">Start New Project to create your first workspace and unlock the rest of your workflow.</p>
            </PremiumMutedPanel>
          )}
        </PremiumSection>

        <PremiumSection title="Next actions" description="Keep the path forward short and clear.">
          <div className="grid gap-3">
            <PremiumActionTile href="/projects/new" title="Start New Project" detail="Create a fresh workspace for a new job." badge={<PremiumBadge tone="amber">{PROJECT_CREATION_STATUS_LABEL}</PremiumBadge>} icon={<PremiumIconBadge tone="amber"><PlusIcon /></PremiumIconBadge>} />
            <PremiumActionTile href="/upload" title="Upload Plans" detail="Send plan files into the right project." badge={<PremiumBadge tone="sky">Live</PremiumBadge>} icon={<PremiumIconBadge tone="sky"><PlusIcon /></PremiumIconBadge>} />
            <PremiumActionTile href="/materials" title="Materials" detail="Review or add material items." badge={<PremiumBadge tone="sky">Live</PremiumBadge>} icon={<PremiumIconBadge tone="slate"><GridIcon /></PremiumIconBadge>} />
            <PremiumActionTile href="/quotes" title="Quote" detail="Review pricing and approvals." badge={<PremiumBadge tone="sky">Live</PremiumBadge>} icon={<PremiumIconBadge tone="slate"><GridIcon /></PremiumIconBadge>} />
            <PremiumActionTile href="/orders" title="Orders" detail="Review approved quote orders and status." badge={<PremiumBadge tone="amber">Partial Live</PremiumBadge>} icon={<PremiumIconBadge tone="slate"><GridIcon /></PremiumIconBadge>} />
          </div>
        </PremiumSection>
      </div>
    </PremiumPageShell>
  );
}
