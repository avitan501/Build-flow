import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import { calculateWorkedMinutes, totalPausedMilliseconds } from "../lib/daily-work-summary"

const root = process.cwd()

test("daily work summary stays in the dashboard instead of manager navigation", async () => {
  const shell = await readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8")
  expect(shell).not.toContain('{ href: "/admin/daily-summary"')
  expect(shell).toContain("lg:grid-cols-[4.5rem_minmax(0,1fr)]")
})

test("daily summaries persist by date in protected manager data", async () => {
  const [page, component, actions, helper] = await Promise.all([
    readFile(path.join(root, "app/admin/daily-summary/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/daily-work-summary.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/daily-summary/actions.ts"), "utf8"),
    readFile(path.join(root, "lib/daily-work-summary.ts"), "utf8"),
  ])

  expect(page).toContain("await requireManagerPortalProfile()")
  expect(page).toContain('.from("manager_goals")')
  expect(component).toContain("Completed today")
  expect(component).toContain("Still open")
  expect(component).toContain('type="date"')
  expect(component).toContain("Recent summaries")
  expect(component).toContain('timeZone: "America/New_York"')
  expect(component).toContain("workedTime(summary, currentTime)")
  expect(component).toContain("Check in")
  expect(component).toContain("Check out")
  expect(component).toContain("Pause")
  expect(component).toContain("Resume")
  expect(component).toContain("Mark paid")
  expect(component).toContain("Hours")
  expect(component).toContain("workedTime")
  expect(component).toContain("Website problem")
  expect(component).toContain('accept="image/jpeg,image/png,image/webp"')
  expect(component).toContain("Attach screenshot")
  expect(component).toContain("Report problem")
  expect(component).toContain("Website problem reported.")
  expect(actions).toContain("await requireManagerPortalProfile()")
  expect(actions).toContain("recordDailyAttendanceAction")
  expect(actions).toContain("markDailySummaryPaidAction")
  expect(actions).toContain('timeZone: "America/New_York"')
  expect(actions).toContain('revalidatePath("/admin/build-map")')
  expect(actions).toContain("current?.checkInAt")
  expect(actions).toContain("current?.checkOutAt")
  expect(actions).toContain("uploadDailyProblemPhotoAction")
  expect(actions).toContain("10 * 1024 * 1024")
  expect(actions).toContain("SUPPLIER_QUOTE_BUCKET")
  expect(actions).toContain("created_by: user.id")
  expect(actions).toContain('assignee: "carlos"')
  expect(actions).toContain("existing.data")
  expect(helper).toContain('DAILY_WORK_SUMMARY_PREFIX = "daily_work_summary:"')
  expect(helper).toContain("problemAttachments")
  expect(helper).toContain("pausedMilliseconds")
  expect(helper).toContain("paidAt")
})

test("dashboard clock opens Carlos time log instead of looking like a dead button", async () => {
  const [clock, page] = await Promise.all([
    readFile(path.join(root, "components/buildflow/employee-clock-status.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/daily-summary/page.tsx"), "utf8"),
  ])

  expect(clock).toContain('href="/admin/daily-summary"')
  expect(clock).toContain('aria-label="Open Carlos time log and daily summary"')
  expect(page).toContain('href="/admin/build-map"')
  expect(page).toContain("Time Log &amp; Daily Summary")
})

test("lead controls remain readable and independently scrollable on phones", async () => {
  const component = await readFile(path.join(root, "components/buildflow/client-target-outreach.tsx"), "utf8")
  expect(component).toContain("overflow-x-auto")
  expect(component).toContain("[scrollbar-width:none]")
  expect(component).toContain('w-16 shrink-0')
  expect(component).toContain('w-[8.5rem] shrink-0')
})

test("attendance calculates Carlos's worked time from check in through check out", () => {
  expect(calculateWorkedMinutes("2026-08-18T13:15:00.000Z", "2026-08-18T21:45:00.000Z")).toBe(510)
  expect(calculateWorkedMinutes("2026-08-18T21:45:00.000Z", "2026-08-18T13:15:00.000Z")).toBeNull()
  expect(calculateWorkedMinutes("2026-08-18T13:15:00.000Z", null)).toBeNull()
  expect(calculateWorkedMinutes("2026-08-18T13:00:00.000Z", "2026-08-18T15:00:00.000Z", 30 * 60_000)).toBe(90)
  expect(totalPausedMilliseconds(10 * 60_000, "2026-08-18T14:00:00.000Z", "2026-08-18T14:20:00.000Z")).toBe(30 * 60_000)
})
