import Link from "next/link";

import { PremiumBadge, PremiumHero, PremiumInfoCard, PremiumMutedPanel, PremiumPageShell, PremiumPrimaryButton, PremiumSection } from "@/components/buildflow/premium-page";
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
        eyebrow="Client projects"
        title="Your projects"
        description="Keep every project in one clean place, then open the workspace for uploads, materials, quotes, and orders."
        badges={
          <>
            <PremiumBadge>Signed-in client</PremiumBadge>
            <PremiumBadge tone="emerald">Projects hub</PremiumBadge>
          </>
        }
        aside={
          <div className="rounded-[28px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.9))] p-5 shadow-[0_16px_36px_rgba(148,163,184,0.12)]">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Primary action</div>
            <div className="mt-3">
              <PremiumPrimaryButton href="/projects/new">
                <span>Start New Project</span>
                <span className="ml-2 text-[11px] uppercase tracking-[0.16em] opacity-80">{PROJECT_CREATION_STATUS_LABEL}</span>
              </PremiumPrimaryButton>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">Create a new job or continue from an existing workspace whenever you are ready.</p>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <PremiumInfoCard label="All projects" value={projectList.length} />
        <PremiumInfoCard label="Active projects" value={activeProjects} />
        <PremiumInfoCard label="Next step" value={hasProjects ? "Open a workspace and continue" : "Create your first project"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <PremiumSection title={hasProjects ? "Project list" : "Ready to start?"} description={hasProjects ? "Open any project below to continue the client workflow." : "Create your first project to begin the BuildFlow journey."}>
          {hasProjects ? (
            <div className="grid gap-3">
              {projectList.map((project) => (
                <Link href={`/projects/${project.id}`} key={project.id} className="block rounded-[26px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.88))] p-5 shadow-[0_12px_28px_rgba(148,163,184,0.1)] transition active:scale-[0.99]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-base font-semibold text-slate-950">{project.name}</div>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {formatProjectStatus(project.status)} · Created {formatProjectDate(project.created_at)}
                      </div>
                      {project.address ? <p className="mt-3 text-sm leading-6 text-slate-600">{project.address}</p> : null}
                    </div>
                    <div className="flex flex-col gap-2 sm:items-end">
                      <PremiumBadge tone="emerald">Workspace ready</PremiumBadge>
                      <span className="inline-flex items-center justify-center rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                        Open project workspace
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <PremiumMutedPanel>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">No projects yet</div>
              <p className="mt-2 leading-6">Start New Project to create your first project and unlock the rest of your workflow.</p>
            </PremiumMutedPanel>
          )}
        </PremiumSection>

        <PremiumSection title="Next actions" description="Jump into the next client-facing step from here.">
          <div className="grid gap-3">
            <PremiumPrimaryButton href="/projects/new">
              <span>Start New Project</span>
              <span className="ml-2 text-[11px] uppercase tracking-[0.16em] opacity-80">{PROJECT_CREATION_STATUS_LABEL}</span>
            </PremiumPrimaryButton>
            <Link href="/upload" className="inline-flex items-center justify-between rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition active:scale-[0.99]">
              <span>Upload Plans</span>
              <span className="text-[11px] uppercase tracking-[0.16em] text-sky-700">Live</span>
            </Link>
            <Link href="/materials" className="inline-flex items-center justify-between rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition active:scale-[0.99]">
              <span>Review Materials</span>
              <span className="text-[11px] uppercase tracking-[0.16em] text-sky-700">Live</span>
            </Link>
            <Link href="/quotes" className="inline-flex items-center justify-between rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition active:scale-[0.99]">
              <span>Review Quote</span>
              <span className="text-[11px] uppercase tracking-[0.16em] text-sky-700">Live</span>
            </Link>
            <Link href="/orders" className="inline-flex items-center justify-between rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition active:scale-[0.99]">
              <span>Track Orders</span>
              <span className="text-[11px] uppercase tracking-[0.16em] text-amber-700">Partial Live</span>
            </Link>
          </div>
        </PremiumSection>
      </div>
    </PremiumPageShell>
  );
}
