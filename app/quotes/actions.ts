"use server";

import { redirect } from "next/navigation";

import { requireSignedInProfile } from "@/lib/auth";
import type { ProjectRecord } from "@/lib/projects";

function redirectToQuotes(projectId: string, key: "error" | "success", value: string) {
  const params = new URLSearchParams({ projectId, [key]: value });
  redirect(`/quotes?${params.toString()}`);
}

export async function createProjectQuoteAction(formData: FormData) {
  const { supabase, user } = await requireSignedInProfile();

  const projectId = String(formData.get("projectId") || "").trim();
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
    redirectToQuotes(projectId, "error", "project-not-found");
  }

  const { error: insertError } = await supabase.from("project_quotes").insert({
    project_id: projectId,
    owner_id: user.id,
    status: "draft",
    subtotal: 0,
    tax: 0,
    total: 0,
    notes: notesRaw || null,
  });

  if (insertError) {
    redirectToQuotes(projectId, "error", "quote-create-failed");
  }

  redirectToQuotes(projectId, "success", "quote-created");
}
