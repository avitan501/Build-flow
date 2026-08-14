import { readFile } from "node:fs/promises"
import path from "node:path"

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
  await expect(page.getByRole("heading", { name: "What are you working on now?" })).toBeVisible()

  const cards = page.getByTestId("department-card")
  await expect(cards).toHaveCount(9)

  const rowPositions = await cards.evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().top)))
  expect(new Set(rowPositions).size).toBeGreaterThan(1)

  const widths = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(widths.scrollWidth).toBe(widths.clientWidth)
})

test("shop header keeps the animated Avantia logo beside material search", async ({ page }) => {
  await page.goto("/shop")

  const header = page.getByTestId("site-header")
  const logo = header.getByRole("img", { name: "Avantia Build" })
  const search = header.getByRole("button", { name: /Search materials/ })

  await expect(logo).toBeVisible()
  await expect(logo).toHaveAttribute("src", /avantia-build-lockup-animated\.webp/)
  await expect(search).toBeVisible()
  await expect(page.locator("main").getByTestId("avantia-build-lockup")).toHaveCount(0)
  expect(await search.getByText("Search materials").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)

  const headerSurface = await header.evaluate((element) => ({
    backgroundColor: getComputedStyle(element).backgroundColor,
    backgroundImage: getComputedStyle(element).backgroundImage,
  }))
  const logoSurface = await logo.evaluate((element) => getComputedStyle(element.closest("a")!).backgroundColor)
  expect(headerSurface).toEqual({ backgroundColor: "rgb(255, 255, 255)", backgroundImage: "none" })
  expect(logoSurface).toBe(headerSurface.backgroundColor)

  const positions = await Promise.all([logo.boundingBox(), search.boundingBox()])
  expect(positions[0]?.x).toBeLessThan(positions[1]?.x ?? Number.POSITIVE_INFINITY)
  expect(Math.abs((positions[0]?.y ?? 0) - (positions[1]?.y ?? 0))).toBeLessThan(12)
})

test("department categories use distinct unframed product cutouts", async ({ page }) => {
  await page.goto("/shop")

  const cardImages = page.getByTestId("department-card").getByRole("img")
  await expect(cardImages).toHaveCount(9)

  const sources = await cardImages.evaluateAll((images) =>
    images.map((image) => image instanceof HTMLImageElement ? image.currentSrc || image.src : getComputedStyle(image).backgroundImage),
  )

  expect(sources.every((source) => source && !source.includes(".svg"))).toBe(true)
  expect(new Set(sources).size).toBe(9)
})

test("customer-facing department names and category cutouts are clean", async ({ page }) => {
  await page.goto("/shop")

  await expect(page.getByTestId("department-card").filter({ hasText: "Flooring" })).toBeVisible()
  await expect(page.getByTestId("department-card").filter({ hasText: "Wood Floor" })).toHaveCount(0)
  await expect(page.getByTestId("department-card").filter({ hasText: "Tile work" })).toHaveCount(0)
  await expect(page.getByTestId("department-card").filter({ hasText: "Tile" })).toBeVisible()

  const framingCard = page.getByTestId("department-card").filter({ hasText: "Framing" })
  await expect(framingCard.getByRole("img", { name: /framing/i })).toHaveCSS("background-image", /lumber-grid\.webp/)

  const electricalCard = page.getByTestId("department-card").filter({ hasText: "Electrical" })
  await expect(electricalCard.getByRole("img")).toHaveAttribute("src", /electrical-department-cutout-v2\.webp/)
  await expect(electricalCard.getByRole("img")).toHaveClass(/object-contain/)

  const tileCard = page.getByTestId("department-card").filter({ hasText: "Tile" })
  await expect(tileCard.getByRole("img")).toHaveAttribute("src", /tile-department-cutout-v2\.webp/)
  await expect(tileCard.getByRole("img")).toHaveClass(/object-contain/)
})

test("retired departments are hidden and category photos stay clean", async ({ page }) => {
  await page.goto("/shop")

  await expect(page.getByTestId("department-card").filter({ hasText: "Kitchen" })).toHaveCount(0)
  await expect(page.getByTestId("department-card").filter({ hasText: "Services" })).toHaveCount(0)
  await expect(page.getByTestId("department-card").filter({ hasText: "Eitan" })).toHaveCount(0)
  await expect(page.getByTestId("department-grid").getByTestId("department-symbols")).toHaveCount(0)
  const firstCard = page.getByTestId("department-card").first()
  const cardStyle = await firstCard.evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    border: getComputedStyle(element).borderWidth,
    shadow: getComputedStyle(element).boxShadow,
  }))
  expect(["rgba(0, 0, 0, 0)", "oklab(0 0 0 / 0)"]).toContain(cardStyle.background)
  expect(cardStyle.border).toBe("0px")
  expect(cardStyle.shadow).toBe("none")
})

test("manager pages require authentication and stay out of the guest menu", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Open navigation menu" }).click()
  const drawerWidth = await page.getByRole("complementary").evaluate((element) => element.getBoundingClientRect().width)
  expect(drawerWidth).toBeLessThanOrEqual(288)
  await expect(page.getByRole("link", { name: "Manager", exact: true })).toHaveCount(0)

  await page.goto("/admin/build-map")
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fbuild-map/)

  await page.goto("/admin/ai-tools")
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fai-tools/)

  await page.goto("/admin/traffic")
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Ftraffic/)

  await page.goto("/admin/ai-tools/order-test")
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fai-tools%2Forder-test/)
})

test("footer has the complete Avantia Build contact lockup", async ({ page }) => {
  await page.goto("/")

  const footer = page.locator("footer")
  await expect(footer.getByText("You build. We handle the materials.", { exact: true })).toBeVisible()
  await expect(footer.getByRole("link", { name: "office@build.avantiap.com" })).toHaveAttribute("href", "mailto:office@build.avantiap.com")
  await expect(footer.getByRole("link", { name: "(516) 908-8319" })).toHaveAttribute("href", "tel:+15169088319")
  await expect(footer.getByRole("link", { name: "WhatsApp us" })).toHaveAttribute("href", "https://wa.me/15169088319?text=Hi%20Avantia%20Build%2C%20I%20need%20help%20with%20construction%20materials.")
  await expect(footer.locator('[data-icon="whatsapp"]')).toHaveCount(1)
  await expect(footer.getByTestId("avantia-build-lockup")).toBeVisible()
})

test("traffic endpoint accepts same-site events and blocks cross-site submissions", async ({ request }) => {
  const accepted = await request.post("/api/site-traffic", {
    data: { path: "/shop", sessionId: "playwright-traffic-session" },
  })
  expect(accepted.status()).toBe(204)

  const blocked = await request.post("/api/site-traffic", {
    headers: { origin: "https://malicious.example" },
    data: { path: "/shop", sessionId: "cross-site-traffic-session" },
  })
  expect(blocked.status()).toBe(403)
})

test("traffic dashboard exposes live status to approved manager portal users", async () => {
  const [trafficPage, navigation] = await Promise.all([
    readFile(path.join(process.cwd(), "app/admin/traffic/page.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "components/buildflow/admin-shell.tsx"), "utf8"),
  ])

  expect(trafficPage).toContain("requireManagerPortalProfile")
  expect(trafficPage).toContain("Tracking active")
  expect(trafficPage).not.toContain("requireAdminProfile")
  expect(navigation).toContain('link.href === "/admin/traffic"')
})

test("home shows the compact manufacturer brand showcase", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByRole("heading", { name: "Shop Our Brands" })).toBeVisible()
  await expect(page.getByTestId("shop-brand-grid").getByRole("img")).toHaveCount(8)
})

test("siding and roofing are separate departments with a complete request flow", async ({ page }) => {
  await page.goto("/shop")
  await expect(page.getByRole("link", { name: /Siding/ })).toBeVisible()
  await expect(page.getByRole("link", { name: /Roofing/ })).toBeVisible()

  await page.goto("/shop/siding")
  await expect(page.getByRole("heading", { name: "Siding", exact: true })).toBeVisible()
  const essentials = page.getByTestId("department-essentials").locator("article")
  await expect(essentials).toHaveCount(8)
  const presentation = await essentials.first().evaluate((element) => {
    const image = element.querySelector("[role='img']")
    return {
      articleBackground: getComputedStyle(element).backgroundColor,
      imageBorderWidth: image ? getComputedStyle(image).borderWidth : null,
    }
  })
  expect(presentation.articleBackground).toBe("rgba(0, 0, 0, 0)")
  expect(presentation.imageBorderWidth).toBe("0px")
  const positions = await essentials.locator("[role='img']").evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).backgroundPosition),
  )
  expect(new Set(positions).size).toBe(8)
  await expect(page.getByRole("heading", { name: "Available items" })).toHaveCount(0)
  await expect(page.getByText("Recommended next", { exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Start quick order" })).toHaveCount(0)
  await expect(page.getByText("Need Help With a Custom Siding Order?", { exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Place an order here" })).toBeVisible()
  await expect(page.getByText("Attach blueprint or shopping list", { exact: true })).toBeVisible()

  await page.goto("/shop/roofing")
  await expect(page.getByText("Need Help With a Custom Roofing Order?", { exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Place an order here" })).toBeVisible()
  await expect(page.getByText("Attach blueprint or shopping list", { exact: true })).toBeVisible()

  await page.goto("/shop/window")
  await expect(page.getByText("Upload your window schedule", { exact: true })).toHaveCount(0)
  await expect(page.getByText("Need Help With a Custom Window Order?", { exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Place an order here" })).toBeVisible()
  await expect(page.getByText("Attach blueprint or shopping list", { exact: true })).toBeVisible()
})

test("kitchen, tile, and drywall omit retired promotional and calculator cards", async ({ page }) => {
  await page.goto("/shop/kitchen")
  await expect(page.getByText("Premium cabinetry for builder-ready kitchens")).toHaveCount(0)

  await page.goto("/shop/tile-work")
  await expect(page.getByText("Thinset calculator", { exact: true })).toHaveCount(0)

  await page.goto("/shop/sheet-rock")
  await expect(page.getByText("Drywall calculator", { exact: true })).toHaveCount(0)
})

test("flooring uses a compact contractor configurator with a live summary", async ({ page }) => {
  await page.goto("/shop/wood-floor")

  await expect(page.getByText("Choose materials", { exact: true })).toHaveCount(0)
  await expect(page.getByText("Answer a few quick questions", { exact: true })).toHaveCount(0)
  await expect(page.getByTestId("flooring-group-material")).toBeVisible()
  await expect(page.getByTestId("flooring-group-size")).toBeVisible()
  await expect(page.getByTestId("flooring-group-extras")).toBeVisible()
  await expect(page.getByRole("button", { name: "Plain Sawn / Standard" })).toBeVisible()
  await expect(page.getByText("What installation method will be used?", { exact: true })).toHaveCount(0)
  await expect(page.getByText("Wood floor calculator", { exact: true })).toHaveCount(0)

  const redOak = page.getByRole("button", { name: "Red Oak" })
  await redOak.click()
  await expect(redOak).toHaveAttribute("aria-pressed", "true")
  await page.getByRole("button", { name: "5″" }).click()
  await page.getByLabel("How much flooring do you need?").fill("1200")
  await page.getByRole("button", { name: "Yes" }).nth(0).click()
  await page.getByLabel("How many square feet of underlayment?").fill("1200")
  await expect(page.getByRole("button", { name: "Add 10%" })).toBeVisible()
  await expect(page.getByText("Contractor order builder", { exact: true })).toHaveCount(0)

  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    const desktopSummary = page.getByTestId("flooring-order-summary")
    await expect(desktopSummary).toContainText("1,200 sq. ft.")
    expect((await desktopSummary.boundingBox())?.width ?? 999).toBeLessThanOrEqual(245)
  } else {
    await expect(page.getByTestId("flooring-mobile-summary")).toContainText("1,200 sq. ft.")
  }

  await page.reload()
  await expect(page.getByRole("button", { name: "Red Oak" })).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByLabel("How much flooring do you need?")).toHaveValue("1200")

  const restoredReview = (page.viewportSize()?.width ?? 0) >= 1024
    ? page.getByTestId("flooring-order-summary").getByRole("button", { name: "Review Request" })
    : page.getByTestId("flooring-mobile-summary").getByRole("button", { name: "Review" })
  await restoredReview.click()
  await expect(page.getByRole("heading", { name: "Review Your Request" })).toBeVisible()
  await expect(page.getByText("Not answered", { exact: true })).toHaveCount(0)
  await page.getByRole("button", { name: "Confirm Request", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Confirm This Flooring Request" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Sign in to send your request" })).toBeVisible()
  const continueDialog = page.getByRole("dialog")
  await expect(continueDialog.getByText("Choose a project", { exact: true })).toHaveCount(0)
  await expect(continueDialog.getByRole("link", { name: "Log in", exact: true })).toBeVisible()
  await expect(continueDialog.getByRole("link", { name: "Create account", exact: true })).toBeVisible()

  const widths = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(widths.scrollWidth).toBe(widths.clientWidth)
})

test("sheetrock uses the compact on-page contractor configurator", async ({ page }) => {
  await page.goto("/shop/sheet-rock")

  await expect(page.getByText("Choose materials", { exact: true })).toHaveCount(0)
  await expect(page.getByTestId("flooring-group-material")).toHaveCount(0)
  await expect(page.getByTestId("flooring-group-size")).toBeVisible()
  await expect(page.getByTestId("flooring-group-extras")).toBeVisible()
  await expect(page.getByRole("button", { name: "4′ × 8′" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Green / Moisture Resistant" })).toBeVisible()
  await expect(page.getByRole("button", { name: "5/8″" })).toBeVisible()
  await expect(page.getByText("Do you need drywall screws?", { exact: true })).toBeVisible()
  await expect(page.getByText("Need Help With a Custom Sheet rock Order?", { exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Department Essentials" })).toHaveCount(0)
  await expect(page.getByText("What material do you need?", { exact: true })).toHaveCount(0)
  await expect(page.getByText("Drywall / Sheetrock", { exact: true })).toHaveCount(0)
  await expect(page.getByText("Do you need drywall tape?", { exact: true })).toBeVisible()
  await expect(page.getByText("Do you need metal studs?", { exact: true })).toBeVisible()
  const sheetSizeBox = await page.locator('[data-question-key="sheet_size"]').boundingBox()
  const thicknessBox = await page.locator('[data-question-key="thickness"]').boundingBox()
  expect(sheetSizeBox?.y).toBe(thicknessBox?.y)
  const accessories = page.getByTestId("flooring-group-extras")
  await expect(accessories.getByText("Do you need drywall tape?", { exact: true })).toBeVisible()
  await expect(accessories.getByText("Do you need metal studs?", { exact: true })).toBeVisible()

  await page.getByLabel("How many sheets do you need?").fill("80")
  await page.getByRole("button", { name: "4′ × 12′" }).click()
  await page.getByRole("button", { name: "Regular", exact: true }).click()
  await page.getByRole("button", { name: "1/2″" }).click()

  const summary = (page.viewportSize()?.width ?? 0) >= 1024
    ? page.getByTestId("flooring-order-summary")
    : page.getByTestId("flooring-mobile-summary")
  await expect(summary).toContainText("80")

  const widths = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(widths.scrollWidth).toBe(widths.clientWidth)
})

test("tile uses an on-page materials configurator", async ({ page }) => {
  await page.goto("/shop/tile-work")

  await expect(page.getByRole("heading", { name: "Tile Quick Order" })).toBeVisible()
  await expect(page.getByTestId("flooring-group-material")).toHaveCount(0)
  await expect(page.getByLabel("How many bags of MAPEI Ultraflex thinset do you need?")).toBeVisible()
  await expect(page.getByLabel("How many yards of fine sand do you need?")).toBeVisible()
  await expect(page.getByLabel("How many bags of Portland cement do you need?")).toBeVisible()
  await expect(page.getByLabel("How many square feet of tile wire mesh do you need?")).toBeVisible()
  await expect(page.getByText("What tile underlayment should we include?", { exact: true })).toHaveCount(0)
  await expect(page.getByText("What other setting materials should we include?", { exact: true })).toHaveCount(0)
  await expect(page.getByText("Do you need liquid waterproofing membrane?", { exact: true })).toBeVisible()
  await page.getByLabel("How many bags of MAPEI Ultraflex thinset do you need?").fill("12")

  const summary = (page.viewportSize()?.width ?? 0) >= 1024
    ? page.getByTestId("flooring-order-summary")
    : page.getByTestId("flooring-mobile-summary")
  await expect(summary).toContainText("12")
})

test("door and molding reveals the matching order fields", async ({ page }) => {
  await page.goto("/shop/door-and-molding")

  await expect(page.getByRole("heading", { name: "Door & Molding Quick Order" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Choose Department" })).toBeVisible()
  await page.getByRole("button", { name: "Molding" }).click()
  await expect(page.getByRole("link", { name: "Molding Catalog" })).toHaveAttribute("href", "https://www.gardenstatelumber.com/products-programs/moulding/")
  await expect(page.getByLabel("Molding profile code")).toHaveCount(1)
  await expect(page.getByLabel("Length")).toHaveCount(1)
  await expect(page.getByRole("button", { name: "Add Another Molding" })).toBeVisible()

  await page.getByRole("button", { name: "Door", exact: true }).click()
  await expect(page.getByRole("button", { name: "Flat / flush" })).toBeVisible()
  await expect(page.getByRole("button", { name: "1-panel Shaker" })).toBeVisible()
  await expect(page.getByRole("button", { name: "1 3/8 in." })).toBeVisible()
  await expect(page.getByRole("button", { name: "Call me to arrange a jobsite measurement" })).toBeVisible()
  await page.getByRole("button", { name: "I have the measurements" }).click()
  await expect(page.getByLabel("Enter the door measurements")).toBeVisible()
})

test("electrical supports repeatable Romex and BX cable rows", async ({ page }) => {
  await page.goto("/shop/electrical")

  await expect(page.getByRole("heading", { name: "Electrical Cable Quick Order" })).toBeVisible()
  await expect(page.getByText("Contractor order builder", { exact: true })).toHaveCount(0)
  await expect(page.getByText("Build a cable list for this project.", { exact: true })).toHaveCount(0)
  await expect(page.getByLabel("Cable type")).toHaveCount(1)
  await page.getByLabel("Cable type").selectOption("Romex")
  await page.getByLabel("Cable number").selectOption("12/2")
  await page.getByLabel("Length").selectOption("250 ft.")
  await page.getByLabel("Quantity").fill("3")
  await page.getByRole("button", { name: "Add Another Cable" }).click()
  await expect(page.getByLabel("Cable type")).toHaveCount(2)
  await expect(page.locator('[role="img"]')).not.toHaveCount(0)

  const widths = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }))
  expect(widths.scrollWidth).toBe(widths.clientWidth)
})

test("framing supports repeatable lumber order rows", async ({ page }) => {
  await page.goto("/shop/framing")

  await expect(page.getByRole("heading", { name: "Framing Lumber Quick Order" })).toBeVisible()
  await expect(page.getByLabel("Lumber size")).toHaveCount(1)
  await page.getByLabel("Lumber size").selectOption("2x4")
  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    await expect(page.getByTestId("flooring-order-summary").getByText("33%", { exact: true })).toBeVisible()
  } else {
    await expect(page.getByTestId("flooring-mobile-summary").getByText("1/3 required fields", { exact: true })).toBeVisible()
  }
  await page.getByLabel("Length").selectOption("12 ft.")
  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    await expect(page.getByTestId("flooring-order-summary").getByText("67%", { exact: true })).toBeVisible()
  }
  await page.getByLabel("Quantity").fill("40")
  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    await expect(page.getByTestId("flooring-order-summary").getByText("100%", { exact: true })).toBeVisible()
  }
  await page.getByLabel("Douglas Fir").check()
  await page.getByLabel("Pressure Treated").check()
  await page.getByRole("button", { name: "Add Another Item" }).click()
  await expect(page.getByLabel("Lumber size")).toHaveCount(2)
  await expect(page.getByRole("button", { name: "Remove lumber item 2" })).toBeEnabled()
  await expect(page.getByLabel("Lumber size").first().locator("option")).toHaveCount(7)
  await expect(page.getByLabel("Length").first().locator("option")).toHaveCount(5)
  await expect(page.getByText("Upload blueprint or shopping list", { exact: true })).toHaveCount(0)

  const widths = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }))
  expect(widths.scrollWidth).toBe(widths.clientWidth)
})

test("flooring review identifies the first required missing answer", async ({ page }) => {
  await page.goto("/shop/wood-floor")

  const review = (page.viewportSize()?.width ?? 0) >= 1024
    ? page.getByTestId("flooring-order-summary").getByRole("button", { name: "Review Request" })
    : page.getByTestId("flooring-mobile-summary").getByRole("button", { name: "Review" })
  await review.click()

  await expect(page.getByText("Please answer: What wood species do you need?")).toBeVisible()
  await expect(page.locator('[data-question-key="wood_type"]').getByText("This field is required.")).toBeVisible()
})

test("shop shows the sourcing brands without duplicate contact actions", async ({ page }) => {
  await page.goto("/shop")

  await expect(page.getByRole("heading", { name: "Shop Our Brands" })).toBeVisible()
  await expect(page.getByTestId("shop-brand-grid").getByRole("img")).toHaveCount(8)
  const brandCellBorders = await page.getByTestId("shop-brand-grid").locator(":scope > div").evaluateAll((cells) => cells.map((cell) => getComputedStyle(cell).borderWidth))
  expect(brandCellBorders.every((border) => border === "0px")).toBe(true)
  await expect(page.getByText("Brand availability varies.")).toHaveCount(0)
  await expect(page.getByRole("link", { name: "WhatsApp us" })).toHaveCount(1)
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
