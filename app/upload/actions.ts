"use server";

import { redirect } from "next/navigation";

import { requireSignedInProfile } from "@/lib/auth";
import {
  buildProjectUploadStoragePath,
  PROJECT_UPLOAD_ALLOWED_MIME_TYPES,
  PROJECT_UPLOAD_MAX_FILE_SIZE_BYTES,
  PROJECT_UPLOAD_STORAGE_BUCKET,
  type ProjectRecord,
} from "@/lib/projects";

function redirectToUpload(projectId: string, key: "error" | "success", value: string) {
  const params = new URLSearchParams({ projectId, [key]: value });
  redirect(`/upload?${params.toString()}`);
}

export async function uploadProjectFileAction(formData: FormData) {
  const { supabase, user } = await requireSignedInProfile();

  const projectId = String(formData.get("projectId") || "").trim();
  const fileEntry = formData.get("file");

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
    redirectToUpload(projectId, "error", "project-not-found");
  }

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    redirectToUpload(projectId, "error", "file-required");
  }

  const file = fileEntry as File;

  if (!PROJECT_UPLOAD_ALLOWED_MIME_TYPES.includes(file.type as (typeof PROJECT_UPLOAD_ALLOWED_MIME_TYPES)[number])) {
    redirectToUpload(projectId, "error", "file-type-not-allowed");
  }

  if (file.size > PROJECT_UPLOAD_MAX_FILE_SIZE_BYTES) {
    redirectToUpload(projectId, "error", "file-too-large");
  }

  const uploadId = crypto.randomUUID();
  const filePath = buildProjectUploadStoragePath({
    ownerId: user.id,
    projectId,
    uploadId,
    fileName: file.name,
  });

  const { error: storageError } = await supabase.storage.from(PROJECT_UPLOAD_STORAGE_BUCKET).upload(filePath, file, {
    contentType: file.type,
    upsert: false,
  });

  if (storageError) {
    console.error("Project upload storage error", {
      message: storageError.message,
      name: storageError.name,
    });
    redirectToUpload(projectId, "error", "storage-upload-failed");
  }

  const { error: insertError } = await supabase.from("project_uploads").insert({
    id: uploadId,
    project_id: projectId,
    owner_id: user.id,
    file_name: file.name,
    file_path: filePath,
    file_type: file.type,
    file_size: file.size,
    status: "uploaded",
  });

  if (insertError) {
    console.error("Project upload metadata insert error", {
      message: insertError.message,
      code: insertError.code,
    });
    await supabase.storage.from(PROJECT_UPLOAD_STORAGE_BUCKET).remove([filePath]);
    redirectToUpload(projectId, "error", "metadata-insert-failed");
  }

  redirectToUpload(projectId, "success", "upload-complete");
}
