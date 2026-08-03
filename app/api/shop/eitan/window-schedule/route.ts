import { NextResponse } from "next/server";

import { getSessionWithProfile } from "@/lib/auth";
import {
  buildProjectUploadStoragePath,
  createProjectEvent,
  PROJECT_UPLOAD_MAX_FILE_SIZE_BYTES,
  PROJECT_UPLOAD_STORAGE_BUCKET,
  type ProjectRecord,
} from "@/lib/projects";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractWindowScheduleFromFile, extractWindowScheduleFromText, type ExtractedWindowScheduleItem } from "@/lib/window-schedule-extraction";

export const maxDuration = 60;

const EITAN_WHATSAPP_PHONE = "17189409400";
const DAVID_WHATSAPP_PHONE = "13475675077";
const WHATSAPP_MESSAGE_MAX_LENGTH = 3500;
const WHATSAPP_RELAY_TIMEOUT_MS = 45_000;
const EITAN_PLAN_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

type RelayResult = {
  ok: boolean;
  phone: string;
  error?: string;
  detail?: string;
};

function jsonError(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function sendViaWhatsAppRelay(params: { phone: string; message: string }): Promise<RelayResult> {
  const relayUrl = process.env.EITAN_WHATSAPP_RELAY_URL;
  const relayToken = process.env.EITAN_WHATSAPP_RELAY_TOKEN;

  if (!relayUrl || !relayToken) {
    return { ok: false, phone: params.phone, error: "relay-not-configured" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WHATSAPP_RELAY_TIMEOUT_MS);

  try {
    const response = await fetch(relayUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${relayToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });
    const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; detail?: string } | null;

    return {
      ok: response.ok && Boolean(payload?.ok),
      phone: params.phone,
      error: payload?.error || (response.ok ? undefined : `relay-http-${response.status}`),
      detail: payload?.detail,
    };
  } catch (error) {
    return {
      ok: false,
      phone: params.phone,
      error: error instanceof Error && error.name === "AbortError" ? "relay-timeout" : "relay-request-failed",
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function cleanupFailedEitanUpload(params: { uploadId: string; filePath: string }) {
  try {
    const admin = createAdminClient();
    await admin.from("project_uploads").delete().eq("id", params.uploadId);
    await admin.storage.from(PROJECT_UPLOAD_STORAGE_BUCKET).remove([params.filePath]);
  } catch (error) {
    console.error("Eitan upload cleanup failed", error);
  }
}

function normalizeCopyToPhone(value: string) {
  const normalized = value.replace(/[^\d+()\-\s.]/g, "").trim();
  const digitCount = normalized.replace(/\D/g, "").length;

  return digitCount >= 7 && digitCount <= 15 ? normalized : "";
}

function formatWindowScheduleLine(item: ExtractedWindowScheduleItem, index: number) {
  const mark = item.mark || `Window ${index + 1}`;
  const size = [item.width, item.height].filter(Boolean).join(" x ") || "size not listed";
  const roughOpening = [item.roughOpeningWidth, item.roughOpeningHeight].filter(Boolean).join(" x ");
  return [
    `${index + 1}. ${mark}`,
    `Qty: ${item.quantity || 1}`,
    `Size: ${size}`,
    roughOpening ? `RO: ${roughOpening}` : null,
    item.location ? `Location: ${item.location}` : null,
    item.windowType ? `Type: ${item.windowType}` : null,
    item.glass ? `Glass: ${item.glass}` : null,
    item.operation ? `Operation: ${item.operation}` : null,
    item.notes ? `Notes: ${item.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n   ");
}

function buildWindowScheduleWhatsAppMessage(params: {
  projectName: string;
  fileName: string;
  items: ExtractedWindowScheduleItem[];
  notes: string;
  copyToPhone: string;
}) {
  const itemLines: string[] = [];

  for (const item of params.items) {
    const nextLine = formatWindowScheduleLine(item, itemLines.length);
    const previewMessage = [
      "Here is the window schedule to quote please revise and come back with questions.",
      params.copyToPhone ? `Please also copy/reply to: ${params.copyToPhone}` : "",
      "",
      "WINDOW SCHEDULE",
      [...itemLines, nextLine].join("\n"),
    ].join("\n");

    if (previewMessage.length > WHATSAPP_MESSAGE_MAX_LENGTH) {
      break;
    }

    itemLines.push(nextLine);
  }

  const omittedCount = Math.max(params.items.length - itemLines.length, 0);
  const moreLine = omittedCount > 0 ? [`...${omittedCount} more window schedule rows not shown. Review the uploaded source file for the full schedule.`] : [];
  const scheduleText = [...itemLines, ...moreLine].join("\n\n");

  return [
    "Here is the window schedule to quote please revise and come back with questions.",
    params.copyToPhone ? `Please also copy/reply to: ${params.copyToPhone}` : "",
    "",
    "WINDOW SCHEDULE",
    `Project: ${params.projectName}`,
    `File: ${params.fileName}`,
    "",
    scheduleText,
  ].join("\n");
}

export async function POST(request: Request) {
  try {
  const { supabase, user } = await getSessionWithProfile();
  const contentType = request.headers.get("content-type") || "";
  const isJsonRequest = contentType.includes("application/json");
  const payload = isJsonRequest ? await request.json() as Record<string, unknown> : null;
  const formData = isJsonRequest ? null : await request.formData();
  const projectId = String((isJsonRequest ? payload?.projectId : formData?.get("projectId")) || "").trim();
  const recipientMode = String((isJsonRequest ? payload?.recipientMode : formData?.get("recipientMode")) || "david").trim();
  const whatsappTargetPhone = recipientMode === "supplier" ? EITAN_WHATSAPP_PHONE : DAVID_WHATSAPP_PHONE;
  const copyToPhone = normalizeCopyToPhone(String((isJsonRequest ? payload?.copyToPhone : formData?.get("copyToPhone")) || ""));
  const extractedText = typeof payload?.extractedText === "string" ? payload.extractedText.trim() : "";
  const extractedFileName = typeof payload?.fileName === "string" && payload.fileName.trim() ? payload.fileName.trim() : "Uploaded plan";
  const fileEntry = formData?.get("file");

  if (!isJsonRequest && (!(fileEntry instanceof File) || fileEntry.size === 0)) {
    return jsonError("file-required");
  }

  const file = fileEntry instanceof File ? fileEntry : null;

  if (!isJsonRequest && file && !EITAN_PLAN_ALLOWED_MIME_TYPES.includes(file.type as (typeof EITAN_PLAN_ALLOWED_MIME_TYPES)[number])) {
    return jsonError("file-type-not-allowed");
  }

  if (!isJsonRequest && file && file.size > PROJECT_UPLOAD_MAX_FILE_SIZE_BYTES) {
    return jsonError("file-too-large");
  }

  if (isJsonRequest && !extractedText) {
    return jsonError("pdf-text-required");
  }

  let project: ProjectRecord | null = null;
  let uploadId: string | null = null;
  let filePath: string | null = null;

  if (!isJsonRequest && user && projectId && file) {
    const { data: selectedProject, error: projectError } = await supabase
      .from("projects")
      .select("id, owner_id, name, address, status, created_at, updated_at")
      .eq("id", projectId)
      .eq("owner_id", user.id)
      .maybeSingle<ProjectRecord>();

    if (projectError || !selectedProject) {
      return jsonError("project-not-found");
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
      console.error("Eitan plan storage error", storageError);
      return jsonError("storage-upload-failed", 500);
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
      console.error("Eitan plan upload metadata error", uploadInsertError);
      await cleanupFailedEitanUpload({ uploadId, filePath });
      return jsonError("metadata-insert-failed", 500);
    }
  }

  let extraction;
  try {
    if (isJsonRequest) {
      extraction = await extractWindowScheduleFromText(extractedText, extractedFileName);
    } else if (file) {
      extraction = await extractWindowScheduleFromFile(file);
    } else {
      extraction = {
        items: [],
        notes: "No uploaded file or extracted text was provided.",
      };
    }
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
      console.error("Eitan plan upload status update failed", statusUpdateError);
    }

    await createProjectEvent({
      supabase,
      projectId: project.id,
      ownerId: user.id,
      eventType: "file_uploaded",
      source: "upload",
      title: "Eitan window schedule prepared",
      description: `${file?.name || extractedFileName} was uploaded and converted into a WhatsApp quote request.`,
      metadata: {
        upload_id: uploadId,
        file_name: file?.name || extractedFileName,
        whatsapp_to: whatsappTargetPhone,
        item_count: extraction.items.length,
        window_schedule: {
          status: extraction.items.length > 0 ? "prepared_for_quote" : "needs_manual_review",
          notes: extraction.notes,
          items: extraction.items,
        },
      },
    });
  }

  if (extraction.items.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "window-schedule-not-found",
      notes: extraction.notes,
      itemCount: 0,
    });
  }

  const message = buildWindowScheduleWhatsAppMessage({
    projectName: project?.name || "Eitan shop upload",
    fileName: file?.name || extractedFileName,
    items: extraction.items,
    notes: extraction.notes,
    copyToPhone,
  });

  const whatsappUrl = new URL(`https://wa.me/${whatsappTargetPhone}`);
  whatsappUrl.searchParams.set("text", message);
  const relayTargets = recipientMode === "supplier" ? [EITAN_WHATSAPP_PHONE, DAVID_WHATSAPP_PHONE] : [DAVID_WHATSAPP_PHONE];
  const relayResults = await Promise.all(relayTargets.map((phone) => sendViaWhatsAppRelay({ phone, message })));
  const allRelaySendsOk = relayResults.every((result) => result.ok);

  return NextResponse.json({
    ok: true,
    whatsappUrl: whatsappUrl.toString(),
    sent: allRelaySendsOk,
    delivery: relayResults,
    itemCount: extraction.items.length,
  });
  } catch (error) {
    console.error("Eitan window schedule route failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: "server-error",
        detail: error instanceof Error ? error.message : "Unexpected server error",
      },
      { status: 500 },
    );
  }
}
