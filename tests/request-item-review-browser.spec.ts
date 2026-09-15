import { expect, test } from "@playwright/test"

for (const width of [390, 1440]) test(`62 products and focused question resume at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  await page.route("**/*", (route) => route.request().method() === "POST" ? route.abort() : route.continue())
  await page.goto("/preview/request-items")
  await expect(page.getByRole("button", { name: /Dimensional lumber|CDX plywood/ })).toHaveCount(62)
  await expect(page.getByLabel("Current product review")).toContainText("product 8")
  await expect(page.getByRole("combobox", { name: "Sheet size" })).toHaveValue("")
  await expect(page.getByRole("button", { name: "Next item needing details", exact: true })).toHaveCount(1)
  await page.getByRole("button", { name: "Next item needing details", exact: true }).click()
  await expect(page.getByLabel("Current product review")).toContainText("product 62")
  await page.getByRole("combobox", { name: "Sheet size" }).focus()
  await page.reload()
  await expect(page.getByLabel("Current product review")).toContainText("product 62")
  await page.getByRole("button", { name: "Next item needing details", exact: true }).click()
  await expect(page.getByLabel("Current product review")).toContainText("product 8")
  await expect(page.getByText("62 products · 2 need details")).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const firstProduct = page.getByRole("button", { name: /Dimensional lumber · product 1 / }).first()
  expect((await firstProduct.boundingBox())!.width).toBeGreaterThan(240)
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("avantia:step1-position:v1:local-fixture:11111111-1111-4111-8111-111111111111") || "{}"))
  expect(Object.keys(stored).sort()).toEqual(["field", "itemId"])
  await page.screenshot({ path: `/tmp/step1-review-${test.info().project.name}-${width}.png`, fullPage: false })
})

test("wide work area places the focused question beside the readable list", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.route("**/*", (route) => route.request().method() === "POST" ? route.abort() : route.continue())
  await page.goto("/preview/request-items")
  // The public preview shell is intentionally phone-width. Exercise the actual admin
  // content width without changing site-wide layout or touching authenticated records.
  await page.getByTestId("request-item-review-list").evaluate((element) => {
    let ancestor = element.parentElement
    while (ancestor && ancestor !== document.body) { ancestor.style.width = "100%"; ancestor.style.maxWidth = "none"; ancestor = ancestor.parentElement }
  })
  await expect(page.getByLabel("Current product review")).toContainText("product 8")
  const list = (await page.getByLabel("Request products", { exact: true }).boundingBox())!
  const panel = (await page.getByLabel("Current product review").boundingBox())!
  expect(list.width).toBeGreaterThan(400)
  expect(panel.x).toBeGreaterThan(list.x + list.width)
  await page.screenshot({ path: `/tmp/step1-review-wide-${test.info().project.name}.png` })
})

test("real request preview filter retains selected ready row then releases it on Next", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  let posts = 0
  await page.route("**/*", route => { if (route.request().method() === "POST") { posts++; return route.abort() } return route.continue() })
  await page.goto("/preview/request-items")
  const rows = page.getByLabel("Request products", { exact: true }).getByRole("button")
  await expect(rows).toHaveCount(62)
  await rows.first().click()
  await page.getByRole("group", { name: "Filter products" }).getByRole("button", { name: /Needs details/ }).click()
  await expect(rows).toHaveCount(3)
  await expect(rows.first()).toContainText("Current item")
  await page.getByRole("button", { name: "Next item needing details", exact: true }).click()
  await expect(rows).toHaveCount(2)
  await expect(page.getByLabel("Current product review")).toContainText("product 8")
  await page.reload()
  await expect(rows).toHaveCount(62)
  await expect(page.getByLabel("Current product review")).toContainText("product 8")
  expect(posts).toBe(0)
})
