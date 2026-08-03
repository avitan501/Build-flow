"use server";

import { redirect } from "next/navigation";

import { getSessionWithProfile } from "@/lib/auth";
import {
  buildProjectUploadStoragePath,
  createProjectEvent,
  PROJECT_UPLOAD_MAX_FILE_SIZE_BYTES,
  PROJECT_UPLOAD_STORAGE_BUCKET,
  type ProjectRecord,
} from "@/lib/projects";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractWindowScheduleFromFile, type ExtractedWindowScheduleItem } from "@/lib/window-schedule-extraction";

const EITAN_WHATSAPP_PHONE = "17189409400";
const WHATSAPP_MESSAGE_MAX_LENGTH = 3500;

const EITAN_PLAN_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

function redirectToEitan(projectId: string | null, key: "error" | "success", value: string): never {
  const params = new URLSearchParams({ [key]: value });
  if (projectId) {
    params.set("project", projectId);
  }
  redirect(`/shop/eitan?${params.toString()}`);
}

async function cleanupFailedEitanUpload(params: {
  uploadId: string;
  filePath: string;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("project_uploads").delete().eq("id", params.uploadId);
    await admin.storage.from(PROJECT_UPLOAD_STORAGE_BUCKET).remove([params.filePath]);
  } catch (error) {
    console.error("Eitan upload cleanup failed", error);
  }
}

function formatWindowScheduleLine(item: ExtractedWindowScheduleItem, index: number) {
  const mark = item.mark || `Window ${index + 1}`;
  const size = [item.width, item.height].filter(Boolean).join(" x ") || "size not listed";
  const roughOpening = [item.roughOpeningWidth, item.roughOpeningHeight].filter(Boolean).join(" x ");
  const parts = [
    `${index + 1}. ${mark}`,
    `qty ${item.quantity || 1}`,
    item.location ? `location: ${item.location}` : null,
    item.windowType ? `type: ${item.windowType}` : null,
    `size: ${size}`,
    roughOpening ? `RO: ${roughOpening}` : null,
    item.glass ? `glass: ${item.glass}` : null,
    item.operation ? `operation: ${item.operation}` : null,
    item.notes ? `notes: ${item.notes}` : null,
  ].filter(Boolean);

  return parts.join(" | ");
}

function normalizeCopyToPhone(value: string) {
  const normalized = value.replace(/[^\d+()\-\s.]/g, "").trim();
  const digitCount = normalized.replace(/\D/g, "").length;

  return digitCount >= 7 && digitCount <= 15 ? normalized : "";
}

function buildWindowScheduleWhatsAppMessage(params: {
  projectName: string;
  fileName: string;
  items: ExtractedWindowScheduleItem[];
  notes: string;
  copyToPhone: string;
}) {
  const itemLines: string[] = [];
  let omittedCount = 0;

  for (const item of params.items) {
    const nextLine = formatWindowScheduleLine(item, itemLines.length);
    const nextScheduleText = [...itemLines, nextLine].join("\n");
    const previewMessage = [
      "Here is the window schedule to quote please revise and come back with questions.",
      params.copyToPhone ? `Please also copy/reply to: ${params.copyToPhone}` : "",
      "",
      `Project: ${params.projectName}`,
      `Source file: ${params.fileName}`,
      "",
      "Window schedule material list:",
      nextScheduleText,
    ].join("\n");

    if (previewMessage.length > WHATSAPP_MESSAGE_MAX_LENGTH) {
      omittedCount += 1;
      continue;
    }

    itemLines.push(nextLine);
  }

  omittedCount += Math.max(params.items.length - itemLines.length - omittedCount, 0);
  const moreLine = omittedCount > 0 ? [`...${omittedCount} more window rows not shown. Full schedule is in the uploaded source file.`] : [];
  const scheduleText =
    itemLines.length > 0
      ? [...itemLines, ...moreLine].join("\n")
      : `No window rows were automatically extracted. Notes: ${params.notes}`;

  return [
    "Here is the window schedule to quote please revise and come back with questions.",
    params.copyToPhone ? `Please also copy/reply to: ${params.copyToPhone}` : "",
    "",
    `Project: ${params.projectName}`,
    `Source file: ${params.fileName}`,
    "",
    "Window schedule material list:",
    scheduleText,
  ].join("\n");
}

export async function uploadEitanPlanAndOpenWhatsAppAction(formData: FormData) {
  const { supabase, user } = await getSessionWithProfile();

  const projectId = String(formData.get("projectId") || "").trim();
  const copyToPhone = normalizeCopyToPhone(String(formData.get("copyToPhone") || ""));
  const fileEntry = formData.get("file");

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    redirectToEitan(projectId || null, "error", "file-required");
  }

  const file = fileEntry as File;

  if (!EITAN_PLAN_ALLOWED_MIME_TYPES.includes(file.type as (typeof EITAN_PLAN_ALLOWED_MIME_TYPES)[number])) {
    redirectToEitan(projectId || null, "error", "file-type-not-allowed");
  }

  if (file.size > PROJECT_UPLOAD_MAX_FILE_SIZE_BYTES) {
    redirectToEitan(projectId || null, "error", "file-too-large");
  }

  let project: ProjectRecord | null = null;
  let uploadId: string | null = null;
  let filePath: string | null = null;

  if (user && projectId) {
    const { data: selectedProject, error: projectError } = await supabase
      .from("projects")
      .select("id, owner_id, name, address, status, created_at, updated_at")
      .eq("id", projectId)
      .eq("owner_id", user.id)
      .maybeSingle<ProjectRecord>();

    if (projectError || !selectedProject) {
      redirectToEitan(projectId, "error", "project-not-found");
    }

    project = selectedProject;
    uploadId = crypto.randomUUID();
    filePath = buildProjectUploadStoragePath({
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
      console.error("Eitan plan storage error", {
        message: storageError.message,
        name: storageError.name,
      });
      redirectToEitan(projectId, "error", "storage-upload-failed");
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
      console.error("Eitan plan upload metadata error", {
        message: uploadInsertError.message,
        code: uploadInsertError.code,
      });
      await cleanupFailedEitanUpload({ uploadId, filePath });
      redirectToEitan(projectId, "error", "metadata-insert-failed");
    }
  }

  let extraction;
  try {
    extraction = await extractWindowScheduleFromFile(file);
  } catch (error) {
    console.error("Eitan window schedule extraction failed", error);
    extraction = {
      items: [],
      notes: "Automatic extraction failed. Review the uploaded plan manually before quoting.",
    };
  }

  if (user && project && uploadId) {
    const { error: statusUpdateError } = await supabase
      .from("project_uploads")
      .update({ status: extraction.items.length > 0 ? "ready" : "uploaded" })
      .eq("id", uploadId)
      .eq("project_id", project.id)
      .eq("owner_id", user.id);

    if (statusUpdateError) {
      console.error("Eitan plan upload status update failed", {
        message: statusUpdateError.message,
        code: statusUpdateError.code,
      });
    }
  }

  const message = buildWindowScheduleWhatsAppMessage({
    projectName: project?.name || "Eitan shop upload",
    fileName: file.name,
    items: extraction.items,
    notes: extraction.notes,
    copyToPhone,
  });

  if (user && project) {
    await createProjectEvent({
      supabase,
      projectId: project.id,
      ownerId: user.id,
      eventType: "file_uploaded",
      source: "upload",
      title: "Eitan window schedule prepared",
      description: `${file.name} was uploaded and converted into a WhatsApp quote request.`,
      metadata: {
        upload_id: uploadId,
        file_name: file.name,
        whatsapp_to: EITAN_WHATSAPP_PHONE,
        item_count: extraction.items.length,
        window_schedule: {
          status: extraction.items.length > 0 ? "prepared_for_quote" : "needs_manual_review",
          notes: extraction.notes,
          items: extraction.items,
        },
      },
    });
  }

  const whatsappUrl = new URL(`https://wa.me/${EITAN_WHATSAPP_PHONE}`);
  whatsappUrl.searchParams.set("text", message);
  redirect(whatsappUrl.toString());
}
