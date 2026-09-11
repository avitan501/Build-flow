import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"

test("dashboard attendance occupies its own mobile row without nested links", async () => {
  const source = await readFile("app/admin/build-map/page.tsx", "utf8")
  const header = source.split('data-testid="dashboard-header"')[1].split("</header>")[0]
  expect(source).toContain("grid-cols-[minmax(0,1fr)_auto]")
  expect(header).toContain("order-last col-span-2 min-w-0 sm:order-none sm:col-span-1")
  expect(header).toContain("activityHistory={access.owner}")
  expect(header.match(/<EmployeeClockStatus/g)).toHaveLength(1)
  expect(header).not.toContain('href="/admin/carlos-activity"')
})

test("clock keeps totals readable and AI open state fits mobile grid", async () => {
  const clock = await readFile("components/buildflow/employee-clock-status.tsx", "utf8")
  const search = await readFile("components/buildflow/manager-dashboard-ai-search.tsx", "utf8")
  expect(clock).toContain("min-w-0 max-w-full")
  expect(clock).toContain("whitespace-normal break-words leading-5")
  expect(clock).not.toContain("truncate")
  expect(search).toContain("[&[open]]:col-span-2 sm:[&[open]]:col-span-3")
})
