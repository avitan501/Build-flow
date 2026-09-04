import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

import { buildCarlosDailyGoals, countUniqueSuccessfulCommunications, newYorkBusinessDayRange } from "@/lib/carlos-daily-goals"

const root = process.cwd()

test("daily scorecard uses calendar-day boundaries in America/New_York including DST", () => {
  expect(newYorkBusinessDayRange("2026-07-04T16:00:00Z")).toEqual({
    dateKey: "2026-07-04",
    start: "2026-07-04T04:00:00.000Z",
    end: "2026-07-05T04:00:00.000Z",
  })
  expect(newYorkBusinessDayRange("2026-01-04T16:00:00Z")).toEqual({
    dateKey: "2026-01-04",
    start: "2026-01-04T05:00:00.000Z",
    end: "2026-01-05T05:00:00.000Z",
  })
})

test("daily goals clamp invalid counts and preserve requested targets", () => {
  expect(buildCarlosDailyGoals({ leads: 8, clients: 4, vendors: -2, quotes: 2.9, closed: Number.NaN })).toEqual([
    { key: "leads", label: "New leads handled", target: 5, count: 8 },
    { key: "clients", label: "Client calls / messages", target: 5, count: 4 },
    { key: "vendors", label: "New vendor contacts", target: 3, count: 0 },
    { key: "quotes", label: "Quotes prepared", target: 2, count: 2 },
    { key: "closed", label: "Order / next step closed", target: 1, count: 0 },
  ])
})

test("communications count only successful provider receipts and collapse retries", () => {
  const receipts = [
    { id: "1", occurred_at: "2026-09-04T14:00:01Z", metadata: { outcome: "sent", external_id: "quo-1", channel: "sms", recipient: "5161" } },
    { id: "2", occurred_at: "2026-09-04T14:00:05Z", metadata: { outcome: "sent", external_id: "quo-1", channel: "sms", recipient: "5161" } },
    { id: "3", occurred_at: "2026-09-04T14:01:00Z", metadata: { outcome: "failed", channel: "sms", recipient: "5162" } },
    { id: "4", occurred_at: "2026-09-04T14:02:00Z", metadata: { outcome: "completed", channel: "call", recipient: "5163" } },
  ]
  expect(countUniqueSuccessfulCommunications(receipts)).toBe(2)
})

test("Carlos dashboard counts successful persisted activity without manual self-reporting", async () => {
  const [page, card] = await Promise.all([
    readFile(path.join(root, "app/admin/goals-progress/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/carlos-daily-scorecard.tsx"), "utf8"),
  ])
  expect(page).toContain('eq("email", "buildavantiap@gmail.com")')
  expect(page).toContain('neq("status", "new")')
  expect(page).toContain("countUniqueSuccessfulCommunications")
  expect(page).toContain('neq("contact_status", "not_contacted")')
  expect(page).toContain('in("document_type", ["estimate", "invoice"])')
  expect(page).toContain('eq("status", "closed")')
  expect(card).toContain("Carlos daily wins")
  expect(page).not.toContain("manualDailyGoal")
})
