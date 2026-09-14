import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

import {
  CARLOS_WORK_BROWSER_STATEMENT,
  carlosWorkBrowserDirectUrl,
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

test("dashboard Company screen shortcut includes Carlos without exposing owner tools", async () => {
  const source = await readFile(path.join(root, "app/admin/build-map/page.tsx"), "utf8")
  expect(source).toContain("const canOpenCompanyScreen = access.owner ||")
  expect(source).toContain('String(user.email || profile?.email || "").trim().toLowerCase() === CARLOS_WORK_BROWSER_EMAIL')
  expect(source).toMatch(/canOpenCompanyScreen\s*\? \[\{ href: "\/admin\/ai-tools\/work-browser", label: "Company screen" \}\]/)
  expect(source.match(/href: "\/admin\/ai-tools\/work-browser"/g)).toHaveLength(1)
  expect(source).toMatch(/access\.owner\s*\? \[\s*\{\s*href: "\/admin\/goals-progress\/website-work",\s*label: "David Dashboard",\s*\},\s*\{ href: "\/admin\/payments", label: "Payment Center" \}/)
})

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

test("work-browser offers a Tailnet IP fallback when MagicDNS is unavailable", () => {
  const owner = new URL(carlosWorkBrowserDirectUrl(true))
  const employee = new URL(carlosWorkBrowserDirectUrl(false))
  expect(owner.origin).toBe("http://100.66.91.3:6081")
  expect(employee.origin).toBe("http://100.66.91.2:6081")
  expect(owner.searchParams.get("view_only")).toBe("1")
  expect(employee.searchParams.get("view_only")).toBe("0")
})

test("Carlos launcher has one same-tab screen link without a blank viewer", async () => {
  const source = await readFile(path.join(process.cwd(), "components/buildflow/company-screen-launcher.tsx"), "utf8")
  expect(source.match(/<a\s/g)).toHaveLength(1)
  expect(source).toContain("Open company screen")
  expect(source).not.toContain('target="_blank"')
  expect(source).not.toContain("<iframe")
  expect(source).toContain("Management may view")
})

test("daily smart review has a safe deterministic fallback and saved format", () => {
  const events = [{ id: "1", user_id: "u1", event_type: "communication_sent" as const, page_path: "/admin/communications", page_label: "Communications", metadata: { outcome: "failed", channel: "email" }, occurred_at: "2026-09-04T15:00:00.000Z" }]
  const answer = fallbackCarlosActivityReview(events, "Quote upload button failed")
  expect(answer).toContain("Possible problems")
  expect(answer).toContain("Quote upload button failed")
  const details = serializeCarlosActivityAiReview({ date: "2026-09-04", answer, generatedAt: "2026-09-04T15:01:00.000Z", eventCount: 1 })
  expect(parseCarlosActivityAiReview(details)?.eventCount).toBe(1)
})

test("daily smart review uses the employee-owned website issue count", () => {
  const answer = fallbackCarlosActivityReview([], "Identified 6 issues", [
    { title: "Upload failed", status: "new", priority: "high" },
    { title: "Math mismatch", status: "resolved", priority: "normal" },
  ])
  expect(answer).toContain("2 website issues were reported from Carlos's account; 1 remains unresolved")
  expect(answer).toContain("Upload failed")
})

test("manager UI uses reusable employee naming and exposes owner live screen", async () => {
  const [browserPage, toolsPage, activityPage] = await Promise.all([
    readFile(path.join(root, "app/admin/ai-tools/work-browser/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/carlos-activity/page.tsx"), "utf8"),
  ])
  expect(browserPage).toContain("Company screen")
  expect(browserPage).toContain("Current employee: Carlos")
  expect(browserPage).toContain("Open direct connection")
  expect(toolsPage).toContain("Company screen")
  expect(activityPage).toContain("CarlosActivityAiReviewCard")
})
