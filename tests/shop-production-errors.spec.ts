import { expect, test } from "@playwright/test"

const PDF_FILE = {
  name: "sample-plan.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF"),
}

test("thinset calculator returns a usable bag estimate", async ({ page }) => {
  await page.goto("/shop/tile-work/thinset-calculator", { waitUntil: "networkidle" })

  await expect(page.getByTestId("thinset-calculator")).toBeVisible()
  await page.getByLabel("Square footage").fill("1000")
  await page.getByLabel("Tile size").selectOption("large")
  await page.getByLabel("Trowel size").selectOption("half")
  await page.getByLabel("Bag coverage").fill("50")
  await page.getByLabel("Waste percentage").fill("10")

  await expect(page.getByText("22", { exact: true })).toBeVisible()
  await expect(page.getByText("1,100 sq. ft.", { exact: true })).toBeVisible()
})

for (const upload of [
  { route: "/shop/framing", label: "Upload framer list" },
  { route: "/shop/framing", label: "Upload blueprint" },
  { route: "/shop/kitchen", label: "Upload kitchen plan" },
  { route: "/shop/kitchen", label: "Upload design spec" },
]) {
  test(`${upload.label} exposes a real submission action after file selection`, async ({ page }) => {
    await page.goto(upload.route, { waitUntil: "networkidle" })
    const fileInput = page.locator(`input[type="file"][aria-label="${upload.label}"]`)
    await expect(fileInput).toBeAttached()
    await fileInput.setInputFiles(PDF_FILE)
    await expect(page.getByText("sample-plan.pdf", { exact: true })).toBeVisible()
    const processButton = page.getByRole("button", { name: `Upload and process: ${upload.label}` })
    await expect(processButton).toBeVisible()
    await processButton.click()
    await expect(page.getByRole("heading", { name: "Sign in to send your request" })).toBeVisible()
  })
}

test("Door and molding offers products and a working custom quote path", async ({ page }) => {
  await page.goto("/shop/door-and-molding")

  await expect(page.getByText("No items are assigned to this tool page yet.")).toHaveCount(0)
  await expect(page.getByRole("heading", { name: "1-Panel Shaker Interior Door" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Common materials" })).toBeVisible()
  await expect(page.getByText("Interior slab doors", { exact: true })).toBeVisible()
  await expect(page.getByText("Need Help With a Custom Door and molding Order?", { exact: true })).toBeVisible()
  await expect(page.getByLabel("Describe your material request")).toBeVisible()
})

test("Exterior offers envelope products and a working upload/quote path", async ({ page }) => {
  await page.goto("/shop/exterior")

  await expect(page.getByRole("heading", { name: "Exterior", exact: true })).toBeVisible()
  await expect(page.getByText("No items are assigned to this tool page yet.")).toHaveCount(0)
  await expect(page.getByText("Metal flashing", { exact: true })).toBeVisible()
  await expect(page.getByText("House wrap", { exact: true })).toBeVisible()
  await expect(page.getByText("Exterior sealants", { exact: true })).toBeVisible()
  await expect(page.getByText("Need Help With a Custom Exterior Order?", { exact: true })).toBeVisible()
  await expect(page.getByLabel("Attach blueprint or shopping list")).toBeVisible()
})
