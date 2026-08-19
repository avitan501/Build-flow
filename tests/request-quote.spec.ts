import { expect, test } from "@playwright/test"

test("quote request is an Avantia-branded internal workflow", async ({ page }) => {
  await page.goto("/request-quote")

  await expect(page).toHaveURL(/\/request-quote$/)
  await expect(page.getByRole("heading", { name: "Get Pricing for Your Materials" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Back to Home" })).toHaveAttribute("href", "/")
  await expect(page.getByTestId("quote-request-form")).toBeVisible()
  await expect(page.getByText("BLDR", { exact: false })).toHaveCount(0)
  await expect(page.getByLabel("Full name")).toBeVisible()
  await expect(page.getByLabel("First name")).toHaveCount(0)
  await expect(page.getByLabel("Last name")).toHaveCount(0)
  await expect(page.getByText("Add job-site details (optional)", { exact: true })).toBeVisible()
  await expect(page.getByLabel("Phone", { exact: true })).toHaveAttribute("required", "")
  await expect(page.getByText("Company (optional)", { exact: true })).toBeVisible()
  await expect(page.getByLabel(/Project name/)).toHaveCount(0)
  await expect(page.getByText(/I am a/)).toHaveCount(0)
  await expect(page.getByRole("navigation", { name: "Mobile homepage" })).toHaveCount((page.viewportSize()?.width ?? 0) < 1024 ? 1 : 0)
  await page.getByText("Add job-site details (optional)", { exact: true }).click()
  await expect(page.getByLabel(/Job-site address/)).toHaveAttribute("autocomplete", "street-address")
  await expect(page.getByRole("button", { name: "Use current location" })).toBeVisible()
  await expect(page.getByRole("radio", { name: "ASAP" })).not.toHaveAttribute("required", "")
  await expect(page.getByRole("radio", { name: "Later" })).toBeVisible()
  await page.getByText("Choose departments (optional)", { exact: true }).click()
  await expect(page.getByText("Framing", { exact: true })).toBeVisible()
  await expect(page.getByText("Flooring", { exact: true })).toBeVisible()
  const attachment = page.getByLabel(/Attach a plan or material list/)
  await expect(attachment).toBeVisible()
  await expect(attachment).toHaveAttribute("accept", ".pdf,.jpg,.jpeg,.png,.webp")
  await expect(page.getByText("PDF, JPG, PNG, or WebP. Maximum 25 MB.")).toBeVisible()

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflow).toBe(false)

  if ((page.viewportSize()?.width ?? 0) > 1000) {
    expect((await page.getByTestId("quote-request-form").boundingBox())?.width ?? 0).toBeGreaterThan(700)
  }
})

test("take care products open detailed Avantia panels and prefill the request", async ({ page }) => {
  await page.goto("/request-quote?request=high-end")

  await expect(page.getByRole("heading", { name: "Take Care of Yourself Materials" })).toBeVisible()
  await expect(page.getByTestId("department-essentials").locator("article")).toHaveCount(10)

  await page.getByRole("button", { name: "View Noam2 Shabbat Water Bar" }).click()
  const dialog = page.getByTestId("essential-product-dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole("heading", { name: "Noam2 Shabbat Water Bar" })).toBeVisible()
  const photos = dialog.getByRole("button", { name: /View photo .* Noam2 Shabbat Water Bar/ })
  await expect(photos).toHaveCount(3)
  await photos.nth(1).click()
  await expect(photos.nth(1)).toHaveAttribute("aria-pressed", "true")
  await expect(dialog.getByText("Automatic Shabbat mode with a calendar through 2054")).toBeVisible()
  await expect(dialog.getByText("17.7 in. H x 12.5 in. W x 14 in. D")).toBeVisible()

  await dialog.getByRole("link", { name: "Request this item" }).click()
  await expect(page).toHaveURL(/request=high-end&item=Noam2/)
  await expect(page.getByLabel(/Material details or list/)).toHaveValue("Please provide pricing and availability for: Noam2 Shabbat Water Bar")
})

test("custom glass explains the options and opens an editable detail request", async ({ page }) => {
  await page.goto("/request-quote?request=high-end")
  await page.getByRole("button", { name: "View Custom Glass" }).click()

  const dialog = page.getByTestId("essential-product-dialog")
  await expect(dialog.getByRole("heading", { name: "Custom Glass" })).toBeVisible()
  await expect(dialog.getByRole("button", { name: /View photo .* Custom Glass/ })).toHaveCount(3)
  await expect(dialog.getByText("Width x height and thickness")).toBeVisible()
  await dialog.getByRole("link", { name: "Request this item" }).click()

  const details = page.getByLabel(/Material details or list/)
  await expect(details).toContainText("Product type:")
  await expect(details).toContainText("Width x height:")
  await details.fill("Custom shower glass, 72 x 84 in., 3/8 in. thick, quantity 1")
  await expect(details).toHaveValue("Custom shower glass, 72 x 84 in., 3/8 in. thick, quantity 1")
})

test("beat a quote is a dedicated upload request", async ({ page }) => {
  await page.goto("/beat-a-quote")

  await expect(page.getByRole("heading", { name: "Upload a Quote. We'll Try to Beat It." })).toBeVisible()
  await expect(page.getByRole("link", { name: "Back to Home" })).toHaveAttribute("href", "/")
  await expect(page.getByText("Attach the supplier quote", { exact: false })).toBeVisible()
  await expect(page.locator('input[name="requestKind"]')).toHaveValue("beat_quote")
  await expect(page.getByRole("button", { name: "Submit Quote for Review" })).toBeVisible()
  await expect(page.getByRole("checkbox", { name: "Framing" })).toHaveCount(0)
  await expect(page.getByRole("navigation", { name: "Mobile homepage" })).toHaveCount((page.viewportSize()?.width ?? 0) < 1024 ? 1 : 0)

  await page.getByRole("button", { name: "Open navigation menu" }).click()
  await expect(page.getByRole("navigation", { name: "Mobile full navigation" }).getByRole("link", { name: /Request Material Pricing/ })).toBeVisible()
  await expect(page.getByRole("navigation", { name: "Mobile full navigation" }).getByRole("link", { name: /Beat My Quote/ })).toBeVisible()
})

test("plan over the storage limit stays on the form and shows a useful error", async ({ page }) => {
  await page.goto("/request-quote")
  await page.getByLabel("Full name").fill("Large Plan Test Client")
  await page.getByLabel("Email").fill("client@example.com")
  await page.getByLabel(/Material details or list/).fill("Please quote the attached construction plan.")
  await page.getByLabel(/Attach a plan or material list/).setInputFiles({
    name: "large-plan.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(25 * 1024 * 1024 + 1),
  })

  const form = page.getByTestId("quote-request-form")
  await expect(form.getByRole("alert")).toContainText("maximum upload size is 25 MB")
  await page.getByRole("button", { name: "Send for Pricing" }).click()
  await expect(page.getByRole("heading", { name: "Get Pricing for Your Materials" })).toBeVisible()
  await expect(page.getByText("This page couldn’t load")).toHaveCount(0)

  await page.getByRole("button", { name: "Remove file" }).click()
  await expect(form.getByRole("alert")).toHaveCount(0)
})
