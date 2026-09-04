"use server"

import { revalidatePath } from "next/cache"

import { requireManagerPortalProfile } from "@/lib/auth"
import {
  fallbackCarlosActivityReview,
  serializeCarlosActivityAiReview,
  type CarlosWebsiteIssue,
} from "@/lib/carlos-activity-review"
import { newYorkBusinessDayRange } from "@/lib/carlos-daily-goals"
import { DAILY_WORK_SUMMARY_PREFIX, parseDailyWorkSummary } from "@/lib/daily-work-summary"
import type { ManagerStaffActivityEvent } from "@/lib/manager-staff-activity"

type ReviewResult = { ok: true; answer: string; generatedAt: string; eventCount: number } | { ok: false; error: string }

function clean(value: unknown, limit: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit)
}

export async function analyzeCarlosActivityAction(): Promise<ReviewResult> {
  const { supabase, user, access } = await requireManagerPortalProfile()
  if (!access.owner) return { ok: false, error: "Only the owner can run an employee activity review." }

  const day = newYorkBusinessDayRange()
  if (!day) return { ok: false, error: "Today’s New York work date could not be determined." }

  const staff = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "staff")
    .eq("email", "buildavantiap@gmail.com")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle<{ id: string }>()
  if (staff.error || !staff.data) return { ok: false, error: "Carlos’s active employee profile was not found." }

  const [activityResult, summaryResult, websiteIssuesResult] = await Promise.all([
    supabase
      .from("manager_staff_activity_events")
      .select("id,user_id,event_type,page_path,page_label,metadata,occurred_at")
      .eq("user_id", staff.data.id)
      .gte("occurred_at", day.start)
      .lt("occurred_at", day.end)
      .order("occurred_at", { ascending: true })
      .limit(500)
      .returns<ManagerStaffActivityEvent[]>(),
    supabase
      .from("manager_goals")
      .select("id,title,details,updated_at")
      .eq("assignee", "carlos")
      .eq("title", `Daily summary - ${day.dateKey}`)
      .like("details", `${DAILY_WORK_SUMMARY_PREFIX}%`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; title: string; details: string | null; updated_at: string }>(),
    supabase
      .from("website_defects")
      .select("title,status,priority")
      .eq("created_by", staff.data.id)
      .gte("created_at", day.start)
      .lt("created_at", day.end)
      .order("created_at", { ascending: true })
      .limit(100)
      .returns<CarlosWebsiteIssue[]>(),
  ])
  if (activityResult.error) return { ok: false, error: "Today’s activity could not be loaded." }

  const events = activityResult.data ?? []
  const dailySummary = summaryResult.data ? parseDailyWorkSummary(summaryResult.data) : null
  const websiteIssues = websiteIssuesResult.error ? [] : websiteIssuesResult.data ?? []
  const safeEvents = events.map((event) => ({
    at: event.occurred_at,
    type: event.event_type,
    area: clean(event.page_label, 100),
    path: clean(event.page_path, 180),
    channel: clean(event.metadata?.channel, 30),
    outcome: clean(event.metadata?.outcome, 40),
    action: clean(event.metadata?.label, 120),
    request: clean(event.metadata?.request, 120),
  }))
  const reportedProblems = dailySummary?.problems ?? ""
  const fallback = fallbackCarlosActivityReview(events, reportedProblems, websiteIssues)
  const context = JSON.stringify({
    workDate: day.dateKey,
    trackedEvents: safeEvents,
    employeeSummary: {
      completed: clean(dailySummary?.completed, 1200),
      open: clean(dailySummary?.open, 1200),
      problems: clean(reportedProblems, 1200),
    },
    websiteIssues: websiteIssues.map((issue) => ({
      title: clean(issue.title, 160),
      status: clean(issue.status, 40),
      priority: clean(issue.priority, 40),
    })),
  })

  let answer = ""
  try {
    const response = await supabase.functions.invoke<{ ok?: boolean; answer?: string }>("aura-messaging-broker", {
      body: {
        action: "dashboard_ai",
        model: "terra",
        query: "Review Carlos’s Avantia activity for this New York workday. Write exactly three short sections: Results, Possible problems, and Recommended next steps. Use only the supplied tracked activity, employee summary, and website issues. Treat websiteIssues as the authoritative count of issues submitted from Carlos's account; do not copy an unverified issue count from free text. Point out failed communications, unusually repeated steps, work that may not have been saved, and reported website problems. Do not invent facts, productivity, recipients, message contents, or work outside the tracked browser.",
        context,
      },
    })
    if (!response.error && response.data?.ok) answer = clean(response.data.answer, 5000)
  } catch {
    answer = ""
  }
  if (!answer) answer = fallback

  const generatedAt = new Date().toISOString()
  const details = serializeCarlosActivityAiReview({ date: day.dateKey, answer, generatedAt, eventCount: events.length })
  const title = `Carlos AI review - ${day.dateKey}`
  const existing = await supabase
    .from("manager_goals")
    .select("id")
    .eq("created_by", user.id)
    .eq("title", title)
    .limit(1)
    .maybeSingle<{ id: string }>()
  const saved = existing.data
    ? await supabase.from("manager_goals").update({ details, status: "completed" }).eq("id", existing.data.id)
    : await supabase.from("manager_goals").insert({ assignee: "david", title, details, status: "completed", created_by: user.id })
  if (existing.error || saved.error) return { ok: false, error: "The review was prepared but could not be saved." }

  revalidatePath("/admin/carlos-activity")
  return { ok: true, answer, generatedAt, eventCount: events.length }
}
