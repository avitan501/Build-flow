"use server"

import { revalidatePath } from "next/cache"

import { requireManagerPortalProfile } from "@/lib/auth"
import { DAILY_WORK_SUMMARY_PREFIX, DAILY_WORK_SUMMARY_TITLE_PREFIX, parseDailyWorkSummary, serializeDailyWorkSummary } from "@/lib/daily-work-summary"
import { SUPPLIER_QUOTE_BUCKET } from "@/lib/supplier-quotes"

type SaveDailySummaryResult = { ok: true } | { ok: false; error: string }
type ExistingSummaryRow = { id: string; title: string; details: string | null; updated_at: string }

function validDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T12:00:00Z`))
}

function newYorkDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

async function findDailySummary(supabase: Awaited<ReturnType<typeof requireManagerPortalProfile>>["supabase"], date: string) {
  return supabase
    .from("manager_goals")
    .select("id,title,details,updated_at")
    .eq("assignee", "carlos")
    .eq("title", `${DAILY_WORK_SUMMARY_TITLE_PREFIX}${date}`)
    .like("details", `${DAILY_WORK_SUMMARY_PREFIX}%`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<ExistingSummaryRow>()
}

function revalidateDailySummary() {
  revalidatePath("/admin/daily-summary")
  revalidatePath("/admin/goals-progress")
}

export async function saveDailyWorkSummaryAction(input: {
  date: string
  completed: string
  open: string
  problems: string
}): Promise<SaveDailySummaryResult> {
  const { supabase, user } = await requireManagerPortalProfile()
  const date = input.date.trim()
  const completed = input.completed.trim().slice(0, 4000)
  const open = input.open.trim().slice(0, 4000)
  const problems = input.problems.trim().slice(0, 4000)

  if (!validDate(date)) return { ok: false, error: "Choose a valid work date." }
  if (!completed && !open && !problems) return { ok: false, error: "Add completed work, open work, or a website problem." }

  const title = `${DAILY_WORK_SUMMARY_TITLE_PREFIX}${date}`
  const existing = await findDailySummary(supabase, date)

  if (existing.error) return { ok: false, error: "The daily summary could not be checked. Please try again." }
  const current = existing.data ? parseDailyWorkSummary(existing.data) : null
  const details = serializeDailyWorkSummary({
    date,
    completed,
    open,
    problems,
    problemAttachments: current?.problemAttachments ?? [],
    checkInAt: current?.checkInAt,
    checkOutAt: current?.checkOutAt,
  })

  const result = existing.data
    ? await supabase.from("manager_goals").update({ details, status: open ? "open" : "completed" }).eq("id", existing.data.id)
    : await supabase.from("manager_goals").insert({ assignee: "carlos", title, details, status: open ? "open" : "completed", created_by: user.id })

  if (result.error) return { ok: false, error: "The daily summary could not be saved. Please try again." }

  revalidateDailySummary()
  return { ok: true }
}

export async function recordDailyAttendanceAction(input: {
  date: string
  action: "check_in" | "check_out"
}): Promise<SaveDailySummaryResult> {
  const { supabase, user } = await requireManagerPortalProfile()
  const date = input.date.trim()
  const now = new Date()

  if (!validDate(date)) return { ok: false, error: "Choose a valid work date." }
  if (date !== newYorkDate(now)) return { ok: false, error: "Check in and check out are available only for today." }

  const existing = await findDailySummary(supabase, date)
  if (existing.error) return { ok: false, error: "Attendance could not be checked. Please try again." }

  const current = existing.data ? parseDailyWorkSummary(existing.data) : null
  if (input.action === "check_in" && current?.checkInAt) return { ok: false, error: "Carlos is already checked in for today." }
  if (input.action === "check_out" && !current?.checkInAt) return { ok: false, error: "Carlos must check in before checking out." }
  if (input.action === "check_out" && current?.checkOutAt) return { ok: false, error: "Carlos is already checked out for today." }

  const checkInAt = input.action === "check_in" ? now.toISOString() : current?.checkInAt ?? null
  const checkOutAt = input.action === "check_out" ? now.toISOString() : current?.checkOutAt ?? null
  const completed = current?.completed ?? ""
  const open = current?.open ?? ""
  const problems = current?.problems ?? ""
  const details = serializeDailyWorkSummary({ date, completed, open, problems, problemAttachments: current?.problemAttachments ?? [], checkInAt, checkOutAt })
  const status = open || (checkInAt && !checkOutAt) ? "open" : "completed"
  const title = `${DAILY_WORK_SUMMARY_TITLE_PREFIX}${date}`
  const result = existing.data
    ? await supabase.from("manager_goals").update({ details, status }).eq("id", existing.data.id)
    : await supabase.from("manager_goals").insert({ assignee: "carlos", title, details, status, created_by: user.id })

  if (result.error) return { ok: false, error: "Attendance could not be saved. Please try again." }

  revalidateDailySummary()
  return { ok: true }
}

export async function uploadDailyProblemPhotoAction(formData: FormData): Promise<SaveDailySummaryResult> {
  const { supabase, user } = await requireManagerPortalProfile()
  const date = String(formData.get("date") || "").trim()
  const file = formData.get("photo")
  if (!validDate(date)) return { ok: false, error: "Choose a valid work date." }
  if (!(file instanceof File) || !file.size) return { ok: false, error: "Choose a problem screenshot or photo." }
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) return { ok: false, error: "Use a JPG, PNG, or WebP image." }
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: "The image must be 10 MB or smaller." }

  const existing = await findDailySummary(supabase, date)
  if (existing.error) return { ok: false, error: "The daily summary could not be checked." }
  const current = existing.data ? parseDailyWorkSummary(existing.data) : null
  if ((current?.problemAttachments.length ?? 0) >= 8) return { ok: false, error: "A daily summary can contain up to 8 problem images." }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100) || "problem-image"
  const path = `${user.id}/daily-issues/${date}/${crypto.randomUUID()}-${safeName}`
  const upload = await supabase.storage.from(SUPPLIER_QUOTE_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (upload.error) return { ok: false, error: "The problem image could not be uploaded." }

  const problemAttachments = [...(current?.problemAttachments ?? []), { name: file.name.slice(0, 160), path, type: file.type, size: file.size }]
  const details = serializeDailyWorkSummary({
    date,
    completed: current?.completed ?? "",
    open: current?.open ?? "",
    problems: current?.problems ?? "",
    problemAttachments,
    checkInAt: current?.checkInAt,
    checkOutAt: current?.checkOutAt,
  })
  const title = `${DAILY_WORK_SUMMARY_TITLE_PREFIX}${date}`
  const result = existing.data
    ? await supabase.from("manager_goals").update({ details, status: "open" }).eq("id", existing.data.id)
    : await supabase.from("manager_goals").insert({ assignee: "carlos", title, details, status: "open", created_by: user.id })
  if (result.error) {
    await supabase.storage.from(SUPPLIER_QUOTE_BUCKET).remove([path])
    return { ok: false, error: "The problem image was uploaded but could not be linked to the summary." }
  }
  revalidateDailySummary()
  return { ok: true }
}
