export const SITE_TIME_ZONE = "America/New_York"

export type SiteDateTimeInput = Date | string | number
export type SiteDateTimeOptions = Omit<Intl.DateTimeFormatOptions, "timeZone">

const dateKeyFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SITE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const localDateTimePartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SITE_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
})

function validInstant(value: SiteDateTimeInput) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

function partsRecord(formatter: Intl.DateTimeFormat, value: Date) {
  return Object.fromEntries(formatter.formatToParts(value).map((part) => [part.type, part.value]))
}

export function isSiteDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function siteBusinessDateKey(value: SiteDateTimeInput = new Date()) {
  const date = validInstant(value)
  if (!date) return null
  const parts = partsRecord(dateKeyFormatter, date)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function formatSiteDateTime(
  value: SiteDateTimeInput,
  options: SiteDateTimeOptions = { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" },
  fallback = "—",
) {
  const date = validInstant(value)
  if (!date) return fallback
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: SITE_TIME_ZONE }).format(date)
}

export function formatSiteDate(
  value: SiteDateTimeInput,
  options: SiteDateTimeOptions = { month: "short", day: "numeric", year: "numeric" },
  fallback = "—",
) {
  if (typeof value === "string" && isSiteDateKey(value)) return formatSiteDateKey(value, options, fallback)
  return formatSiteDateTime(value, options, fallback)
}

export function formatSiteTime(
  value: SiteDateTimeInput,
  options: SiteDateTimeOptions = { hour: "numeric", minute: "2-digit", timeZoneName: "short" },
  fallback = "—",
) {
  return formatSiteDateTime(value, options, fallback)
}

export function formatSiteDateKey(
  value: string,
  options: SiteDateTimeOptions = { month: "short", day: "numeric", year: "numeric" },
  fallback = "—",
) {
  if (!isSiteDateKey(value)) return fallback
  return formatSiteDateTime(`${value}T12:00:00Z`, options, fallback)
}

export function addSiteCalendarDays(value: string, days: number) {
  if (!isSiteDateKey(value) || !Number.isInteger(days)) return null
  const [year, month, day] = value.split("-").map(Number)
  const result = new Date(Date.UTC(year, month - 1, day + days))
  return `${result.getUTCFullYear().toString().padStart(4, "0")}-${String(result.getUTCMonth() + 1).padStart(2, "0")}-${String(result.getUTCDate()).padStart(2, "0")}`
}

type LocalDateTimeParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

function parseLocalDateTime(value: string): LocalDateTimeParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  }
  if (!isSiteDateKey(`${match[1]}-${match[2]}-${match[3]}`) || parts.hour > 23 || parts.minute > 59) return null
  return parts
}

function timeZoneOffsetMilliseconds(value: Date) {
  const parts = partsRecord(localDateTimePartsFormatter, value)
  const representedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )
  return representedAsUtc - Math.floor(value.getTime() / 1000) * 1000
}

function sameLocalDateTime(value: Date, expected: LocalDateTimeParts) {
  const parts = partsRecord(localDateTimePartsFormatter, value)
  return Number(parts.year) === expected.year
    && Number(parts.month) === expected.month
    && Number(parts.day) === expected.day
    && Number(parts.hour) === expected.hour
    && Number(parts.minute) === expected.minute
}

export function siteLocalDateTimeToIso(value: string) {
  const local = parseLocalDateTime(value)
  if (!local) return null
  const wallClockAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute)
  const offsets = new Set<number>()
  for (const hourDelta of [-36, -12, 0, 12, 36]) {
    offsets.add(timeZoneOffsetMilliseconds(new Date(wallClockAsUtc + hourDelta * 60 * 60 * 1000)))
  }
  const matches = [...offsets]
    .map((offset) => new Date(wallClockAsUtc - offset))
    .filter((candidate) => sameLocalDateTime(candidate, local))
    .sort((left, right) => left.getTime() - right.getTime())
  return matches[0]?.toISOString() ?? null
}

export function formatSiteDateTimeInput(value: SiteDateTimeInput) {
  const date = validInstant(value)
  if (!date) return null
  const parts = partsRecord(localDateTimePartsFormatter, date)
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function formatSiteWallTime(value: string, fallback = "—") {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return fallback
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return fallback
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, 0, 1, hour, minute)))
}
