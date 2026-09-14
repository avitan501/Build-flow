import { expect, test } from "@playwright/test"
import { readFileSync } from "node:fs"

test("structured originals use compact review and Step2 routing independent of AI", () => {
  const page = readFileSync("app/owner/materials/requests/[requestId]/page.tsx", "utf8")
  expect(page).toContain("reviewProducts={reviewDisplayItems.length ?")
  expect(page).toContain("supplierRouting={reviewDisplayItems.length ?")
  expect(page).toContain("!isRequestIntakePlaceholder(item)")
  const editor = readFileSync("components/buildflow/original-request-item-editor.tsx", "utf8")
  expect(editor).toContain('if (item && itemKind === "organized" && revision)')
  expect(editor).toContain('if (mode === "add" || itemKind === "original")')
  expect(editor).toContain("if (result.ok) onOriginalSaved?.()")
})

for (const kind of ["original", "mixed"]) for (const width of [390, 1440]) test(`${kind} review keeps supported original editor at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  let writes = 0
  await page.route("**/*", route => { if (route.request().method() === "POST") { writes++; return route.abort() } return route.continue() })
  await page.goto(`/preview/request-items?kind=${kind}`)
  const panel = page.getByLabel("Current product review")
  await expect(panel).toContainText("product 8")
  await expect(panel).toContainText("Edit details, then save your changes.")
  await expect(panel.getByRole("combobox", { name: "Sheet size" })).toHaveCount(0)
  await expect(panel.getByText("Answers save automatically")).toHaveCount(0)
  await expect(panel.getByRole("button", { name: "Undo edit" })).toHaveCount(0)
  await panel.getByRole("button", { name: "Edit details" }).click()
  await expect(page.getByRole("button", { name: "Save changes", exact: true })).toBeVisible()
  expect(writes).toBe(0)
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `/tmp/original-review-${kind}-${width}-${test.info().project.name}.png` })
})
