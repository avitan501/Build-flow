"use server";

import { redirect } from "next/navigation";

import { requireSignedInProfile } from "@/lib/auth";

export async function createProjectAction(formData: FormData) {
  const { supabase, user } = await requireSignedInProfile();

  const name = String(formData.get("name") || "").trim();
  const rawAddress = String(formData.get("address") || "").trim();
  const address = rawAddress.length > 0 ? rawAddress : null;

  if (!name) {
    redirect("/projects/new?error=project-name-required");
  }

  const { error } = await supabase.from("projects").insert({
    owner_id: user.id,
    name,
    address,
    status: "draft",
  });

  if (error) {
    redirect("/projects/new?error=create-failed");
  }

  redirect("/projects");
}
