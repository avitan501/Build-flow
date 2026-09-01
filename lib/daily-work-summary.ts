export const DAILY_WORK_SUMMARY_PREFIX = "daily_work_summary:"
export const DAILY_WORK_SUMMARY_TITLE_PREFIX = "Daily summary - "

export type DailyWorkSummary = {
  id: string
  date: string
  completed: string
  open: string
  problems: string
  problemAttachments: Array<{ name: string; path: string; type: string; size: number; signedUrl?: string | null }>
  checkInAt: string | null
  checkOutAt: string | null
  pauseStartedAt: string | null
  pausedMilliseconds: number
  paidAt: string | null
  updatedAt: string
}

type DailyWorkSummaryRow = {
  id: string
  title: string
  details: string | null
  updated_at: string
}

export function parseDailyWorkSummary(row: DailyWorkSummaryRow): DailyWorkSummary | null {
  if (!row.details?.startsWith(DAILY_WORK_SUMMARY_PREFIX)) return null

  try {
    const value = JSON.parse(row.details.slice(DAILY_WORK_SUMMARY_PREFIX.length)) as Partial<DailyWorkSummary>
    const date = typeof value.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.date)
      ? value.date
      : row.title.startsWith(DAILY_WORK_SUMMARY_TITLE_PREFIX)
        ? row.title.slice(DAILY_WORK_SUMMARY_TITLE_PREFIX.length)
        : ""
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null

    return {
      id: row.id,
      date,
      completed: typeof value.completed === "string" ? value.completed : "",
      open: typeof value.open === "string" ? value.open : "",
      problems: typeof value.problems === "string" ? value.problems : "",
      problemAttachments: Array.isArray(value.problemAttachments) ? value.problemAttachments.filter((entry): entry is DailyWorkSummary["problemAttachments"][number] => Boolean(
        entry
        && typeof entry === "object"
        && typeof entry.name === "string"
        && typeof entry.path === "string"
        && typeof entry.type === "string"
        && typeof entry.size === "number",
      )) : [],
      checkInAt: typeof value.checkInAt === "string" ? value.checkInAt : null,
      checkOutAt: typeof value.checkOutAt === "string" ? value.checkOutAt : null,
      pauseStartedAt: typeof value.pauseStartedAt === "string" ? value.pauseStartedAt : null,
      pausedMilliseconds: typeof value.pausedMilliseconds === "number" && value.pausedMilliseconds >= 0 ? value.pausedMilliseconds : 0,
      paidAt: typeof value.paidAt === "string" ? value.paidAt : null,
      updatedAt: row.updated_at,
    }
  } catch {
    return null
  }
}

export function serializeDailyWorkSummary(input: {
  date: string
  completed: string
  open: string
  problems?: string
  problemAttachments?: DailyWorkSummary["problemAttachments"]
  checkInAt?: string | null
  checkOutAt?: string | null
  pauseStartedAt?: string | null
  pausedMilliseconds?: number
  paidAt?: string | null
}) {
  return `${DAILY_WORK_SUMMARY_PREFIX}${JSON.stringify(input)}`
}

export function calculateWorkedMinutes(checkInAt: string | null | undefined, checkOutAt: string | null | undefined, pausedMilliseconds = 0) {
  if (!checkInAt || !checkOutAt) return null
  const checkIn = new Date(checkInAt).getTime()
  const checkOut = new Date(checkOutAt).getTime()
  if (!Number.isFinite(checkIn) || !Number.isFinite(checkOut) || checkOut < checkIn) return null
  return Math.max(0, Math.round((checkOut - checkIn - Math.max(0, pausedMilliseconds)) / 60000))
}

export function totalPausedMilliseconds(pausedMilliseconds: number, pauseStartedAt: string | null | undefined, endAt: string) {
  if (!pauseStartedAt) return Math.max(0, pausedMilliseconds)
  const pauseStart = new Date(pauseStartedAt).getTime()
  const end = new Date(endAt).getTime()
  if (!Number.isFinite(pauseStart) || !Number.isFinite(end) || end < pauseStart) return Math.max(0, pausedMilliseconds)
  return Math.max(0, pausedMilliseconds) + (end - pauseStart)
}
