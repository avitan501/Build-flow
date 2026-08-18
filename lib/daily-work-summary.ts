export const DAILY_WORK_SUMMARY_PREFIX = "daily_work_summary:"
export const DAILY_WORK_SUMMARY_TITLE_PREFIX = "Daily summary - "

export type DailyWorkSummary = {
  id: string
  date: string
  completed: string
  open: string
  checkInAt: string | null
  checkOutAt: string | null
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
      checkInAt: typeof value.checkInAt === "string" ? value.checkInAt : null,
      checkOutAt: typeof value.checkOutAt === "string" ? value.checkOutAt : null,
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
  checkInAt?: string | null
  checkOutAt?: string | null
}) {
  return `${DAILY_WORK_SUMMARY_PREFIX}${JSON.stringify(input)}`
}

export function calculateWorkedMinutes(checkInAt: string | null | undefined, checkOutAt: string | null | undefined) {
  if (!checkInAt || !checkOutAt) return null
  const checkIn = new Date(checkInAt).getTime()
  const checkOut = new Date(checkOutAt).getTime()
  if (!Number.isFinite(checkIn) || !Number.isFinite(checkOut) || checkOut < checkIn) return null
  return Math.round((checkOut - checkIn) / 60000)
}
