"use server";

import { redirect } from "next/navigation";

import { requireSignedInProfile } from "@/lib/auth";
import type { ProjectRecord } from "@/lib/projects";

function redirectToMaterials(projectId: string, key: "error" | "success", value: string) {
  const params = new URLSearchParams({ projectId, [key]: value });
  redirect(`/materials?${params.toString()}`);
}

export async function addProjectMaterialAction(formData: FormData) {
  const { supabase, user } = await requireSignedInProfile();

  const projectId = String(formData.get("projectId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const categoryRaw = String(formData.get("category") || "").trim();
  const quantityRaw = String(formData.get("quantity") || "").trim();
  const unitRaw = String(formData.get("unit") || "").trim();
  const notesRaw = String(formData.get("notes") || "").trim();

  if (!projectId) {
    redirect("/projects?error=missing-project");
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle<Pick<ProjectRecord, "id">>();

  if (projectError || !project) {
    redirectToMaterials(projectId, "error", "project-not-found");
  }

  if (!name) {
    redirectToMaterials(projectId, "error", "material-name-required");
  }

  let quantity: number | null = null;

  if (quantityRaw) {
    const parsed = Number(quantityRaw);
    if (!Number.isFinite(parsed)) {
      redirectToMaterials(projectId, "error", "quantity-invalid");
    }
    quantity = parsed;
  }

  const { error: insertError } = await supabase.from("project_materials").insert({
    project_id: projectId,
    owner_id: user.id,
    name,
    category: categoryRaw || null,
    quantity,
    unit: unitRaw || null,
    notes: notesRaw || null,
    status: "draft",
  });

  if (insertError) {
    redirectToMaterials(projectId, "error", "material-create-failed");
  }

  redirectToMaterials(projectId, "success", "material-added");
}
