import { expect, test } from "@playwright/test"
import { readFileSync } from "node:fs"

test("structured originals use compact review and Step2 routing independent of AI", () => {
  const page = readFileSync("app/owner/materials/requests/[requestId]/page.tsx", "utf8")
  expect(page).toContain("reviewProducts={reviewDisplayItems.length ?")
  expect(page).toContain("supplierRouting={reviewDisplayItems.length ?")
  expect(page).toContain("!isRequestIntakePlaceholder(item)")
  const editor = readFileSync("components/buildflow/original-request-item-editor.tsx", "utf8")
  expect(editor).toContain('if (item && itemKind === "organized" && revisionRef.current)')
  expect(editor).toContain('if (mode === "add" || itemKind === "original")')
  expect(editor).toContain("onOriginalSaved?.()")
  expect(editor).toContain("expectedRef.current = result.expectedItemSnapshot")
})

for (const kind of ["original", "mixed"]) for (const width of [390, 1440]) test(`${kind} review keeps supported original editor at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  let writes = 0
  await page.route("**/*", route => { if (route.request().method() === "POST") { writes++; return route.abort() } return route.continue() })
  await page.goto(`/preview/request-items?kind=${kind}`)
  const panel = page.getByLabel("Current product review")
  await expect(panel).toContainText("product 8")
  await expect(panel).toContainText("Edits save automatically")
  await expect(panel.getByRole("combobox", { name: "Sheet size" })).toHaveCount(0)
  await expect(panel.getByText("Answers save automatically")).toHaveCount(0)
  await expect(panel.getByRole("button", { name: "Undo edit" })).toHaveCount(0)
  await panel.getByRole("button", { name: "Edit details" }).click()
  await expect(page.getByRole("button", { name: "Save changes", exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Done", exact: true })).toBeVisible()
  await page.screenshot({ path: `/tmp/item-autosave-dialog-${kind}-${width}-${test.info().project.name}.png` })
  expect(writes).toBe(0)
  await page.getByRole("button", { name: "Done", exact: true }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `/tmp/original-review-${kind}-${width}-${test.info().project.name}.png` })
})

test("Next request preview keeps incomplete original draft on browser Back", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  let writes = 0
  await page.route("**/*", route => { if (route.request().method() === "POST") { writes++; return route.abort() } return route.continue() })
  await page.goto("/preview/request-items?kind=original")
  await page.getByLabel("Current product review").getByRole("button", { name: "Edit details" }).click()
  await page.getByLabel("Quantity", { exact: true }).fill("")
  await page.evaluate(() => history.back())
  await expect(page.getByRole("dialog")).toBeVisible()
  await expect(page.getByLabel("Quantity", { exact: true })).toHaveValue("")
  await expect(page.getByText("Complete the empty fields before leaving. Your draft is still here.")).toBeVisible()
  await page.getByLabel("Quantity", { exact: true }).fill("67")
  await page.evaluate(() => history.back())
  await expect(page.getByRole("dialog")).toHaveCount(0)
  expect(writes).toBe(0)
})
