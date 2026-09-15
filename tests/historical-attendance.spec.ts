import { test, expect } from "@playwright/test"
import { needsHistoricalCheckoutReview } from "../lib/historical-attendance"
import { calculateDailyWorkMinutes } from "../lib/daily-work-summary"

test("prior Eastern-day open clocks need review without inventing checkout", () => {
  const row={date:"2026-09-11",checkInAt:"2026-09-11T13:29:58.412Z",checkOutAt:null}
  expect(needsHistoricalCheckoutReview(row,"2026-09-15T03:00:00Z")).toBe(true)
  expect(row.checkOutAt).toBeNull()
})
test("midnight Eastern boundary, not UTC, decides stale clocks", () => {
  const row={date:"2026-09-14",checkInAt:"2026-09-14T14:00:00Z",checkOutAt:null}
  expect(needsHistoricalCheckoutReview(row,"2026-09-15T03:59:59Z")).toBe(false)
  expect(needsHistoricalCheckoutReview(row,"2026-09-15T04:00:00Z")).toBe(true)
})
test("winter Eastern offset and completed/absent clocks stay accurate", () => {
  const row={date:"2026-01-14",checkInAt:"2026-01-14T14:00:00Z",checkOutAt:null}
  expect(needsHistoricalCheckoutReview(row,"2026-01-15T04:59:59Z")).toBe(false)
  expect(needsHistoricalCheckoutReview(row,"2026-01-15T05:00:00Z")).toBe(true)
  expect(needsHistoricalCheckoutReview({...row,checkOutAt:"2026-01-14T22:00:00Z"},"2026-01-15T06:00:00Z")).toBe(false)
  expect(needsHistoricalCheckoutReview({...row,checkInAt:null},"2026-01-15T06:00:00Z")).toBe(false)
})
test("existing today and closed duration calculations are untouched", () => {
  const row={checkInAt:"2026-09-14T14:00:00Z",checkOutAt:null,pausedMilliseconds:0,pauseStartedAt:null}
  expect(calculateDailyWorkMinutes(row,"2026-09-14T15:00:00Z").workedMinutes).toBe(60)
  expect(calculateDailyWorkMinutes({...row,checkOutAt:"2026-09-14T16:00:00Z"},"2026-09-15T16:00:00Z").workedMinutes).toBe(120)
})
