import { isSiteDateKey, SITE_TIME_ZONE, siteBusinessDateKey } from "@/lib/site-date-time"

export const DAILY_WORK_SUMMARY_PREFIX = "daily_work_summary:"
export const DAILY_WORK_SUMMARY_TITLE_PREFIX = "Daily summary - "
export const DAILY_WORK_TIME_ZONE = SITE_TIME_ZONE

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

export type DailyAttendanceAction = "check_in" | "pause" | "resume" | "check_out"

type DailyWorkSections = Pick<DailyWorkSummary, "completed" | "open" | "problems">

const SECTION_HEADING = /^\s*(pending|still\s+open|open(?:\s+items?)?|problems?|website\s+(?:problems?|issues?)|issues?)\s*:\s*(.*)$/i

function sectionForHeading(value: string): "open" | "problems" {
  return /problem|issue/i.test(value) ? "problems" : "open"
}

function appendSection(current: string, addition: string) {
  const cleanCurrent = current.trim()
  const cleanAddition = addition.trim()
  if (!cleanAddition || cleanCurrent.includes(cleanAddition)) return cleanCurrent
  return [cleanCurrent, cleanAddition].filter(Boolean).join("\n")
}

/** Moves explicitly labelled Pending/Open/Problems blocks out of Completed. */
export function normalizeDailyWorkSummarySections(input: DailyWorkSections): DailyWorkSections {
  const completedLines: string[] = []
  const extracted: Record<"open" | "problems", string[]> = { open: [], problems: [] }
  let activeSection: "open" | "problems" | null = null

  for (const line of input.completed.replace(/\r\n?/g, "\n").split("\n")) {
    const heading = line.match(SECTION_HEADING)
    if (heading) {
      activeSection = sectionForHeading(heading[1])
      if (heading[2]?.trim()) extracted[activeSection].push(heading[2].trim())
      continue
    }
    if (activeSection) extracted[activeSection].push(line)
    else completedLines.push(line)
  }

  return {
    completed: completedLines.join("\n").trim(),
    open: appendSection(input.open, extracted.open.join("\n")),
    problems: appendSection(input.problems, extracted.problems.join("\n")),
  }
}

type DailyAttendanceState = Pick<DailyWorkSummary, "checkInAt" | "checkOutAt" | "pauseStartedAt" | "pausedMilliseconds">

type DailyAttendanceTransition =
  | { ok: true; attendance: DailyAttendanceState }
  | { ok: false; error: string }

function timestampMilliseconds(value: string | null | undefined) {
  if (!value) return null
  const milliseconds = new Date(value).getTime()
  return Number.isFinite(milliseconds) ? milliseconds : null
}

function normalizedPausedMilliseconds(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

export function dailyWorkDateKey(value: Date | string | number = new Date()) {
  return siteBusinessDateKey(value)
}

export function isValidDailyWorkDateKey(value: string) {
  return isSiteDateKey(value)
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
      pausedMilliseconds: typeof value.pausedMilliseconds === "number" ? normalizedPausedMilliseconds(value.pausedMilliseconds) : 0,
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
  const checkIn = timestampMilliseconds(checkInAt)
  const checkOut = timestampMilliseconds(checkOutAt)
  if (checkIn === null || checkOut === null || checkOut < checkIn) return null
  const elapsedMilliseconds = checkOut - checkIn
  const paused = Math.min(elapsedMilliseconds, normalizedPausedMilliseconds(pausedMilliseconds))
  return Math.max(0, Math.round((elapsedMilliseconds - paused) / 60000))
}

export function totalPausedMilliseconds(pausedMilliseconds: number, pauseStartedAt: string | null | undefined, endAt: string) {
  const accumulated = normalizedPausedMilliseconds(pausedMilliseconds)
  if (!pauseStartedAt) return accumulated
  const pauseStart = timestampMilliseconds(pauseStartedAt)
  const end = timestampMilliseconds(endAt)
  if (pauseStart === null || end === null || end < pauseStart) return accumulated
  return accumulated + (end - pauseStart)
}

export function calculateDailyWorkMinutes(attendance: DailyAttendanceState, nowAt: string) {
  const checkIn = timestampMilliseconds(attendance.checkInAt)
  const endAt = attendance.checkOutAt ?? nowAt
  const end = timestampMilliseconds(endAt)
  if (checkIn === null || end === null || end < checkIn) return { workedMinutes: null, pausedMinutes: 0 }

  const elapsedMilliseconds = end - checkIn
  const pausedMilliseconds = Math.min(
    elapsedMilliseconds,
    totalPausedMilliseconds(attendance.pausedMilliseconds, attendance.pauseStartedAt, endAt),
  )

  return {
    workedMinutes: calculateWorkedMinutes(attendance.checkInAt, endAt, pausedMilliseconds),
    pausedMinutes: Math.max(0, Math.round(pausedMilliseconds / 60000)),
  }
}

export function applyDailyAttendanceAction(
  attendance: DailyAttendanceState | null,
  action: DailyAttendanceAction,
  nowAt: string,
): DailyAttendanceTransition {
  if (timestampMilliseconds(nowAt) === null) return { ok: false, error: "Attendance time is invalid." }

  const current: DailyAttendanceState = attendance ?? {
    checkInAt: null,
    checkOutAt: null,
    pauseStartedAt: null,
    pausedMilliseconds: 0,
  }

  if (action === "check_in") {
    if (current.checkInAt) return { ok: false, error: "Carlos is already checked in for today." }
    return {
      ok: true,
      attendance: { checkInAt: nowAt, checkOutAt: null, pauseStartedAt: null, pausedMilliseconds: 0 },
    }
  }

  if (!current.checkInAt) {
    if (action === "check_out") return { ok: false, error: "Carlos must check in before checking out." }
    if (action === "resume") return { ok: false, error: "Carlos is not paused." }
    return { ok: false, error: "Carlos must be working before taking a pause." }
  }
  if (current.checkOutAt) return { ok: false, error: "Carlos is already checked out for today." }

  if (action === "pause") {
    if (current.pauseStartedAt) return { ok: false, error: "Carlos is already paused." }
    return { ok: true, attendance: { ...current, pauseStartedAt: nowAt } }
  }

  if (action === "resume") {
    if (!current.pauseStartedAt) return { ok: false, error: "Carlos is not paused." }
    return {
      ok: true,
      attendance: {
        ...current,
        pauseStartedAt: null,
        pausedMilliseconds: totalPausedMilliseconds(current.pausedMilliseconds, current.pauseStartedAt, nowAt),
      },
    }
  }

  const pausedMilliseconds = current.pauseStartedAt
    ? totalPausedMilliseconds(current.pausedMilliseconds, current.pauseStartedAt, nowAt)
    : normalizedPausedMilliseconds(current.pausedMilliseconds)
  return {
    ok: true,
    attendance: { ...current, checkOutAt: nowAt, pauseStartedAt: null, pausedMilliseconds },
  }
}
