import { expect, test } from "@playwright/test";

test("home presents the contractor material coordination service", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Avantia Build | Materials Priced & Delivered");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Upload your list or choose materials. We compare suppliers and arrange jobsite delivery. No account needed.");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://build.avantiap.com/images/avantia/avantia-build-share-v3.jpg");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Get Materials Priced & Delivered | Avantia Build");
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "Avantia Build");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.getByRole("heading", { name: "You Build. We Handle the Materials." })).toBeVisible();
  await expect(page.getByText("Avantia Build for contractors", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Start a Material Request" })).toHaveAttribute("href", "/shop");
  await expect(page.getByRole("link", { name: "Send Us Your Plans" })).toHaveAttribute("href", "/request-quote");
  await expect(page.getByRole("link", { name: "Need help? WhatsApp us" })).toHaveAttribute("href", "https://wa.me/19292077156?text=Hi%20Avantia%20Build%2C%20I%20need%20help%20starting%20a%20material%20order.");
  await expect(page.getByText("No account needed", { exact: true })).toBeVisible();
  await expect(page.getByText("Reply within 24 hours", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose Materials" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "From plan to jobsite" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Upload", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Takeoff", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Compare", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Approve", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Deliver", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Framing", exact: true })).toHaveAttribute("href", "/shop/framing");
  await expect(page.getByRole("link", { name: "Electrical", exact: true })).toHaveAttribute("href", "/shop/electrical");
  await expect(page.getByRole("link", { name: "Flooring", exact: true })).toHaveAttribute("href", "/shop/wood-floor");
  await expect(page.getByText("Need materials or pricing?", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Your materials desk", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "One request. One coordinator. No supplier runaround." })).toHaveCount(0);
  await expect(page.getByText("Tell us what you need. We handle the rest.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Fewer calls. Better buying decisions. Every order in one place.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Serving 41 states." })).toBeVisible();
  const brands = page.getByRole("heading", { name: "Shop Our Brands" });
  await expect(brands).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause brand logos" })).toBeVisible();
  const brandSection = brands.locator("xpath=ancestor::section");
  expect(await brandSection.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  const brandBox = await brands.boundingBox();
  const heroBox = await page.getByRole("heading", { name: "You Build. We Handle the Materials." }).boundingBox();
  expect(brandBox?.y).toBeGreaterThan(heroBox?.y ?? Number.NEGATIVE_INFINITY);
  const departmentBox = await page.getByRole("heading", { name: "Choose Materials" }).boundingBox();
  expect(brandBox?.y).toBeLessThan(departmentBox?.y ?? Number.POSITIVE_INFINITY);
  await expect(page.getByTestId("coverage-map").getByTestId("coverage-dot")).toHaveCount(41);
  const lockups = page.getByTestId("avantia-build-lockup");
  await expect(lockups.first()).toHaveAttribute("data-testid", "avantia-build-lockup");
  await expect(lockups.first().locator("img")).toHaveAttribute("src", /avantia-build-rain-painter-animation\.gif/);
  await expect(page.getByTestId("site-header").getByRole("img", { name: "Avantia Build" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Avantia Build animated logo" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Mobile homepage" })).toHaveCount(0);

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
  await expect(page.getByRole("button", { name: "Open navigation menu" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("complementary", { name: "Site navigation" })).toBeVisible();
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
