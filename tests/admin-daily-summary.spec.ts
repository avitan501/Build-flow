import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import { calculateWorkedMinutes } from "../lib/daily-work-summary"

const root = process.cwd()

test("manager navigation provides a Daily Work Summary beside communication shortcuts", async () => {
  const shell = await readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8")
  expect(shell).toContain('{ href: "/admin/daily-summary", label: "Daily Work Summary", shortLabel: "Summary", icon: CalendarDays }')
  expect(shell).toContain('className="grid grid-cols-4 gap-1"')
})

test("daily summaries persist by date in protected manager data", async () => {
  const [page, component, actions, helper, goalsPage] = await Promise.all([
    readFile(path.join(root, "app/admin/daily-summary/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/daily-work-summary.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/daily-summary/actions.ts"), "utf8"),
    readFile(path.join(root, "lib/daily-work-summary.ts"), "utf8"),
    readFile(path.join(root, "app/admin/goals-progress/page.tsx"), "utf8"),
  ])

  expect(page).toContain("await requireManagerPortalProfile()")
  expect(page).toContain('.from("manager_goals")')
  expect(component).toContain("Completed today")
  expect(component).toContain("Still open")
  expect(component).toContain('type="date"')
  expect(component).toContain("Recent summaries")
  expect(component).toContain("Check in")
  expect(component).toContain("Check out")
  expect(component).toContain("Hours")
  expect(component).toContain("workedTime")
  expect(component).toContain("Website problem")
  expect(component).toContain('accept="image/jpeg,image/png,image/webp"')
  expect(component).toContain("Attach screenshot")
  expect(component).toContain("Report problem")
  expect(component).toContain("Website problem reported.")
  expect(actions).toContain("await requireManagerPortalProfile()")
  expect(actions).toContain("recordDailyAttendanceAction")
  expect(actions).toContain('timeZone: "America/New_York"')
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
  expect(goalsPage).toContain("!goal.details?.startsWith(DAILY_WORK_SUMMARY_PREFIX)")
})

test("lead controls remain readable and independently scrollable on phones", async () => {
  const component = await readFile(path.join(root, "components/buildflow/client-target-outreach.tsx"), "utf8")
  expect(component).toContain("overflow-x-auto")
  expect(component).toContain("[scrollbar-width:none]")
  expect(component).toContain('w-[6.5rem] shrink-0')
  expect(component).toContain('w-[8.5rem] shrink-0')
})

test("attendance calculates Carlos's worked time from check in through check out", () => {
  expect(calculateWorkedMinutes("2026-08-18T13:15:00.000Z", "2026-08-18T21:45:00.000Z")).toBe(510)
  expect(calculateWorkedMinutes("2026-08-18T21:45:00.000Z", "2026-08-18T13:15:00.000Z")).toBeNull()
  expect(calculateWorkedMinutes("2026-08-18T13:15:00.000Z", null)).toBeNull()
})
