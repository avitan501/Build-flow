import { expect, test } from "@playwright/test";

test("drywall calculator loads on desktop and mobile", async ({ page }) => {
  await page.goto("/shop/sheet-rock/drywall-calculator");

  const body = page.locator("body");
  await expect(body).toContainText(/drywall/i);
  await expect(body).toContainText(/blueprint|plan|calculator/i);

  const bodyText = await body.innerText();
  expect(bodyText).not.toContain("This page couldn't load");
});
