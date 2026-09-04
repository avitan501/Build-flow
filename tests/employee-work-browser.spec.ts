import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

import {
  CARLOS_WORK_BROWSER_STATEMENT,
  carlosWorkBrowserUrl,
  parseCarlosWorkBrowserAcknowledgement,
  serializeCarlosWorkBrowserAcknowledgement,
} from "@/lib/carlos-work-browser"
import {
  fallbackCarlosActivityReview,
  parseCarlosActivityAiReview,
  serializeCarlosActivityAiReview,
} from "@/lib/carlos-activity-review"

const root = process.cwd()

test("work-browser acknowledgement is explicit, versioned, and parseable", () => {
  expect(CARLOS_WORK_BROWSER_STATEMENT).toContain("viewed and monitored by management at any time")
  const details = serializeCarlosWorkBrowserAcknowledgement({
    acknowledgedAt: "2026-09-04T15:00:00.000Z",
    policyVersion: "2026-09-04",
    statement: CARLOS_WORK_BROWSER_STATEMENT,
  })
  expect(parseCarlosWorkBrowserAcknowledgement(details)).toEqual({
    acknowledgedAt: "2026-09-04T15:00:00.000Z",
    policyVersion: "2026-09-04",
    statement: CARLOS_WORK_BROWSER_STATEMENT,
  })
  expect(parseCarlosWorkBrowserAcknowledgement("wrong-prefix")).toBeNull()
})

test("owner and employee receive separate noVNC permission modes", () => {
  const owner = new URL(carlosWorkBrowserUrl(true))
  const employee = new URL(carlosWorkBrowserUrl(false))
  expect(owner.searchParams.get("view_only")).toBe("1")
  expect(employee.searchParams.get("view_only")).toBe("0")
  expect(owner.searchParams.get("autoconnect")).toBe("1")
  expect(employee.origin).toBe("https://ubuntu-16gb-hil-3.tailc90016.ts.net:8443")
})

test("daily smart review has a safe deterministic fallback and saved format", () => {
  const events = [{ id: "1", user_id: "u1", event_type: "communication_sent" as const, page_path: "/admin/communications", page_label: "Communications", metadata: { outcome: "failed", channel: "email" }, occurred_at: "2026-09-04T15:00:00.000Z" }]
  const answer = fallbackCarlosActivityReview(events, "Quote upload button failed")
  expect(answer).toContain("Possible problems")
  expect(answer).toContain("Quote upload button failed")
  const details = serializeCarlosActivityAiReview({ date: "2026-09-04", answer, generatedAt: "2026-09-04T15:01:00.000Z", eventCount: 1 })
  expect(parseCarlosActivityAiReview(details)?.eventCount).toBe(1)
})

test("manager UI uses reusable employee naming and exposes owner live screen", async () => {
  const [browserPage, toolsPage, activityPage] = await Promise.all([
    readFile(path.join(root, "app/admin/ai-tools/work-browser/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/carlos-activity/page.tsx"), "utf8"),
  ])
  expect(browserPage).toContain("Employee Work Browser")
  expect(browserPage).toContain("Current employee: Carlos")
  expect(toolsPage).toContain("Live employee screen")
  expect(activityPage).toContain("CarlosActivityAiReviewCard")
})
