import { expect, test } from "@playwright/test";

test("home presents the contractor material coordination service", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Avantia Build | Construction Material Ordering");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Order construction materials, upload plans, compare supplier pricing, and coordinate deliveries—all in one place.");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://build.avantiap.com/images/avantia/avantia-app-icon-512.png?v=2");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Avantia Build | Construction Material Ordering");
  await expect(page.getByRole("heading", { name: "Construction Materials, Priced and Organized for You." })).toBeVisible();
  await expect(page.getByText("Avantia Build for contractors", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Choose a Department" })).toHaveAttribute("href", "/shop");
  await expect(page.getByRole("link", { name: "Upload a List or Blueprint" })).toHaveAttribute("href", "/request-quote");
  await expect(page.getByRole("link", { name: "Need help? Message a coordinator" })).toHaveAttribute("href", "https://wa.me/19292077156?text=Hi%20Avantia%20Build%2C%20I%20need%20help%20starting%20a%20material%20order.");
  await expect(page.getByRole("heading", { name: "One request. Three simple steps." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose a Department", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Add Details or Upload", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "We Handle the Rest", exact: true })).toBeVisible();
  await expect(page.getByText("Need materials or pricing?", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Your materials desk", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "One request. One coordinator. No supplier runaround." })).toHaveCount(0);
  await expect(page.getByText("Tell us what you need. We handle the rest.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Fewer calls. Better buying decisions. Every order in one place.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Covering 41 states." })).toBeVisible();
  const brands = page.getByRole("heading", { name: "Shop Our Brands" });
  await expect(brands).toBeVisible();
  const brandSection = brands.locator("xpath=ancestor::section");
  expect(await brandSection.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  const brandBox = await brands.boundingBox();
  const heroBox = await page.getByRole("heading", { name: "Construction Materials, Priced and Organized for You." }).boundingBox();
  expect(brandBox?.y).toBeGreaterThan(heroBox?.y ?? Number.NEGATIVE_INFINITY);
  await expect(page.getByTestId("coverage-map").getByTestId("coverage-dot")).toHaveCount(41);
  const lockups = page.getByTestId("avantia-build-lockup");
  await expect(lockups.first()).toHaveAttribute("data-testid", "avantia-build-lockup");
  await expect(lockups.first().locator("img")).toHaveAttribute("src", /avantia-build-rain-painter-animation\.gif/);
  await expect(page.getByRole("img", { name: "Avantia Build animated logo" })).toHaveCount(0);

  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflows).toBe(false);

  if (test.info().project.name === "chromium-desktop") {
    const mainBox = await page.locator("main").first().boundingBox();
    expect(mainBox?.width).toBeGreaterThan(1300);
    const islandWidths = await page.getByTestId("homepage-island").evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().width));
    expect(Math.max(...islandWidths) - Math.min(...islandWidths)).toBeLessThan(2);
  }
});

test("customer menu groups requests and omits retired order and start-building links", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation menu" }).click();

  const navigation = page.getByRole("navigation", { name: "Mobile full navigation" });
  await expect(navigation.getByRole("link", { name: "Home", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Order Materials", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "My Projects", exact: true })).toBeVisible();
  const requestNavigation = page.getByRole("navigation", { name: "Request navigation" });
  const partnerQuote = requestNavigation.getByRole("link", { name: "Get Material Pricing", exact: true });
  await expect(partnerQuote).toHaveAttribute("href", "/request-quote");
  await expect(partnerQuote).not.toHaveAttribute("target", "_blank");
  await expect(requestNavigation.getByRole("link", { name: "Beat a Supplier Quote", exact: true })).toHaveAttribute("href", "/beat-a-quote");
  await expect(navigation.getByRole("link", { name: "Start Building", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Quotes", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Orders", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Log in", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Create account", exact: true })).toHaveCount(0);
});
