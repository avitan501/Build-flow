import type { ManagerStaffActivityEvent } from "@/lib/manager-staff-activity"

export const CARLOS_ACTIVITY_AI_REVIEW_PREFIX = "carlos_activity_ai_review_v1:"

export type CarlosActivityAiReview = {
  date: string
  answer: string
  generatedAt: string
  eventCount: number
}

export function serializeCarlosActivityAiReview(value: CarlosActivityAiReview) {
  return `${CARLOS_ACTIVITY_AI_REVIEW_PREFIX}${JSON.stringify(value)}`
}

export function parseCarlosActivityAiReview(value: string | null | undefined): CarlosActivityAiReview | null {
  if (!value?.startsWith(CARLOS_ACTIVITY_AI_REVIEW_PREFIX)) return null
  try {
    const parsed = JSON.parse(value.slice(CARLOS_ACTIVITY_AI_REVIEW_PREFIX.length)) as Partial<CarlosActivityAiReview>
    if (typeof parsed.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) return null
    if (typeof parsed.answer !== "string" || !parsed.answer.trim()) return null
    if (typeof parsed.generatedAt !== "string" || Number.isNaN(Date.parse(parsed.generatedAt))) return null
    return {
      date: parsed.date,
      answer: parsed.answer.slice(0, 5000),
      generatedAt: parsed.generatedAt,
      eventCount: Math.max(0, Math.floor(Number(parsed.eventCount) || 0)),
    }
  } catch {
    return null
  }
}

export function fallbackCarlosActivityReview(events: ManagerStaffActivityEvent[], reportedProblems = "") {
  const communications = events.filter((event) => event.event_type === "communication_sent")
  const completed = communications.filter((event) => ["sent", "completed"].includes(event.metadata?.outcome || "sent"))
  const failed = communications.filter((event) => ["failed", "provider_unconfirmed", "no_answer"].includes(event.metadata?.outcome || ""))
  const changes = events.filter((event) => event.event_type.startsWith("record_"))
  const areas = [...new Set(events.filter((event) => event.event_type === "page_view").map((event) => event.page_label))]
  const problems = [
    failed.length ? `${failed.length} communication attempt${failed.length === 1 ? " needs" : "s need"} follow-up.` : "No failed communication was recorded.",
    reportedProblems.trim() ? `Carlos reported: ${reportedProblems.trim().slice(0, 600)}` : "Carlos did not report a website problem in the daily summary.",
  ]
  const next = [
    failed.length ? "Review the failed or unanswered communications first." : "Continue the highest-priority client and supplier follow-ups.",
    events.length && !changes.length ? "Confirm that completed work was saved to the correct client, request, quote, or supplier record." : "Review today’s saved record changes before closing the day.",
  ]
  return [
    `Today: ${events.length} tracked actions across ${areas.length} area${areas.length === 1 ? "" : "s"}; ${completed.length} completed communication${completed.length === 1 ? "" : "s"}; ${changes.length} saved record change${changes.length === 1 ? "" : "s"}.`,
    `Possible problems: ${problems.join(" ")}`,
    `Next actions: ${next.join(" ")}`,
  ].join("\n\n")
}
