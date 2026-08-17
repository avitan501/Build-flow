"use server"

import { revalidatePath } from "next/cache"

import { requireManagerPortalProfile } from "@/lib/auth"
import { DAILY_WORK_SUMMARY_PREFIX, DAILY_WORK_SUMMARY_TITLE_PREFIX, serializeDailyWorkSummary } from "@/lib/daily-work-summary"

type SaveDailySummaryResult = { ok: true } | { ok: false; error: string }

export async function saveDailyWorkSummaryAction(input: {
  date: string
  completed: string
  open: string
}): Promise<SaveDailySummaryResult> {
  const { supabase, user } = await requireManagerPortalProfile()
  const date = input.date.trim()
  const completed = input.completed.trim().slice(0, 4000)
  const open = input.open.trim().slice(0, 4000)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`))) {
    return { ok: false, error: "Choose a valid work date." }
  }
  if (!completed && !open) return { ok: false, error: "Add what was completed or what is still open." }

  const title = `${DAILY_WORK_SUMMARY_TITLE_PREFIX}${date}`
  const details = serializeDailyWorkSummary({ date, completed, open })
  const existing = await supabase
    .from("manager_goals")
    .select("id")
    .eq("assignee", "carlos")
    .eq("title", title)
    .like("details", `${DAILY_WORK_SUMMARY_PREFIX}%`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (existing.error) return { ok: false, error: "The daily summary could not be checked. Please try again." }

  const result = existing.data
    ? await supabase.from("manager_goals").update({ details, status: open ? "open" : "completed" }).eq("id", existing.data.id)
    : await supabase.from("manager_goals").insert({ assignee: "carlos", title, details, status: open ? "open" : "completed", created_by: user.id })

  if (result.error) return { ok: false, error: "The daily summary could not be saved. Please try again." }

  revalidatePath("/admin/daily-summary")
  revalidatePath("/admin/goals-progress")
  return { ok: true }
}
