import { expect, test } from "@playwright/test";

test("home presents the contractor material coordination service", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Keep Your Crew Building. We’ll Handle the Materials." })).toBeVisible();
  await expect(page.getByText("Avantia Build for contractors", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start my material request" })).toHaveAttribute("href", "/shop");
  await expect(page.getByRole("link", { name: "Call a materials coordinator" })).toHaveAttribute("href", "tel:+19292077156");
  await expect(page.getByText("Stop calling store after store", { exact: true })).toBeVisible();
  await expect(page.getByText("Compare before you buy", { exact: true })).toBeVisible();
  await expect(page.getByText("Keep every order organized", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "One request. One coordinator. No supplier runaround." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Covering 41 states." })).toBeVisible();
  const brands = page.getByRole("heading", { name: "Shop Our Brands" });
  await expect(brands).toBeVisible();
  const brandSection = brands.locator("xpath=ancestor::section");
  expect(await brandSection.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  const brandBox = await brands.boundingBox();
  const materialsDeskBox = await page.getByText("Your materials desk", { exact: true }).boundingBox();
  expect(brandBox?.y).toBeLessThan(materialsDeskBox?.y ?? Number.POSITIVE_INFINITY);
  await expect(page.getByTestId("coverage-map").getByTestId("coverage-dot")).toHaveCount(41);
  const lockups = page.getByTestId("avantia-build-lockup");
  await expect(lockups.first()).toHaveAttribute("data-testid", "avantia-build-lockup");
  await expect(lockups.locator("img")).toHaveCount(0);

  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflows).toBe(false);

  if (test.info().project.name === "chromium-desktop") {
    const mainBox = await page.locator("main").first().boundingBox();
    expect(mainBox?.width).toBeGreaterThan(1300);
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
  const partnerQuote = requestNavigation.getByRole("link", { name: "Request a Quote", exact: true });
  await expect(partnerQuote).toHaveAttribute("href", "/request-quote");
  await expect(partnerQuote).not.toHaveAttribute("target", "_blank");
  await expect(requestNavigation.getByRole("link", { name: "Beat a Quote", exact: true })).toHaveAttribute("href", "/beat-a-quote");
  await expect(navigation.getByRole("link", { name: "Start Building", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Quotes", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Orders", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Log in", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Create account", exact: true })).toHaveCount(0);
});
