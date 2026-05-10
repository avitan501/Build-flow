import { notFound } from "next/navigation";

import { addProjectMaterialAction } from "@/app/materials/actions";
import { PremiumBackLink, PremiumBadge, PremiumHero, PremiumInfoCard, PremiumMutedPanel, PremiumPageShell, PremiumSection } from "@/components/buildflow/premium-page";
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

function formatProjectStatus(status: ProjectRecord["status"]) {
  if (status === "active") return "Active";
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
    return (
      <PremiumPageShell maxWidth="max-w-3xl">
        <PremiumHero eyebrow="Materials" title="Materials" description="Open this page from a project workspace so materials stay linked to the right project." aside={<PremiumBackLink href="/projects">Back to Projects</PremiumBackLink>} />
      </PremiumPageShell>
    );
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
    <PremiumPageShell>
      <PremiumHero
        eyebrow="Materials"
        title={project.name}
        description="Review saved materials and add new items without leaving the project context."
        badges={
          <>
            <PremiumBadge tone="sky">Live</PremiumBadge>
            <PremiumBadge>Project linked</PremiumBadge>
          </>
        }
        aside={<PremiumBackLink href={`/projects/${project.id}`}>Back to Project Workspace</PremiumBackLink>}
      />

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <PremiumSection title="Add material" description="Add one item at a time for this project.">
          <div className="grid gap-3">
            {feedback ? (
              <PremiumMutedPanel tone={feedback.tone === "success" ? "emerald" : "rose"}>
                <div className="text-xs font-semibold uppercase tracking-[0.16em]">{feedback.tone === "success" ? "Saved" : "Material issue"}</div>
                <p className="mt-2 leading-6">{feedback.text}</p>
              </PremiumMutedPanel>
            ) : null}

            <form action={addProjectMaterialAction} className="grid gap-4 rounded-[22px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.86))] p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
              <input type="hidden" name="projectId" value={project.id} />
              <div>
                <label htmlFor="material-name" className="text-sm font-semibold text-slate-900">Material name</label>
                <input id="material-name" name="name" type="text" required className="mt-2 block w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-slate-900" placeholder="Example: 2x4 framing lumber" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="material-category" className="text-sm font-semibold text-slate-900">Category</label>
                  <input id="material-category" name="category" type="text" className="mt-2 block w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-slate-900" placeholder="Example: Framing" />
                </div>
                <div>
                  <label htmlFor="material-unit" className="text-sm font-semibold text-slate-900">Unit</label>
                  <input id="material-unit" name="unit" type="text" className="mt-2 block w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-slate-900" placeholder="Example: pcs" />
                </div>
              </div>
              <div>
                <label htmlFor="material-quantity" className="text-sm font-semibold text-slate-900">Quantity</label>
                <input id="material-quantity" name="quantity" type="number" step="any" className="mt-2 block w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-slate-900" placeholder="Example: 24" />
              </div>
              <div>
                <label htmlFor="material-notes" className="text-sm font-semibold text-slate-900">Notes</label>
                <textarea id="material-notes" name="notes" rows={4} className="mt-2 block w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-slate-900" placeholder="Optional notes" />
              </div>
              <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_30px_rgba(220,168,69,0.22)] transition active:scale-[0.99]">Add material</button>
            </form>
          </div>
        </PremiumSection>

        <PremiumSection title="Selected project" description="Project context stays visible while you review materials.">
          <div className="grid gap-4 sm:grid-cols-2">
            <PremiumInfoCard label="Project name" value={project.name} />
            <PremiumInfoCard label="Project status" value={formatProjectStatus(project.status)} />
            <PremiumInfoCard label="Address" value={project.address || "No address added yet."} spanTwo />
          </div>
        </PremiumSection>

        <PremiumSection title="Materials list" description="Saved materials for this project." className="lg:col-span-2">
          {materials.length === 0 ? (
            <PremiumMutedPanel>No materials reviewed yet.</PremiumMutedPanel>
          ) : (
            <div className="grid gap-3">
              {materials.map((material) => (
                <div key={material.id} className="rounded-[22px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.86))] p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{material.name}</div>
                      <div className="mt-1 text-sm text-slate-600">{material.category || "Uncategorized"}{material.quantity !== null ? ` · ${material.quantity}` : ""}{material.unit ? ` ${material.unit}` : ""}</div>
                    </div>
                    <PremiumBadge>{formatMaterialStatus(material.status)}</PremiumBadge>
                  </div>
                  {material.notes ? <p className="mt-3 text-sm leading-6 text-slate-600">{material.notes}</p> : null}
                </div>
              ))}
            </div>
          )}
        </PremiumSection>
      </div>
    </PremiumPageShell>
  );
}
