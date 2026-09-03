"use server"

import { revalidatePath } from "next/cache"

import { requireManagerPortalProfile } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"

const BUCKET = "website-defects"
const MAX_FILE_SIZE = 100 * 1024 * 1024
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

async function managerContext() {
  const context = await requireManagerPortalProfile()
  if (!context.access.aiTools) throw new Error("Website Defects is available only to authorized managers.")
  return context
}

export async function prepareWebsiteDefectUploadAction(input: { fileName: string; fileType: string; fileSize: number }): Promise<Result<{ defectId: string; filePath: string; token: string }>> {
  const { supabase, user } = await managerContext()
  const fileName = clean(input.fileName, 240)
  const fileType = clean(input.fileType, 100).toLowerCase()
  const fileSize = Number(input.fileSize)
  if (!fileName || !ALLOWED_TYPES.has(fileType)) return { ok: false, error: "Choose an MP4, MOV, WebM, JPG, PNG, or WebP file." }
  if (!Number.isFinite(fileSize) || fileSize < 1 || fileSize > MAX_FILE_SIZE) return { ok: false, error: "Keep each recording or image under 100 MB." }

  const defectId = crypto.randomUUID()
  const filePath = `${user.id}/${defectId}/${safeFileName(fileName)}`
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(filePath)
  if (error || !data?.token) return { ok: false, error: "The private upload could not be prepared. Try again." }
  return { ok: true, data: { defectId, filePath, token: data.token } }
}

export async function completeWebsiteDefectUploadAction(input: { defectId: string; filePath: string; fileName: string; fileType: string; fileSize: number; title?: string; description?: string; pageUrl?: string; priority?: string }): Promise<Result<{ issueNumber: number }>> {
  const { supabase, user } = await managerContext()
  const fileName = clean(input.fileName, 240)
  const fileType = clean(input.fileType, 100).toLowerCase()
  const fileSize = Number(input.fileSize)
  const expectedPrefix = `${user.id}/${input.defectId}/`
  if (!UUID.test(input.defectId) || !input.filePath.startsWith(expectedPrefix) || !ALLOWED_TYPES.has(fileType) || fileSize < 1 || fileSize > MAX_FILE_SIZE) return { ok: false, error: "The uploaded file reference is invalid." }

  const admin = createAdminClient()
  const { data: stored, error: storedError } = await admin.storage.from(BUCKET).info(input.filePath)
  if (storedError || !stored) return { ok: false, error: "The upload did not finish. Try it again." }
  const storedSize = Number(stored.size)
  if (!Number.isFinite(storedSize) || storedSize !== fileSize || stored.contentType !== fileType) {
    await admin.storage.from(BUCKET).remove([input.filePath])
    return { ok: false, error: "The uploaded file did not match the selected recording." }
  }
  if (storedSize > MAX_FILE_SIZE) {
    await admin.storage.from(BUCKET).remove([input.filePath])
    return { ok: false, error: "The uploaded file is larger than 100 MB." }
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
    mime_type: fileType,
    file_size: fileSize,
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

export async function updateWebsiteDefectAction(input: { id: string; title?: string; description?: string; pageUrl?: string; reviewNotes?: string; status?: string; priority?: string }): Promise<Result> {
  const { supabase, user } = await managerContext()
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
  const { supabase, user } = await managerContext()
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
