"use server"

import { revalidatePath } from "next/cache"

import { requireManagerPortalProfile } from "@/lib/auth"
import { DAILY_WORK_SUMMARY_PREFIX, DAILY_WORK_SUMMARY_TITLE_PREFIX, parseDailyWorkSummary, serializeDailyWorkSummary } from "@/lib/daily-work-summary"

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
}): Promise<SaveDailySummaryResult> {
  const { supabase, user } = await requireManagerPortalProfile()
  const date = input.date.trim()
  const completed = input.completed.trim().slice(0, 4000)
  const open = input.open.trim().slice(0, 4000)

  if (!validDate(date)) return { ok: false, error: "Choose a valid work date." }
  if (!completed && !open) return { ok: false, error: "Add what was completed or what is still open." }

  const title = `${DAILY_WORK_SUMMARY_TITLE_PREFIX}${date}`
  const existing = await findDailySummary(supabase, date)

  if (existing.error) return { ok: false, error: "The daily summary could not be checked. Please try again." }
  const current = existing.data ? parseDailyWorkSummary(existing.data) : null
  const details = serializeDailyWorkSummary({
    date,
    completed,
    open,
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
  const details = serializeDailyWorkSummary({ date, completed, open, checkInAt, checkOutAt })
  const status = open || (checkInAt && !checkOutAt) ? "open" : "completed"
  const title = `${DAILY_WORK_SUMMARY_TITLE_PREFIX}${date}`
  const result = existing.data
    ? await supabase.from("manager_goals").update({ details, status }).eq("id", existing.data.id)
    : await supabase.from("manager_goals").insert({ assignee: "carlos", title, details, status, created_by: user.id })

  if (result.error) return { ok: false, error: "Attendance could not be saved. Please try again." }

  revalidateDailySummary()
  return { ok: true }
}
