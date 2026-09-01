import { expect, test } from "@playwright/test";

test("five homepage concepts each use a distinct film and fit the viewport", async ({ page }) => {
  await page.goto("/homepage-preview");
  const sources = new Set<string>();

  for (let concept = 1; concept <= 5; concept += 1) {
    await page.getByRole("button", { name: `View homepage concept ${concept}` }).click();
    const video = page.locator("video");
    await expect(video).toBeVisible();
    const source = await video.getAttribute("src");
    expect(source).toBeTruthy();
    sources.add(source ?? "");
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  }

  expect(sources.size).toBe(5);
});
