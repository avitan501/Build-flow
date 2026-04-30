import Link from "next/link";

import { statusButtonClass } from "@/components/buildflow/wireframe";
import { requireSignedInProfile } from "@/lib/auth";
import { getBuildflowWireframeData } from "@/lib/buildflow-wireframe";
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
  const { specMap } = getBuildflowWireframeData();
  const projects = specMap.get("projects");
  const upload = specMap.get("upload");
  const materials = specMap.get("materials");
  const quotes = specMap.get("quotes");
  const orders = specMap.get("orders");

  if (!projects || !upload || !materials || !quotes || !orders) {
    throw new Error("Missing BuildFlow project route data.");
  }

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
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-900 sm:px-8 lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Client Projects</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">My BuildFlow Projects</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                Manage your projects, upload plans, review materials, approve quotes, and track orders.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">Signed-in client</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">Projects hub</span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">Protected client page</span>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:min-w-80">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Primary action</div>
              <Link href="/projects/new" className={`mt-3 ${statusButtonClass(projects.status, projects.status === "Coming Soon")} w-full`}>
                <span>Start New Project</span>
                <span className="ml-2 text-[11px] uppercase tracking-[0.16em] opacity-85">{projects.status}</span>
              </Link>
              <p className="mt-3 text-sm leading-6 text-slate-600">Use this page as the place to start a project now or continue with the next step for one of your saved projects.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">Journey reminder</h2>
            <p className="mt-1 text-sm text-slate-500">Keep the next client step obvious from the projects overview.</p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {journeySteps.map((step, index) => (
              <div key={step} className={`rounded-2xl border px-4 py-4 ${index === 0 ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Step {index + 1}</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{step}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">{hasProjects ? "Your projects" : "No projects yet"}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {hasProjects
                ? "These are your real project records. Choose one and continue to the next step."
                : "Create your first real project to start the BuildFlow journey."}
            </p>
            {hasProjects ? (
              <div className="mt-5 grid gap-3">
                {projectList.map((project) => (
                  <div key={project.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{project.name}</div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {formatProjectStatus(project.status)} · Created {formatProjectDate(project.created_at)}
                        </div>
                        {project.address ? <p className="mt-3 text-sm leading-6 text-slate-700">{project.address}</p> : null}
                      </div>
                      <div className="flex flex-col gap-2 sm:items-end">
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                          {PROJECT_CREATION_STATUS_LABEL}
                        </span>
                        <Link href="/upload" className={statusButtonClass(upload.status, upload.status === "Coming Soon")}>
                          <span>Upload Plans</span>
                          <span className="ml-2 text-[11px] uppercase tracking-[0.16em] opacity-85">{upload.status}</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-3xl border border-orange-200 bg-orange-50 p-5 text-orange-900">
                <div>
                  <div className="text-sm font-semibold text-orange-950">Project list</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">Preview state</div>
                </div>
                <p className="mt-4 text-sm leading-6 text-orange-900">Start New Project to create your first real project.</p>
              </div>
            )}
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Next actions</h2>
            <div className="mt-4 grid gap-3">
              <Link href="/projects/new" className={statusButtonClass(projects.status, projects.status === "Coming Soon")}>
                <span>Start New Project</span>
                <span className="ml-2 text-[11px] uppercase tracking-[0.16em] opacity-85">{projects.status}</span>
              </Link>
              <Link href="/upload" className={statusButtonClass(upload.status, upload.status === "Coming Soon")}>
                <span>Upload Plans</span>
                <span className="ml-2 text-[11px] uppercase tracking-[0.16em] opacity-85">{upload.status}</span>
              </Link>
              <Link href="/materials" className={statusButtonClass(materials.status, materials.status === "Coming Soon")}>
                <span>Review Materials</span>
                <span className="ml-2 text-[11px] uppercase tracking-[0.16em] opacity-85">{materials.status}</span>
              </Link>
              <Link href="/quotes" className={statusButtonClass(quotes.status, quotes.status === "Coming Soon")}>
                <span>Review Quote</span>
                <span className="ml-2 text-[11px] uppercase tracking-[0.16em] opacity-85">{quotes.status}</span>
              </Link>
              <Link href="/orders" className={statusButtonClass(orders.status, orders.status === "Coming Soon")}>
                <span>Track Orders</span>
                <span className="ml-2 text-[11px] uppercase tracking-[0.16em] opacity-85">{orders.status}</span>
              </Link>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
