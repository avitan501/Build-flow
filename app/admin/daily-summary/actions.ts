"use server"

import { revalidatePath } from "next/cache"

import { requireManagerPortalProfile } from "@/lib/auth"
import {
  DAILY_WORK_SUMMARY_PREFIX,
  DAILY_WORK_SUMMARY_TITLE_PREFIX,
  isValidDailyWorkDateKey,
  normalizeDailyWorkSummarySections,
  parseDailyWorkSummary,
  serializeDailyWorkSummary,
  type DailyAttendanceAction,
} from "@/lib/daily-work-summary"
import { SUPPLIER_QUOTE_BUCKET } from "@/lib/supplier-quotes"

type SaveDailySummaryResult = { ok: true } | { ok: false; error: string }
type ExistingSummaryRow = { id: string; title: string; details: string | null; updated_at: string }

function validDate(date: string) {
  return isValidDailyWorkDateKey(date)
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

async function updateDailySummaryIfCurrent(
  supabase: Awaited<ReturnType<typeof requireManagerPortalProfile>>["supabase"],
  existing: ExistingSummaryRow,
  values: { details: string; status?: "open" | "completed" },
) {
  return supabase
    .from("manager_goals")
    .update(values)
    .eq("id", existing.id)
    .eq("updated_at", existing.updated_at)
    .select("id")
    .maybeSingle<{ id: string }>()
}

function revalidateDailySummary() {
  revalidatePath("/admin/daily-summary")
  revalidatePath("/admin/build-map")
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
  const sections = normalizeDailyWorkSummarySections({
    completed: input.completed.trim().slice(0, 4000),
    open: input.open.trim().slice(0, 4000),
    problems: input.problems.trim().slice(0, 4000),
  })
  const { completed, open, problems } = sections

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
    pauseStartedAt: current?.pauseStartedAt,
    pausedMilliseconds: current?.pausedMilliseconds,
    paidAt: current?.paidAt,
  })

  if (existing.data) {
    const result = await updateDailySummaryIfCurrent(supabase, existing.data, { details, status: open ? "open" : "completed" })
    if (result.error) return { ok: false, error: "The daily summary could not be saved. Please try again." }
    if (!result.data) return { ok: false, error: "The time log changed while you were editing. Refresh and try again." }
  } else {
    const result = await supabase.from("manager_goals").insert({ assignee: "carlos", title, details, status: open ? "open" : "completed", created_by: user.id })
    if (result.error) return { ok: false, error: "The daily summary could not be saved. Please try again." }
  }

  revalidateDailySummary()
  return { ok: true }
}

export async function recordDailyAttendanceAction(input: {
  date: string
  action: DailyAttendanceAction
  completed?: string
  open?: string
  problems?: string
}): Promise<SaveDailySummaryResult> {
  const { supabase } = await requireManagerPortalProfile()
  const sections = normalizeDailyWorkSummarySections({ completed: input.completed || "", open: input.open || "", problems: input.problems || "" })
  if (!validDate(input.date)) return { ok: false, error: "Choose a valid work date." }
  const { error } = await supabase.rpc("record_carlos_attendance", {
    p_date: input.date, p_action: input.action,
    p_completed: sections.completed, p_open: sections.open, p_problems: sections.problems,
  })
  if (error) return { ok: false, error: "Attendance could not be saved. Check today's date and completed summary, then refresh and try again." }
  revalidateDailySummary()
  return { ok: true }
}

export async function markDailySummaryPaidAction(input: { date: string }): Promise<SaveDailySummaryResult> {
  const { supabase, user } = await requireManagerPortalProfile()
  if (user.email?.trim().toLowerCase() !== "avitanneto@gmail.com") return { ok: false, error: "Only David can mark time as paid." }
  if (!validDate(input.date)) return { ok: false, error: "Choose a valid work date." }
  const { data, error: readError } = await supabase.rpc("carlos_payroll_days")
  const day = (data as Array<{date:string;version:number}> | null)?.find(day => day.date === input.date)
  if (readError || !day) return { ok: false, error: "A completed workday is required." }
  const { error } = await supabase.rpc("set_carlos_day_paid", {p_date:input.date,p_paid:true,p_version:day.version})
  if (error) return { ok: false, error: "Payment status changed. Refresh and try again." }
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
    pauseStartedAt: current?.pauseStartedAt,
    pausedMilliseconds: current?.pausedMilliseconds,
    paidAt: current?.paidAt,
  })
  const title = `${DAILY_WORK_SUMMARY_TITLE_PREFIX}${date}`
  const result = existing.data
    ? await updateDailySummaryIfCurrent(supabase, existing.data, { details, status: "open" })
    : await supabase.from("manager_goals").insert({ assignee: "carlos", title, details, status: "open", created_by: user.id })
  if (result.error || (existing.data && !result.data)) {
    await supabase.storage.from(SUPPLIER_QUOTE_BUCKET).remove([path])
    return { ok: false, error: existing.data && !result.error ? "The time log changed while the image was uploading. Refresh and try again." : "The problem image was uploaded but could not be linked to the summary." }
  }
  revalidateDailySummary()
  return { ok: true }
}
