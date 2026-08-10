import { expect, test } from "@playwright/test"

test("quote request is an Avantia-branded internal workflow", async ({ page }) => {
  await page.goto("/request-quote")

  await expect(page).toHaveURL(/\/request-quote$/)
  await expect(page.getByRole("heading", { name: "Request a construction quote" })).toBeVisible()
  await expect(page.getByTestId("quote-request-form")).toBeVisible()
  await expect(page.getByText("BLDR", { exact: false })).toHaveCount(0)
  await expect(page.getByLabel("First name")).toBeVisible()
  await expect(page.getByLabel("Last name")).toBeVisible()
  await expect(page.getByLabel("Job-site street address")).toBeVisible()
  await expect(page.getByText("Framing", { exact: true })).toBeVisible()
  await expect(page.getByText("Flooring", { exact: true })).toBeVisible()
  const attachment = page.getByLabel(/Attach a plan or material list/)
  await expect(attachment).toBeVisible()
  await expect(attachment).toHaveAttribute("accept", ".pdf,.jpg,.jpeg,.png,.webp")
  await expect(page.getByText("PDF, JPG, PNG, or WebP. Maximum 4 MB.")).toBeVisible()

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflow).toBe(false)

  if ((page.viewportSize()?.width ?? 0) > 1000) {
    expect((await page.getByTestId("quote-request-form").boundingBox())?.width ?? 0).toBeGreaterThan(700)
  }
})
