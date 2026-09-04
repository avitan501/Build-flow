import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()

test("Carlos dashboard removes only the redundant dashboard microcopy", async () => {
  const [dashboard, goals, scorecard] = await Promise.all([
    readFile(path.join(root, "app/admin/build-map/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/goals-progress/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/carlos-daily-scorecard.tsx"), "utf8"),
  ])
  expect(dashboard).not.toContain("Directories, suppliers, AI tools, payments, and notifications")
  expect(dashboard).not.toContain("Most recently updated first")
  expect(goals).not.toContain("Open suppliers, channels, contacts and next steps")
  expect(goals).not.toContain("Call new leads and record the next step")
  expect(goals).not.toContain("Finish branch, product, price, and demo checks")
  expect(scorecard).not.toContain("Updated only from saved, successful website activity")
})

test("Carlos daily wins refreshes automatically only while the dashboard is visible", async () => {
  const [scorecard, refresh] = await Promise.all([
    readFile(path.join(root, "components/buildflow/carlos-daily-scorecard.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/carlos-dashboard-auto-refresh.tsx"), "utf8"),
  ])
  expect(scorecard).toContain("<CarlosDashboardAutoRefresh />")
  expect(refresh).toContain('document.visibilityState === "visible"')
  expect(refresh).toContain("window.setInterval")
  expect(refresh).toContain("router.refresh()")
  expect(refresh).toContain("20_000")
  expect(refresh).toContain('window.addEventListener("focus"')
  expect(refresh).toContain("window.clearInterval")
})
