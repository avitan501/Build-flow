import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import {
  applyDailyAttendanceAction,
  calculateDailyWorkMinutes,
  calculateWorkedMinutes,
  dailyWorkDateKey,
  DAILY_WORK_SUMMARY_PREFIX,
  DAILY_WORK_TIME_ZONE,
  isValidDailyWorkDateKey,
  parseDailyWorkSummary,
  totalPausedMilliseconds,
} from "../lib/daily-work-summary"

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
  expect(component).toContain("formatSiteTime")
  expect(component).toContain("formatSiteDate")
  expect(component).toContain("timeLabels(summary, currentTime)")
  expect(component).toContain("Check in")
  expect(component).toContain("Check out")
  expect(component).toContain("Required to check out")
  expect(component).toContain("Write what you completed today before checking out.")
  expect(component).toContain("Pause")
  expect(component).toContain("Resume")
  expect(component).toContain("Mark paid")
  expect(component).toContain("Worked")
  expect(component).toContain("Paused")
  expect(component).toContain("calculateDailyWorkMinutes")
  expect(component).toContain("Website problem")
  expect(component).toContain('accept="image/jpeg,image/png,image/webp"')
  expect(component).toContain("Attach screenshot")
  expect(component).toContain("Report problem")
  expect(component).toContain("Website problem reported.")
  expect(actions).toContain("await requireManagerPortalProfile()")
  expect(actions).toContain("recordDailyAttendanceAction")
  expect(actions).toContain("markDailySummaryPaidAction")
  expect(actions).toContain("dailyWorkDateKey(now)")
  expect(actions).toContain("applyDailyAttendanceAction")
  expect(actions).toContain('.eq("updated_at", existing.updated_at)')
  expect(actions).toContain('revalidatePath("/admin/build-map")')
  expect(actions).toContain("current?.checkInAt")
  expect(actions).toContain("current?.checkOutAt")
  expect(actions).toContain("checkoutCompleted")
  expect(actions).toContain("Write what you completed today before checking out.")
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

test("pause, resume, and checkout transitions preserve exact pause accounting", () => {
  const checkedIn = applyDailyAttendanceAction(null, "check_in", "2026-08-18T13:00:00.000Z")
  expect(checkedIn).toEqual({
    ok: true,
    attendance: {
      checkInAt: "2026-08-18T13:00:00.000Z",
      checkOutAt: null,
      pauseStartedAt: null,
      pausedMilliseconds: 0,
    },
  })
  if (!checkedIn.ok) throw new Error(checkedIn.error)

  const paused = applyDailyAttendanceAction(checkedIn.attendance, "pause", "2026-08-18T14:00:00.000Z")
  expect(paused.ok).toBe(true)
  if (!paused.ok) throw new Error(paused.error)
  expect(paused.attendance.pauseStartedAt).toBe("2026-08-18T14:00:00.000Z")
  expect(calculateDailyWorkMinutes(paused.attendance, "2026-08-18T14:20:00.000Z")).toEqual({
    workedMinutes: 60,
    pausedMinutes: 20,
  })

  const resumed = applyDailyAttendanceAction(paused.attendance, "resume", "2026-08-18T14:20:00.000Z")
  expect(resumed.ok).toBe(true)
  if (!resumed.ok) throw new Error(resumed.error)
  expect(resumed.attendance.pauseStartedAt).toBeNull()
  expect(resumed.attendance.pausedMilliseconds).toBe(20 * 60_000)

  const pausedAgain = applyDailyAttendanceAction(resumed.attendance, "pause", "2026-08-18T15:00:00.000Z")
  if (!pausedAgain.ok) throw new Error(pausedAgain.error)
  const checkedOut = applyDailyAttendanceAction(pausedAgain.attendance, "check_out", "2026-08-18T15:10:00.000Z")
  expect(checkedOut.ok).toBe(true)
  if (!checkedOut.ok) throw new Error(checkedOut.error)
  expect(checkedOut.attendance).toMatchObject({
    checkOutAt: "2026-08-18T15:10:00.000Z",
    pauseStartedAt: null,
    pausedMilliseconds: 30 * 60_000,
  })
  expect(calculateDailyWorkMinutes(checkedOut.attendance, "2026-08-18T18:00:00.000Z")).toEqual({
    workedMinutes: 100,
    pausedMinutes: 30,
  })
})

test("invalid attendance transitions do not invent or double-count pauses", () => {
  const working = {
    checkInAt: "2026-08-18T13:00:00.000Z",
    checkOutAt: null,
    pauseStartedAt: null,
    pausedMilliseconds: 12 * 60_000,
  }
  expect(applyDailyAttendanceAction(working, "resume", "2026-08-18T14:00:00.000Z")).toEqual({ ok: false, error: "Carlos is not paused." })

  const paused = { ...working, pauseStartedAt: "2026-08-18T14:00:00.000Z" }
  expect(applyDailyAttendanceAction(paused, "pause", "2026-08-18T14:05:00.000Z")).toEqual({ ok: false, error: "Carlos is already paused." })
})

test("legacy summaries without pause fields remain readable", () => {
  const summary = parseDailyWorkSummary({
    id: "legacy-summary",
    title: "Daily summary - 2026-08-18",
    details: `${DAILY_WORK_SUMMARY_PREFIX}${JSON.stringify({
      date: "2026-08-18",
      completed: "Called suppliers",
      open: "",
      checkInAt: "2026-08-18T13:00:00.000Z",
      checkOutAt: "2026-08-18T21:00:00.000Z",
    })}`,
    updated_at: "2026-08-18T21:00:00.000Z",
  })

  expect(summary).not.toBeNull()
  expect(summary?.pauseStartedAt).toBeNull()
  expect(summary?.pausedMilliseconds).toBe(0)
  expect(calculateDailyWorkMinutes(summary!, "2026-08-18T22:00:00.000Z")).toEqual({ workedMinutes: 480, pausedMinutes: 0 })
})

test("Eastern Time owns work-date boundaries and remains stable through DST", () => {
  expect(DAILY_WORK_TIME_ZONE).toBe("America/New_York")
  expect(dailyWorkDateKey("2026-03-08T04:59:59.999Z")).toBe("2026-03-07")
  expect(dailyWorkDateKey("2026-03-08T05:00:00.000Z")).toBe("2026-03-08")
  expect(dailyWorkDateKey("2026-11-01T03:59:59.999Z")).toBe("2026-10-31")
  expect(dailyWorkDateKey("2026-11-01T04:00:00.000Z")).toBe("2026-11-01")

  expect(calculateWorkedMinutes("2026-03-08T06:30:00.000Z", "2026-03-08T07:30:00.000Z")).toBe(60)
  expect(calculateWorkedMinutes("2026-11-01T05:30:00.000Z", "2026-11-01T06:30:00.000Z")).toBe(60)
  expect(isValidDailyWorkDateKey("2028-02-29")).toBe(true)
  expect(isValidDailyWorkDateKey("2026-02-29")).toBe(false)
  expect(isValidDailyWorkDateKey("2026-02-31")).toBe(false)
})
