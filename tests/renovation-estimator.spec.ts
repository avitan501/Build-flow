import { expect, test } from "@playwright/test";

test("guest can build a multi-unit material renovation estimate", async ({ page }) => {
  await page.goto("/ai/renovation-estimator");
  await expect(page.getByTestId("renovation-estimator")).toHaveAttribute("data-ready", "true");

  await expect(page.getByRole("heading", { name: "What will this apartment renovation need?" })).toBeVisible();
  await expect(page.getByText("No login", { exact: true })).toBeVisible();

  await page.getByLabel("Square feet for 1 Bedroom").fill("700");
  await page.getByLabel("Unit count for 1 Bedroom").fill("10");
  await page.getByLabel("Project state").selectOption("NY");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("button", { name: /Flooring/ }).click();
  await page.getByRole("button", { name: /Bathrooms/ }).click();
  await page.getByRole("button", { name: /Paint/ }).click();
  await expect(page.getByLabel("Bathrooms per apartment")).toBeVisible();
  await page.getByLabel("Bathrooms per apartment").fill("1");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("button", { name: /Class C/ }).click();
  await page.getByRole("button", { name: /Middle/ }).click();
  await page.getByRole("button", { name: "Build estimate" }).click();

  const results = page.getByTestId("renovation-estimate-results");
  await expect(results.getByRole("heading", { name: "Your apartment renovation estimate" })).toBeVisible();
  await expect(results.getByTestId("renovation-category-flooring")).toContainText("Flooring");
  await expect(results.getByTestId("renovation-category-bathrooms")).toContainText("Bathrooms");
  await expect(results.getByTestId("renovation-category-paint")).toContainText("Paint");
  await expect(results.getByText("Luxury vinyl plank flooring", { exact: true })).toBeHidden();

  await results.getByTestId("renovation-category-flooring").locator("summary").click();
  await expect(results.getByText("Luxury vinyl plank flooring", { exact: true })).toBeVisible();
  await results.getByTestId("renovation-category-bathrooms").locator("summary").click();
  await expect(results.getByText("Bathroom floor tile", { exact: true })).toBeVisible();
  await results.getByTestId("renovation-category-paint").locator("summary").click();
  await expect(results.getByText("Interior wall paint", { exact: true })).toBeVisible();
  await expect(results.getByText("10 units · 700 sq. ft. each · New York · Class C", { exact: true })).toBeVisible();
  await expect(results.getByText("Planning estimate only.", { exact: true })).toBeVisible();

  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflows).toBe(false);
});

test("estimator validates required scope before continuing", async ({ page }) => {
  await page.goto("/ai/renovation-estimator");
  await expect(page.getByTestId("renovation-estimator")).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Select at least one renovation scope.", { exact: true })).toBeVisible();
});

test("estimator combines separate apartment types into one portfolio", async ({ page }) => {
  await page.goto("/ai/renovation-estimator");
  await expect(page.getByTestId("renovation-estimator")).toHaveAttribute("data-ready", "true");

  await page.getByLabel("Unit count for 1 Bedroom").fill("6");
  await expect(page.getByText("6 total", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add unit type" }).click();
  await page.getByLabel("Unit count for Studio").fill("4");
  await expect(page.getByText("10 total", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add unit type" }).click();
  await page.getByLabel("Unit count for 2 Bedroom").fill("2");
  await page.getByLabel("Project state").selectOption("NY");
  await expect(page.getByText("12 total", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("button", { name: /Flooring/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Class C/ }).click();
  await page.getByRole("button", { name: /Middle/ }).click();
  await page.getByRole("button", { name: "Build estimate" }).click();

  const results = page.getByTestId("renovation-estimate-results");
  await expect(results.getByText("12 units · 3 apartment types · New York · Class C", { exact: true })).toBeVisible();
  await expect(results.getByText("6 1 BR · 700 sq. ft.", { exact: true })).toBeVisible();
  await expect(results.getByText("4 Studio · 500 sq. ft.", { exact: true })).toBeVisible();
  await expect(results.getByText("2 2 BR · 1,000 sq. ft.", { exact: true })).toBeVisible();

  const flooring = results.getByTestId("renovation-category-flooring");
  await flooring.locator("summary").click();
  await expect(flooring.getByText("8,280 sq ft × $2.75", { exact: true })).toBeVisible();
});
