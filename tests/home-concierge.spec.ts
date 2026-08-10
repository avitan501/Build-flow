import { expect, test } from "@playwright/test";

test("home presents the concise construction concierge information", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Concierge service for every construction need." })).toBeVisible();
  await expect(page.getByText("Better pricing", { exact: true })).toBeVisible();
  await expect(page.getByText("Surplus savings", { exact: true })).toBeVisible();
  await expect(page.getByText("Specialty sourcing", { exact: true })).toBeVisible();
  await page.getByText("Better pricing", { exact: true }).click();
  await expect(page.getByText("Material prices change often.", { exact: false })).toBeVisible();
  await expect(page.getByText("Sourcing support for contractors, developers, design professionals, and property owners.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Covering 41 states." })).toBeVisible();
  await expect(page.getByTestId("coverage-map").getByTestId("coverage-dot")).toHaveCount(41);
  const lockups = page.getByTestId("avantia-build-lockup");
  await expect(lockups.first()).toHaveAttribute("data-testid", "avantia-build-lockup");
  await expect(lockups.locator("img")).toHaveCount(0);

  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflows).toBe(false);
});

test("customer menu omits the retired quote, order, and start-building links", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation menu" }).click();

  const navigation = page.getByRole("navigation", { name: "Mobile full navigation" });
  await expect(navigation.getByRole("link", { name: "Home", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Shop", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "My Projects", exact: true })).toBeVisible();
  const partnerQuote = navigation.getByRole("link", { name: "Request a Quote", exact: true });
  await expect(partnerQuote).toHaveAttribute("href", "/request-quote");
  await expect(partnerQuote).not.toHaveAttribute("target", "_blank");
  await expect(navigation.getByRole("link", { name: "Start Building", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Quotes", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Orders", exact: true })).toHaveCount(0);
});
