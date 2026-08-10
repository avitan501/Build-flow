import { expect, test } from "@playwright/test"

test("address selection closes and keeps one clear selected address", async ({ page }) => {
  const address = "123 Spruce Street, Cedarhurst, NY 11516"

  await page.goto("/shop")
  await page.locator("button[aria-controls='address-picker-panel']").click()
  await expect(page.getByTestId("address-picker-panel")).toBeVisible()

  await page.getByPlaceholder("Add a new address").fill(address)
  await page.getByRole("button", { name: "Use address" }).click()

  await expect(page.getByTestId("address-picker-panel")).toHaveCount(0)
  await expect(page.getByTestId("project-address-value")).toHaveText(address)
  await expect(page.getByText(address, { exact: true })).toHaveCount(1)
})

test("saved guest project hydrates cleanly and can be cleared", async ({ page }) => {
  const address = "55 Oak Avenue, Cedarhurst, NY 11516"
  const pageErrors: string[] = []
  page.on("pageerror", (error) => pageErrors.push(error.message))

  await page.addInitScript((savedAddress) => {
    const project = {
      id: "guest-selected",
      name: savedAddress,
      address: savedAddress,
      createdAt: new Date(2026, 0, 1).toISOString(),
      updatedAt: new Date(2026, 0, 1).toISOString(),
    }
    window.localStorage.setItem("buildflow-guest-projects", JSON.stringify([project]))
    window.localStorage.setItem("buildflow-selected-guest-project", project.id)
  }, address)

  await page.goto("/shop")
  await expect(page.getByTestId("project-address-value")).toHaveText(address)

  await page.locator("button[aria-controls='address-picker-panel']").click()
  await page.getByRole("link", { name: /No selected address/ }).click()

  await expect(page.getByTestId("project-address-value")).toHaveText("No selected address")
  expect(pageErrors.filter((message) => message.includes("Hydration failed"))).toEqual([])
})

test("all departments wrap into downward rows without page overflow", async ({ page }) => {
  await page.goto("/shop")
  await expect(page.getByRole("heading", { name: "Shop by department" })).toBeVisible()

  const cards = page.getByTestId("department-card")
  await expect(cards).toHaveCount(8)

  const rowPositions = await cards.evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().top)))
  expect(new Set(rowPositions).size).toBeGreaterThan(1)

  const widths = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(widths.scrollWidth).toBe(widths.clientWidth)
})

test("department cards use distinct full-bleed photography instead of generic icons", async ({ page }) => {
  await page.goto("/shop")

  const cardImages = page.getByTestId("department-card").getByRole("img")
  await expect(cardImages).toHaveCount(8)

  const sources = await cardImages.evaluateAll((images) =>
    images.map((image) => (image as HTMLImageElement).currentSrc || (image as HTMLImageElement).src),
  )

  expect(sources.every((source) => !source.includes("department-essentials") && !source.includes(".svg"))).toBe(true)
  expect(new Set(sources).size).toBe(8)
})

test("flooring uses the customer-facing name and framing uses its dedicated photo", async ({ page }) => {
  await page.goto("/shop")

  await expect(page.getByTestId("department-card").filter({ hasText: "Flooring" })).toBeVisible()
  await expect(page.getByTestId("department-card").filter({ hasText: "Wood Floor" })).toHaveCount(0)

  const framingCard = page.getByTestId("department-card").filter({ hasText: "Framing" })
  await expect(framingCard.locator('img[src*="framing-materials-yard.webp"]')).toBeVisible()
})

test("retired departments are hidden and department symbols are visible", async ({ page }) => {
  await page.goto("/shop")

  await expect(page.getByTestId("department-card").filter({ hasText: "Kitchen" })).toHaveCount(0)
  await expect(page.getByTestId("department-card").filter({ hasText: "Services" })).toHaveCount(0)
  await expect(page.getByTestId("department-card").filter({ hasText: "Eitan" })).toHaveCount(0)
  await expect(page.getByTestId("department-card").first().getByTestId("department-symbols")).toBeVisible()
})

test("manager pages require authentication and stay out of the guest menu", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Open navigation menu" }).click()
  await expect(page.getByRole("link", { name: "Manager", exact: true })).toHaveCount(0)

  await page.goto("/admin/build-map")
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fbuild-map/)

  await page.goto("/admin/ai-tools")
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fai-tools/)
})

test("home shows the compact manufacturer brand showcase", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByRole("heading", { name: "Brands we source" })).toBeVisible()
  await expect(page.getByTestId("shop-brand-grid").getByRole("img")).toHaveCount(8)
})

test("siding and roofing are separate departments with a complete request flow", async ({ page }) => {
  await page.goto("/shop")
  await expect(page.getByRole("link", { name: /Siding/ })).toBeVisible()
  await expect(page.getByRole("link", { name: /Roofing/ })).toBeVisible()

  await page.goto("/shop/siding")
  await expect(page.getByRole("heading", { name: "Siding", exact: true })).toBeVisible()
  await expect(page.getByText("Upload blueprint or shopping list", { exact: true })).toBeVisible()
  const essentials = page.getByTestId("department-essentials").locator("article")
  await expect(essentials).toHaveCount(8)
  const positions = await essentials.locator("[role='img']").evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).backgroundPosition),
  )
  expect(new Set(positions).size).toBe(8)
  await expect(page.getByRole("heading", { name: "Available items" })).toHaveCount(0)
  await expect(page.getByText("Recommended next", { exact: true })).toHaveCount(0)
  await expect(page.getByRole("heading", { name: "Order here with our AI agent" })).toBeVisible()
})

test("kitchen, tile, and drywall omit retired promotional and calculator cards", async ({ page }) => {
  await page.goto("/shop/kitchen")
  await expect(page.getByText("Premium cabinetry for builder-ready kitchens")).toHaveCount(0)

  await page.goto("/shop/tile-work")
  await expect(page.getByText("Thinset calculator", { exact: true })).toHaveCount(0)

  await page.goto("/shop/sheet-rock")
  await expect(page.getByText("Drywall calculator", { exact: true })).toHaveCount(0)
})

test("shop shows the sourcing brands and direct help actions", async ({ page }) => {
  await page.goto("/shop")

  await expect(page.getByRole("heading", { name: "Brands we source" })).toBeVisible()
  await expect(page.getByTestId("shop-brand-grid").getByRole("img")).toHaveCount(8)
  await expect(page.getByRole("link", { name: "Call us" })).toHaveAttribute("href", "tel:+19292077156")
  await expect(page.getByRole("link", { name: "Text us" })).toHaveAttribute("href", "sms:+19292077156?body=Hi%20Avantia%20Build%2C%20I%20need%20help%20finding%20construction%20materials.")
})

test("guest projects stay compact until the full list is requested", async ({ page }) => {
  await page.addInitScript(() => {
    const projects = Array.from({ length: 8 }, (_, index) => ({
      id: `guest-${index + 1}`,
      name: `Project ${index + 1}`,
      address: `${index + 1} Main Street, Cedarhurst, NY 11516`,
      createdAt: new Date(2026, 0, index + 1).toISOString(),
      updatedAt: new Date(2026, 0, index + 1).toISOString(),
    }))

    window.localStorage.setItem("buildflow-guest-projects", JSON.stringify(projects))
  })

  await page.goto("/projects")

  await expect(page.getByTestId("guest-project-card")).toHaveCount(3)
  await page.getByRole("button", { name: "Show all 8 projects" }).click()
  await expect(page.getByTestId("guest-project-card")).toHaveCount(8)
  await expect(page.getByRole("button", { name: "Show recent projects" })).toBeVisible()
})
