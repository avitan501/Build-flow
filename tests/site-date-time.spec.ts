import { expect, test } from "@playwright/test"

import {
  addSiteCalendarDays,
  formatSiteDate,
  formatSiteDateTime,
  formatSiteDateTimeInput,
  formatSiteWallTime,
  SITE_TIME_ZONE,
  siteBusinessDateKey,
  siteLocalDateTimeToIso,
} from "../lib/site-date-time"

test("uses one IANA site timezone across standard time and daylight time", () => {
  expect(SITE_TIME_ZONE).toBe("America/New_York")
  expect(formatSiteDateTime("2026-01-15T17:30:00.000Z", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  })).toBe("Jan 15, 12:30 PM EST")
  expect(formatSiteDateTime("2026-07-15T16:30:00.000Z", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  })).toBe("Jul 15, 12:30 PM EDT")
})

test("business dates change at New York midnight on DST transition days", () => {
  expect(siteBusinessDateKey("2026-03-08T04:59:59.999Z")).toBe("2026-03-07")
  expect(siteBusinessDateKey("2026-03-08T05:00:00.000Z")).toBe("2026-03-08")
  expect(siteBusinessDateKey("2026-11-01T03:59:59.999Z")).toBe("2026-10-31")
  expect(siteBusinessDateKey("2026-11-01T04:00:00.000Z")).toBe("2026-11-01")
})

test("date-only values remain calendar dates instead of shifting through UTC", () => {
  expect(formatSiteDate("2026-09-03")).toBe("Sep 3, 2026")
  expect(addSiteCalendarDays("2026-03-07", 2)).toBe("2026-03-09")
  expect(addSiteCalendarDays("2026-11-01", -1)).toBe("2026-10-31")
})

test("New York wall times convert to canonical UTC and reject the spring DST gap", () => {
  expect(siteLocalDateTimeToIso("2026-03-08T02:30")).toBeNull()
  expect(siteLocalDateTimeToIso("2026-03-08T03:30")).toBe("2026-03-08T07:30:00.000Z")
  expect(siteLocalDateTimeToIso("2026-11-01T01:30")).toBe("2026-11-01T05:30:00.000Z")
  expect(formatSiteDateTimeInput("2026-11-01T06:30:00.000Z")).toBe("2026-11-01T01:30")
  expect(formatSiteWallTime("13:05")).toBe("1:05 PM")
})
