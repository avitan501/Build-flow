"use server";

import { redirect } from "next/navigation";

import { requireSignedInProfile } from "@/lib/auth";
import { createProjectEvent } from "@/lib/projects";

export async function createProjectAction(formData: FormData) {
  const { supabase, user } = await requireSignedInProfile();

  const name = String(formData.get("name") || "").trim();
  const rawAddress = String(formData.get("address") || "").trim();
  const address = rawAddress.length > 0 ? rawAddress : null;

  if (!name) {
    redirect("/projects/new?error=project-name-required");
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      name,
      address,
      status: "draft",
    })
    .select("id, name")
    .single<{ id: string; name: string }>();

  if (error || !project) {
    redirect("/projects/new?error=create-failed");
  }

  const createdProject = project as { id: string; name: string };

  await createProjectEvent({
    supabase,
    projectId: createdProject.id,
    ownerId: user.id,
    eventType: "project_opened",
    source: "website",
    title: "Project created",
    description: `Project ${createdProject.name} was created.`,
    metadata: { project_id: createdProject.id },
  });

  redirect("/projects");
}
