"use server";

import { redirect } from "next/navigation";

import { requireSignedInProfile } from "@/lib/auth";
import {
  buildProjectUploadStoragePath,
  createProjectEvent,
  PROJECT_UPLOAD_MAX_FILE_SIZE_BYTES,
  PROJECT_UPLOAD_STORAGE_BUCKET,
  type ProjectRecord,
} from "@/lib/projects";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractWindowScheduleFromFile } from "@/lib/window-schedule-extraction";

const WINDOW_SCHEDULE_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

function redirectToWindow(projectId: string, key: "error" | "success", value: string): never {
  const params = new URLSearchParams({ project: projectId, [key]: value });
  redirect(`/shop/window?${params.toString()}`);
}

async function cleanupFailedWindowSchedule(params: {
  uploadId: string;
  filePath: string;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("project_uploads").delete().eq("id", params.uploadId);
    await admin.storage.from(PROJECT_UPLOAD_STORAGE_BUCKET).remove([params.filePath]);
  } catch (error) {
    console.error("Window schedule cleanup failed", error);
  }
}

export async function uploadWindowScheduleAction(formData: FormData) {
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
    redirectToWindow(projectId, "error", "project-not-found");
  }

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    redirectToWindow(projectId, "error", "file-required");
  }

  const file = fileEntry as File;

  if (!WINDOW_SCHEDULE_ALLOWED_MIME_TYPES.includes(file.type as (typeof WINDOW_SCHEDULE_ALLOWED_MIME_TYPES)[number])) {
    redirectToWindow(projectId, "error", "file-type-not-allowed");
  }

  if (file.size > PROJECT_UPLOAD_MAX_FILE_SIZE_BYTES) {
    redirectToWindow(projectId, "error", "file-too-large");
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
    console.error("Window schedule storage error", {
      message: storageError.message,
      name: storageError.name,
    });
    redirectToWindow(projectId, "error", "storage-upload-failed");
  }

  const { error: uploadInsertError } = await supabase.from("project_uploads").insert({
    id: uploadId,
    project_id: projectId,
    owner_id: user.id,
    file_name: file.name,
    file_path: filePath,
    file_type: file.type,
    file_size: file.size,
    status: "processing",
  });

  if (uploadInsertError) {
    console.error("Window schedule upload metadata error", {
      message: uploadInsertError.message,
      code: uploadInsertError.code,
    });
    await cleanupFailedWindowSchedule({ uploadId, filePath });
    redirectToWindow(projectId, "error", "metadata-insert-failed");
  }

  let extraction;
  try {
    extraction = await extractWindowScheduleFromFile(file);
  } catch (error) {
    console.error("Window schedule extraction failed", error);
    extraction = {
      items: [],
      notes: "Automatic extraction failed. Review the uploaded file and enter the window schedule manually.",
    };
  }

  await supabase
    .from("project_uploads")
    .update({ status: extraction.items.length > 0 ? "ready" : "uploaded" })
    .eq("id", uploadId)
    .eq("project_id", projectId)
    .eq("owner_id", user.id);

  await createProjectEvent({
    supabase,
    projectId,
    ownerId: user.id,
    eventType: "file_uploaded",
    source: "upload",
    title: "Window schedule uploaded",
    description: `${file.name} was uploaded for window schedule extraction.`,
    metadata: {
      upload_id: uploadId,
      file_name: file.name,
      supplier_name: "Sierra Pacific Windows",
      item_count: extraction.items.length,
      window_schedule: {
        status: extraction.items.length > 0 ? "needs_review" : "needs_manual_review",
        notes: extraction.notes,
        items: extraction.items,
      },
    },
  });

  redirect(`/shop/window/uploads/${uploadId}?success=window-schedule-uploaded`);
}
