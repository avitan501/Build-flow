import Link from "next/link";
import { notFound } from "next/navigation";

import { addProjectMaterialAction } from "@/app/materials/actions";
import { ClientWireframePage } from "@/components/buildflow/client-wireframe-page";
import { requireSignedInProfile } from "@/lib/auth";
import type { ProjectMaterialRecord, ProjectRecord } from "@/lib/projects";

type MaterialsPageProps = {
  searchParams?: Promise<{
    projectId?: string;
    error?: string;
    success?: string;
  }>;
};

function formatMaterialStatus(status: ProjectMaterialRecord["status"]) {
  if (status === "approved") return "Approved";
  if (status === "reviewed") return "Reviewed";
  if (status === "archived") return "Archived";
  return "Draft";
}

const materialStatusMessages = {
  "material-name-required": { tone: "error", text: "Material name is required." },
  "quantity-invalid": { tone: "error", text: "Quantity must be a valid number." },
  "project-not-found": { tone: "error", text: "We could not confirm that project for your account." },
  "material-create-failed": { tone: "error", text: "Material could not be saved. Please try again." },
  "material-added": { tone: "success", text: "Material added successfully." },
} as const;

export default async function MaterialsPage({ searchParams }: MaterialsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const projectId = resolvedSearchParams?.projectId?.trim();
  const errorCode = resolvedSearchParams?.error?.trim();
  const successCode = resolvedSearchParams?.success?.trim();

  if (!projectId) {
    await requireSignedInProfile();
    return <ClientWireframePage pageKey="materials" audienceLabel="Signed-in client" modeLabel="Protected client preview" />;
  }

  const { supabase, user } = await requireSignedInProfile();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, owner_id, name, address, status, created_at, updated_at")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle<ProjectRecord>();

  if (projectError || !project) {
    notFound();
  }

  const { data: materials, error: materialsError } = await supabase
    .from("project_materials")
    .select("id, project_id, owner_id, upload_id, name, category, quantity, unit, status, notes, created_at, updated_at")
    .eq("project_id", project.id)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .returns<ProjectMaterialRecord[]>();

  if (materialsError) {
    throw new Error("Failed to load project materials.");
  }

  const feedback = (successCode && materialStatusMessages[successCode as keyof typeof materialStatusMessages]) || (errorCode && materialStatusMessages[errorCode as keyof typeof materialStatusMessages]);

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-900 sm:px-8 lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Materials Review</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{project.name}</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                Review the saved project materials for this selected job.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">Signed-in client</span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">Project-aware materials</span>
              </div>
            </div>
            <Link
              href={`/projects/${project.id}`}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              Back to Project Workspace
            </Link>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Add material</h2>
            <p className="mt-1 text-sm text-slate-500">Manually add one draft material item to this selected project.</p>
            <div className="mt-4 grid gap-3">
              {feedback ? (
                <div
                  className={`rounded-2xl border p-4 text-sm ${
                    feedback.tone === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-rose-200 bg-rose-50 text-rose-900"
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.16em]">
                    {feedback.tone === "success" ? "Saved" : "Material issue"}
                  </div>
                  <p className="mt-2 leading-6">{feedback.text}</p>
                </div>
              ) : null}

              <form action={addProjectMaterialAction} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input type="hidden" name="projectId" value={project.id} />
                <div>
                  <label htmlFor="material-name" className="text-sm font-semibold text-slate-900">
                    Material name
                  </label>
                  <input
                    id="material-name"
                    name="name"
                    type="text"
                    required
                    className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                    placeholder="Example: 2x4 framing lumber"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="material-category" className="text-sm font-semibold text-slate-900">
                      Category
                    </label>
                    <input
                      id="material-category"
                      name="category"
                      type="text"
                      className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                      placeholder="Example: Framing"
                    />
                  </div>
                  <div>
                    <label htmlFor="material-unit" className="text-sm font-semibold text-slate-900">
                      Unit
                    </label>
                    <input
                      id="material-unit"
                      name="unit"
                      type="text"
                      className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                      placeholder="Example: pcs"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="material-quantity" className="text-sm font-semibold text-slate-900">
                    Quantity
                  </label>
                  <input
                    id="material-quantity"
                    name="quantity"
                    type="number"
                    step="any"
                    className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                    placeholder="Example: 24"
                  />
                </div>
                <div>
                  <label htmlFor="material-notes" className="text-sm font-semibold text-slate-900">
                    Notes
                  </label>
                  <textarea
                    id="material-notes"
                    name="notes"
                    rows={4}
                    className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                    placeholder="Optional notes"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Add material
                </button>
              </form>
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Selected project</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Project name</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{project.name}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Project status</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{project.status}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Address</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{project.address || "No address added yet."}</div>
              </div>
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Materials list</h2>
            <p className="mt-1 text-sm text-slate-500">Read-only view of saved materials for this project.</p>
            {materials.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                No materials reviewed yet
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {materials.map((material) => (
                  <div key={material.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{material.name}</div>
                        <div className="mt-1 text-sm text-slate-600">
                          {material.category || "Uncategorized"}
                          {material.quantity !== null ? ` · ${material.quantity}` : ""}
                          {material.unit ? ` ${material.unit}` : ""}
                        </div>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                        {formatMaterialStatus(material.status)}
                      </span>
                    </div>
                    {material.notes ? <p className="mt-3 text-sm leading-6 text-slate-600">{material.notes}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}
