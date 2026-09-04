"use server"

import { revalidatePath } from "next/cache"

import { requireManagerPortalProfile } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeWebsiteDefectMimeType, verifyWebsiteDefectStorage } from "@/lib/website-defect-upload-validation"
import { canManageWebsiteDefects, canReportWebsiteDefects } from "@/lib/website-defects-access"

const BUCKET = "website-defects"
const MAX_FILE_SIZE = 100 * 1024 * 1024
const MAX_BATCH_FILE_COUNT = 6
const MAX_BATCH_TOTAL_SIZE = 250 * 1024 * 1024
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "video/webm"])
const STATUSES = new Set(["new", "reviewing", "fixing", "ready_to_verify", "resolved"])
const QA_RESULTS = new Set(["not_tested", "pass", "fail", "blocked"])

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

function clean(value: unknown, limit: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, limit)
}

function safeFileName(value: string) {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 180) || "website-defect"
}

async function reporterContext() {
  const context = await requireManagerPortalProfile()
  if (!canReportWebsiteDefects(context.access)) throw new Error("Website Defects is available only to authorized staff.")
  return context
}

async function ownerContext() {
  const context = await requireManagerPortalProfile()
  if (!canManageWebsiteDefects(context.access)) throw new Error("Only the owner can manage website issue status and QA results.")
  return context
}

export async function prepareWebsiteDefectUploadAction(input: { fileName: string; fileType: string; fileSize: number }): Promise<Result<{ defectId: string; filePath: string; token: string }>> {
  const { supabase, user } = await reporterContext()
  const fileName = clean(input.fileName, 240)
  const fileType = normalizeWebsiteDefectMimeType(clean(input.fileType, 100))
  const fileSize = Number(input.fileSize)
  if (!fileName || !ALLOWED_TYPES.has(fileType)) return { ok: false, error: "Choose an MP4, MOV, WebM, JPG, PNG, or WebP file." }
  if (!Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > MAX_FILE_SIZE) return { ok: false, error: "Keep each recording or image up to 100 MB." }

  const defectId = crypto.randomUUID()
  const filePath = `${user.id}/${defectId}/${safeFileName(fileName)}`
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(filePath)
  if (error || !data?.token) return { ok: false, error: "The private upload could not be prepared. Try again." }
  return { ok: true, data: { defectId, filePath, token: data.token } }
}

export async function prepareWebsiteDefectUploadsAction(input: { files: Array<{ fileName: string; fileType: string; fileSize: number }> }): Promise<Result<{ defectId: string; uploads: Array<{ fileName: string; fileType: string; fileSize: number; filePath: string; token: string }> }>> {
  const { supabase, user } = await reporterContext()
  if (!Array.isArray(input.files) || input.files.length < 1 || input.files.length > MAX_BATCH_FILE_COUNT) {
    return { ok: false, error: "Choose between 1 and 6 recordings or images." }
  }
  const files = input.files.map((file) => ({
    fileName: clean(file.fileName, 240),
    fileType: normalizeWebsiteDefectMimeType(clean(file.fileType, 100)),
    fileSize: Number(file.fileSize),
  }))
  if (files.some((file) => !file.fileName || !ALLOWED_TYPES.has(file.fileType))) {
    return { ok: false, error: "Choose only MP4, MOV, WebM, JPG, PNG, or WebP files." }
  }
  if (files.some((file) => !Number.isSafeInteger(file.fileSize) || file.fileSize < 1 || file.fileSize > MAX_FILE_SIZE)) {
    return { ok: false, error: "Keep each recording or image up to 100 MB." }
  }
  if (files.reduce((total, file) => total + file.fileSize, 0) > MAX_BATCH_TOTAL_SIZE) {
    return { ok: false, error: "Keep all files together up to 250 MB." }
  }

  const defectId = crypto.randomUUID()
  const uploads = []
  for (const [index, file] of files.entries()) {
    const filePath = `${user.id}/${defectId}/${String(index + 1).padStart(2, "0")}-${safeFileName(file.fileName)}`
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(filePath)
    if (error || !data?.token) return { ok: false, error: "The private uploads could not be prepared. Try again." }
    uploads.push({ ...file, filePath, token: data.token })
  }
  return { ok: true, data: { defectId, uploads } }
}

export async function completeWebsiteDefectUploadAction(input: { defectId: string; filePath: string; fileName: string; fileType: string; fileSize: number; title?: string; description?: string; pageUrl?: string; priority?: string }): Promise<Result<{ issueNumber: number }>> {
  const { supabase, user } = await reporterContext()
  const fileName = clean(input.fileName, 240)
  const fileType = normalizeWebsiteDefectMimeType(clean(input.fileType, 100))
  const fileSize = Number(input.fileSize)
  const expectedFilePath = `${user.id}/${input.defectId}/${safeFileName(fileName)}`
  if (!fileName || !UUID.test(input.defectId) || input.filePath !== expectedFilePath || !ALLOWED_TYPES.has(fileType) || !Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > MAX_FILE_SIZE) return { ok: false, error: "The uploaded file reference is invalid." }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch {
    return { ok: false, error: "The upload could not be verified right now. Try again." }
  }
  const verified = await verifyWebsiteDefectStorage(
    () => admin.storage.from(BUCKET).info(input.filePath),
    { size: fileSize, type: fileType },
  )
  if (!verified.ok && verified.reason === "unavailable") {
    return { ok: false, error: "The upload is still being verified. Try again in a moment." }
  }
  if (!verified.ok) {
    await admin.storage.from(BUCKET).remove([input.filePath])
    return { ok: false, error: "The uploaded file did not match the selected recording." }
  }

  const description = String(input.description ?? "").trim().slice(0, 4000)
  const fallbackTitle = description.split(/\r?\n/)[0]?.trim() || fileName.replace(/\.[^.]+$/, "") || "Website issue"
  const title = clean(input.title || fallbackTitle, 160)
  const pageUrl = clean(input.pageUrl, 1000)
  const priority = new Set(["normal", "high", "urgent"]).has(String(input.priority)) ? String(input.priority) : "normal"
  const { data, error } = await supabase.from("website_defects").insert({
    id: input.defectId,
    title,
    description,
    page_url: pageUrl,
    status: "new",
    priority,
    file_name: fileName,
    file_path: input.filePath,
    mime_type: verified.actual.type,
    file_size: verified.actual.size,
    assigned_to: "Codex",
    created_by: user.id,
    updated_by: user.id,
  }).select("issue_number").single<{ issue_number: number }>()
  if (error || !data) {
    await admin.storage.from(BUCKET).remove([input.filePath])
    return { ok: false, error: "The issue could not be created. The unfinished upload was removed." }
  }
  revalidatePath("/admin/ai-tools/website-defects")
  return { ok: true, data: { issueNumber: data.issue_number } }
}

export async function completeWebsiteDefectUploadsAction(input: { defectId: string; files: Array<{ fileName: string; fileType: string; fileSize: number; filePath: string }>; title?: string; description?: string; pageUrl?: string; priority?: string }): Promise<Result<{ issueNumber: number }>> {
  const { supabase, user } = await reporterContext()
  if (!UUID.test(input.defectId) || !Array.isArray(input.files) || input.files.length < 1 || input.files.length > MAX_BATCH_FILE_COUNT) {
    return { ok: false, error: "The uploaded file references are invalid." }
  }
  const files = input.files.map((file, index) => ({
    fileName: clean(file.fileName, 240),
    fileType: normalizeWebsiteDefectMimeType(clean(file.fileType, 100)),
    fileSize: Number(file.fileSize),
    filePath: String(file.filePath ?? ""),
    position: index,
  }))
  const hasInvalidFile = files.some((file) => {
    const expectedPath = `${user.id}/${input.defectId}/${String(file.position + 1).padStart(2, "0")}-${safeFileName(file.fileName)}`
    return !file.fileName
      || !ALLOWED_TYPES.has(file.fileType)
      || !Number.isSafeInteger(file.fileSize)
      || file.fileSize < 1
      || file.fileSize > MAX_FILE_SIZE
      || file.filePath !== expectedPath
  })
  if (hasInvalidFile || files.reduce((total, file) => total + file.fileSize, 0) > MAX_BATCH_TOTAL_SIZE) {
    return { ok: false, error: "The uploaded file references are invalid." }
  }

  const verification = await Promise.all(files.map(async (file) => ({
    file,
    result: await verifyWebsiteDefectStorage(
      () => supabase.storage.from(BUCKET).info(file.filePath),
      { size: file.fileSize, type: file.fileType },
    ),
  })))
  if (verification.some(({ result }) => !result.ok && result.reason === "unavailable")) {
    return { ok: false, error: "The uploads are still being verified. Try again in a moment." }
  }
  if (verification.some(({ result }) => !result.ok)) {
    try {
      await createAdminClient().storage.from(BUCKET).remove(files.map((file) => file.filePath))
    } catch {
      // Verification must not depend on the optional service-role cleanup client.
    }
    return { ok: false, error: "One of the uploaded files did not match the selected recording or image." }
  }

  const verifiedFiles = verification.map(({ file, result }) => {
    if (!result.ok) throw new Error("Unreachable unverified website defect file")
    return { ...file, fileSize: result.actual.size, fileType: result.actual.type }
  })
  const primary = verifiedFiles[0]
  const description = String(input.description ?? "").trim().slice(0, 4000)
  const fallbackTitle = description.split(/\r?\n/)[0]?.trim() || primary.fileName.replace(/\.[^.]+$/, "") || "Website issue"
  const title = clean(input.title || fallbackTitle, 160)
  const pageUrl = clean(input.pageUrl, 1000)
  const priority = new Set(["normal", "high", "urgent"]).has(String(input.priority)) ? String(input.priority) : "normal"
  const extraFiles = verifiedFiles.slice(1).map((file) => ({
    position: file.position,
    storage_bucket: BUCKET,
    file_name: file.fileName,
    file_path: file.filePath,
    mime_type: file.fileType,
    file_size: file.fileSize,
  }))

  const issuePayload = {
    id: input.defectId,
    title,
    description,
    page_url: pageUrl,
    status: "new",
    priority,
    file_name: primary.fileName,
    file_path: primary.filePath,
    mime_type: primary.fileType,
    file_size: primary.fileSize,
    assigned_to: "Codex",
  }
  const { data: issueNumber, error } = await supabase.rpc("create_website_defect_batch", {
    p_issue: issuePayload,
    p_attachments: extraFiles,
  })
  const savedIssueNumber = Number(issueNumber)
  if (error || !Number.isSafeInteger(savedIssueNumber) || savedIssueNumber < 1) {
    const { data: existing } = await supabase.from("website_defects")
      .select("issue_number,created_by,file_name,file_path,mime_type,file_size")
      .eq("id", input.defectId)
      .maybeSingle<{ issue_number: number; created_by: string; file_name: string; file_path: string; mime_type: string; file_size: number }>()
    if (existing?.created_by === user.id
      && existing.file_name === primary.fileName
      && existing.file_path === primary.filePath
      && existing.mime_type === primary.fileType
      && Number(existing.file_size) === primary.fileSize) {
      const { data: existingAttachments } = await supabase.from("website_defect_attachments")
        .select("position,file_name,file_path,mime_type,file_size")
        .eq("defect_id", input.defectId)
        .order("position", { ascending: true })
        .returns<Array<{ position: number; file_name: string; file_path: string; mime_type: string; file_size: number }>>()
      const exactManifest = (existingAttachments?.length ?? -1) === extraFiles.length
        && extraFiles.every((file, index) => {
          const saved = existingAttachments?.[index]
          return saved?.position === file.position
            && saved.file_name === file.file_name
            && saved.file_path === file.file_path
            && saved.mime_type === file.mime_type
            && Number(saved.file_size) === file.file_size
        })
      if (exactManifest) return { ok: true, data: { issueNumber: existing.issue_number } }
    }
    return { ok: false, error: "The issue files could not be saved together. Try again; uploaded files were kept safely." }
  }
  revalidatePath("/admin/ai-tools/website-defects")
  return { ok: true, data: { issueNumber: savedIssueNumber } }
}

export async function updateWebsiteDefectAction(input: { id: string; title?: string; description?: string; pageUrl?: string; reviewNotes?: string; status?: string; priority?: string }): Promise<Result> {
  const { supabase, user } = await ownerContext()
  if (!UUID.test(input.id)) return { ok: false, error: "Issue not found." }
  const update: Record<string, unknown> = { updated_by: user.id }
  if (input.title !== undefined) {
    const title = clean(input.title, 160)
    if (title.length < 2) return { ok: false, error: "Add a short issue title." }
    update.title = title
  }
  if (input.description !== undefined) update.description = String(input.description).trim().slice(0, 4000)
  if (input.pageUrl !== undefined) update.page_url = clean(input.pageUrl, 1000)
  if (input.reviewNotes !== undefined) update.review_notes = String(input.reviewNotes).trim().slice(0, 4000)
  if (input.status !== undefined) {
    if (!STATUSES.has(input.status)) return { ok: false, error: "Choose a valid issue status." }
    update.status = input.status
  }
  if (input.priority !== undefined) {
    if (!new Set(["normal", "high", "urgent"]).has(input.priority)) return { ok: false, error: "Choose a valid priority." }
    update.priority = input.priority
  }
  const { error } = await supabase.from("website_defects").update(update).eq("id", input.id)
  if (error) return { ok: false, error: "The issue could not be updated." }
  revalidatePath("/admin/ai-tools/website-defects")
  return { ok: true, data: undefined }
}

export async function recordWebsiteQaCheckAction(input: { id: string; result: string; notes?: string }): Promise<Result> {
  const { supabase, user } = await ownerContext()
  const id = clean(input.id, 100)
  if (!/^[a-z0-9-]+$/.test(id) || !QA_RESULTS.has(input.result)) return { ok: false, error: "Choose a valid test and result." }
  const { error } = await supabase.from("website_qa_checks").update({
    last_result: input.result,
    last_notes: String(input.notes ?? "").trim().slice(0, 2000),
    last_checked_at: new Date().toISOString(),
    last_checked_by: user.id,
    updated_at: new Date().toISOString(),
  }).eq("id", id)
  if (error) return { ok: false, error: "The test result could not be saved." }
  revalidatePath("/admin/ai-tools/website-defects")
  return { ok: true, data: undefined }
}
