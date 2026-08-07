import { expect, test } from "@playwright/test";

test("home presents the concise construction concierge information", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Concierge service for every construction need." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Market pricing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Closeout savings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hard-to-find items" })).toBeVisible();
  await expect(page.getByText("Working with designers, developers, and builders.")).toBeVisible();
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
  await expect(navigation.getByRole("link", { name: "Start Building", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Quotes", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Orders", exact: true })).toHaveCount(0);
});
