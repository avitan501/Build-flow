import { addSiteCalendarDays, siteBusinessDateKey, siteLocalDateTimeToIso } from "@/lib/site-date-time"

export const CARLOS_DAILY_GOAL_DEFINITIONS = [
  { key: "leads", label: "New leads handled", target: 5 },
  { key: "clients", label: "Client calls / messages", target: 5 },
  { key: "vendors", label: "New vendor contacts", target: 3 },
  { key: "quotes", label: "Quotes prepared", target: 2 },
  { key: "closed", label: "Order / next step closed", target: 1 },
] as const

export function newYorkBusinessDayRange(value: Date | string | number = new Date()) {
  const dateKey = siteBusinessDateKey(value)
  if (!dateKey) return null
  const nextDateKey = addSiteCalendarDays(dateKey, 1)
  const start = siteLocalDateTimeToIso(`${dateKey}T00:00`)
  const end = nextDateKey ? siteLocalDateTimeToIso(`${nextDateKey}T00:00`) : null
  return start && end ? { dateKey, start, end } : null
}

export function buildCarlosDailyGoals(counts: Partial<Record<(typeof CARLOS_DAILY_GOAL_DEFINITIONS)[number]["key"], number>>) {
  return CARLOS_DAILY_GOAL_DEFINITIONS.map((goal) => ({
    ...goal,
    count: Math.max(0, Math.floor(Number(counts[goal.key]) || 0)),
  }))
}

type CommunicationReceipt = {
  id: string
  occurred_at: string
  metadata: { outcome?: string; external_id?: string; channel?: string; recipient?: string; subject?: string } | null
}

export function countUniqueSuccessfulCommunications(receipts: CommunicationReceipt[]) {
  const keys = new Set<string>()
  for (const receipt of receipts) {
    if (!["sent", "completed"].includes(receipt.metadata?.outcome || "")) continue
    const externalId = receipt.metadata?.external_id?.trim()
    if (externalId) {
      keys.add(`provider:${externalId}`)
      continue
    }
    const instant = Date.parse(receipt.occurred_at)
    const minute = Number.isFinite(instant) ? Math.floor(instant / 60_000) : receipt.id
    keys.add([receipt.metadata?.channel || "message", receipt.metadata?.recipient || "unknown", receipt.metadata?.subject || "", minute].join("|"))
  }
  return keys.size
}
