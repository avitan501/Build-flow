import Link from "next/link";

import { PremiumBadge, PremiumHero, PremiumInfoCard, PremiumPageShell, PremiumPrimaryButton, PremiumSection } from "@/components/buildflow/premium-page";
import { requireSignedInProfile } from "@/lib/auth";
import { PROJECT_CREATION_STATUS_LABEL, type ProjectRecord } from "@/lib/projects";

const journeySteps = ["Project", "Upload", "Materials", "Quote", "Orders"] as const;

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

  return (
    <PremiumPageShell>
      <PremiumHero
        eyebrow="Client Projects"
        title="My BuildFlow Projects"
        description="Manage your jobs, keep the next action visible, and move from upload to approval inside one premium workspace."
        badges={
          <>
            <PremiumBadge>Signed-in client</PremiumBadge>
            <PremiumBadge tone="emerald">Projects hub</PremiumBadge>
            <PremiumBadge tone="sky">Protected client page</PremiumBadge>
          </>
        }
        aside={
          <div className="rounded-[28px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.9))] p-5 shadow-[0_16px_36px_rgba(148,163,184,0.12)]">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Primary action</div>
            <PremiumPrimaryButton href="/projects/new">
              <span>Start New Project</span>
              <span className="ml-2 text-[11px] uppercase tracking-[0.16em] opacity-80">{PROJECT_CREATION_STATUS_LABEL}</span>
            </PremiumPrimaryButton>
            <p className="mt-3 text-sm leading-6 text-slate-600">Use this page as the clean starting point for a new job or continue into an existing workspace.</p>
          </div>
        }
      />

      <PremiumSection title="Journey reminder" description="Keep the next client step obvious from the projects overview.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {journeySteps.map((step, index) => (
            <div key={step} className={`rounded-[24px] border px-4 py-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)] ${index === 0 ? "border-emerald-200 bg-emerald-50/80" : "border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.82))]"}`}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Step {index + 1}</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{step}</div>
            </div>
          ))}
        </div>
      </PremiumSection>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <PremiumSection title={hasProjects ? "Your projects" : "No projects yet"} description={hasProjects ? "These are your real project records. Open one and continue to the next step." : "Create your first real project to begin the BuildFlow journey."}>
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
                      <PremiumBadge tone="emerald">{PROJECT_CREATION_STATUS_LABEL}</PremiumBadge>
                      <span className="inline-flex items-center justify-center rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                        Open Project Workspace
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-amber-950">
              <div className="text-sm font-semibold">Project list</div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Preview state</div>
              <p className="mt-4 text-sm leading-6">Start New Project to create your first real project.</p>
            </div>
          )}
        </PremiumSection>

        <PremiumSection title="Next actions" description="Keep the primary workflow clear and easy to scan.">
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
