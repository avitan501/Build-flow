import { expect, test } from "@playwright/test"

test("quote request is an Avantia-branded internal workflow", async ({ page }) => {
  await page.goto("/request-quote")

  await expect(page).toHaveURL(/\/request-quote$/)
  await expect(page.getByRole("heading", { name: "Tell us what you need" })).toBeVisible()
  await expect(page.getByTestId("quote-request-form")).toBeVisible()
  await expect(page.getByText("BLDR", { exact: false })).toHaveCount(0)
  await expect(page.getByLabel("Full name")).toBeVisible()
  await expect(page.getByLabel("First name")).toHaveCount(0)
  await expect(page.getByLabel("Last name")).toHaveCount(0)
  await expect(page.getByLabel(/Job-site address/)).toHaveAttribute("autocomplete", "street-address")
  await expect(page.getByRole("button", { name: "Use current location" })).toBeVisible()
  await expect(page.getByLabel(/Phone/)).not.toHaveAttribute("required", "")
  await expect(page.getByLabel(/Project name/)).toHaveCount(0)
  await expect(page.getByRole("radio", { name: "ASAP" })).not.toHaveAttribute("required", "")
  await expect(page.getByRole("radio", { name: "Later" })).toBeVisible()
  await expect(page.getByText(/I am a/)).toHaveCount(0)
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

test("beat a quote is a dedicated upload request", async ({ page }) => {
  await page.goto("/beat-a-quote")

  await expect(page.getByRole("heading", { name: "Let us beat the quote" })).toBeVisible()
  await expect(page.getByText("Attach the store quote", { exact: false })).toBeVisible()
  await expect(page.locator('input[name="requestKind"]')).toHaveValue("beat_quote")
  await expect(page.getByRole("button", { name: "Send quote to beat" })).toBeVisible()

  await page.getByRole("button", { name: "Open navigation menu" }).click()
  await expect(page.getByRole("navigation", { name: "Request navigation" }).getByRole("link", { name: "Request a Quote" })).toBeVisible()
  await expect(page.getByRole("navigation", { name: "Request navigation" }).getByRole("link", { name: "Beat a Quote" })).toBeVisible()
})

test("plan over the storage limit stays on the form and shows a useful error", async ({ page }) => {
  await page.goto("/request-quote")
  await page.getByLabel("Full name").fill("Large Plan Test Client")
  await page.getByLabel("Email").fill("client@example.com")
  await page.getByLabel(/Project details or material list/).fill("Please quote the attached construction plan.")
  await page.getByLabel(/Attach a plan or material list/).setInputFiles({
    name: "large-plan.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(25 * 1024 * 1024 + 1),
  })

  const form = page.getByTestId("quote-request-form")
  await expect(form.getByRole("alert")).toContainText("maximum upload size is 25 MB")
  await page.getByRole("button", { name: "Send quote request" }).click()
  await expect(page.getByRole("heading", { name: "Tell us what you need" })).toBeVisible()
  await expect(page.getByText("This page couldn’t load")).toHaveCount(0)

  await page.getByRole("button", { name: "Remove file" }).click()
  await expect(form.getByRole("alert")).toHaveCount(0)
})
