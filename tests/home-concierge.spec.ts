import { expect, test } from "@playwright/test";

test("home presents the contractor material coordination service", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Avantia Build | You Build. We Handle the Materials.");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Send your plans or material list. We compare suppliers, organize the order, and arrange jobsite delivery.");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/opengraph-image\?/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Avantia Build | Materials Priced & Delivered");
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "Avantia Build");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.getByRole("heading", { name: "You Build. We Handle the Materials." })).toBeVisible();
  await expect(page.getByText("Avantia Build for contractors", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Start a Material Request", exact: true })).toHaveAttribute("href", "/shop");
  await expect(page.getByRole("link", { name: "Send Us Your Plans" })).toHaveAttribute("href", "/request-quote");
  await expect(page.getByRole("link", { name: /Watch the demo/ })).toHaveAttribute("href", "#product-demo");
  await expect(page.getByRole("heading", { name: "Estimate apartment renovation materials in a few questions." })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Need help? WhatsApp us" })).toHaveAttribute("href", "https://wa.me/15169088319?text=Hi%20Avantia%20Build%2C%20I%20need%20help%20starting%20a%20material%20order.");
  await expect(page.getByText("No account needed", { exact: true })).toBeVisible();
  await expect(page.getByText("Reply within 24 hours", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose Materials" })).toBeVisible();
  const demo = page.getByTestId("homepage-demo");
  const video = demo.locator("video");
  await expect(demo).toBeVisible();
  await expect(video).toHaveAttribute("poster", "/videos/avantia-materials-demo-phone-poster.png");
  await expect(video.locator('source[type="video/mp4"]')).toHaveAttribute("src", "/videos/avantia-materials-demo-phone.mp4");
  await expect(video.locator('source[type="video/webm"]')).toHaveAttribute("src", "/videos/avantia-materials-demo-phone.webm");
  await expect(video.locator('track[kind="captions"]')).toHaveAttribute("src", "/videos/avantia-materials-demo-phone.vtt");
  const customDemo = page.getByTestId("homepage-custom-demo");
  const customVideo = customDemo.locator("video");
  await expect(customDemo).toBeVisible();
  await expect(customVideo).toHaveAttribute("poster", "/videos/avantia-custom-request-demo-poster.png");
  await expect(customVideo.locator('source[type="video/mp4"]')).toHaveAttribute("src", "/videos/avantia-custom-request-demo.mp4");
  await expect(customVideo.locator('source[type="video/webm"]')).toHaveAttribute("src", "/videos/avantia-custom-request-demo.webm");
  await expect(customVideo.locator('track[kind="captions"]')).toHaveAttribute("src", "/videos/avantia-custom-request-demo.vtt");
  await expect(page.getByRole("link", { name: "Request a custom item" })).toHaveAttribute("href", "/request-quote");
  const builderStory = page.getByTestId("homepage-builder-story");
  const builderVideo = builderStory.locator("video");
  await expect(builderStory).toBeVisible();
  await expect(builderVideo).toHaveAttribute("poster", "/videos/avantia-builder-story-poster.png");
  await expect(builderVideo.locator('source[type="video/mp4"]')).toHaveAttribute("src", "/videos/avantia-builder-story.mp4");
  await expect(builderVideo.locator('source[type="video/webm"]')).toHaveAttribute("src", "/videos/avantia-builder-story.webm");
  await expect(builderVideo.locator('track[kind="captions"]')).toHaveAttribute("src", "/videos/avantia-builder-story.vtt");
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
  const demoBox = await demo.boundingBox();
  const coverageBox = await page.getByTestId("coverage-scroll-card").boundingBox();
  expect(demoBox?.y).toBeGreaterThan(departmentBox?.y ?? Number.NEGATIVE_INFINITY);
  expect(demoBox?.y).toBeLessThan(coverageBox?.y ?? Number.POSITIVE_INFINITY);
  await expect(page.getByTestId("coverage-map").getByTestId("coverage-dot")).toHaveCount(41);
  const lockups = page.getByTestId("avantia-build-lockup");
  await expect(lockups.first()).toHaveAttribute("data-testid", "avantia-build-lockup");
  await expect(lockups.first().locator("img")).toHaveAttribute("src", /avantia-build-lockup-animated\.webp/);
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

test("coverage card grows as it enters focus", async ({ page }) => {
  await page.goto("/");
  const card = page.getByTestId("coverage-scroll-card");
  await expect(card).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  const before = await card.evaluate((element) => Number(getComputedStyle(element).getPropertyValue("--coverage-scale")));

  await card.scrollIntoViewIfNeeded();
  await page.waitForFunction(
    ({ testId, initialScale }) => {
      const element = document.querySelector(`[data-testid="${testId}"]`);
      return element && Number(getComputedStyle(element).getPropertyValue("--coverage-scale")) > initialScale;
    },
    { testId: "coverage-scroll-card", initialScale: before },
  );
  const focused = await card.evaluate((element) => Number(getComputedStyle(element).getPropertyValue("--coverage-scale")));

  expect(focused).toBeGreaterThan(before);
  expect(focused).toBeLessThanOrEqual(1);
});

test("customer menu keeps four primary actions and puts Renovation AI under More", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation menu" }).click();

  const navigation = page.getByRole("navigation", { name: "Mobile full navigation" });
  await expect(page.getByRole("button", { name: "Open navigation menu" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("complementary", { name: "Site navigation" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Home", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Order Materials", exact: true })).toBeVisible();
  const partnerQuote = navigation.getByRole("link", { name: "Get Material Pricing", exact: true });
  await expect(partnerQuote).toHaveAttribute("href", "/request-quote");
  await expect(partnerQuote).not.toHaveAttribute("target", "_blank");
  await expect(navigation.getByRole("link", { name: "Beat a Supplier Quote", exact: true })).toHaveAttribute("href", "/beat-a-quote");
  await expect(navigation.getByRole("link", { name: "My Projects", exact: true })).toHaveCount(0);
  await page.getByRole("complementary", { name: "Site navigation" }).getByText("More", { exact: true }).click();
  await expect(page.getByRole("navigation", { name: "More navigation" }).getByRole("link", { name: /Renovation AI/ })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Start Building", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Quotes", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Orders", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Log in", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Create account", exact: true })).toHaveCount(0);
});
