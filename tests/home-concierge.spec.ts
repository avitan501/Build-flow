import { expect, test } from "@playwright/test";

test("home presents the contractor material coordination service", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Avantia Build | Construction Material Ordering");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Order construction materials, upload plans, compare supplier pricing, and coordinate deliveries—all in one place.");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://build.avantiap.com/images/avantia/avantia-app-icon-512.png?v=2");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Avantia Build | Construction Material Ordering");
  await expect(page.getByRole("heading", { name: "Keep Your Crew Building. We’ll Handle the Materials." })).toBeVisible();
  await expect(page.getByText("Avantia Build for contractors", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Start a Material Order" })).toHaveAttribute("href", "/shop");
  await expect(page.getByRole("link", { name: "Message a Materials Coordinator" })).toHaveAttribute("href", "https://wa.me/19292077156?text=Hi%20Avantia%20Build%2C%20I%20want%20to%20start%20a%20material%20order.");
  await expect(page.getByText("Send One List", { exact: true })).toBeVisible();
  await expect(page.getByText("We handle supplier calls, availability, substitutions, and follow-up.", { exact: true })).toBeVisible();
  await expect(page.getByText("Compare Before You Buy", { exact: true })).toBeVisible();
  await expect(page.getByText("Keep Every Project Organized", { exact: true })).toBeVisible();
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
  const heroBox = await page.getByRole("heading", { name: "Keep Your Crew Building. We’ll Handle the Materials." }).boundingBox();
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
  await expect(navigation.getByRole("link", { name: "Let's Work", exact: true })).toBeVisible();
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
