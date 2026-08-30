import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

test("customer portal keeps a semantic, mobile-first information hierarchy", async () => {
  const pageSource = await readFile(
    path.join(root, "app/requests/page.tsx"),
    "utf8",
  );

  expect(pageSource).toContain("<main");
  expect(pageSource).toMatch(/<h1[^>]*>[^<]+<\/h1>/);
  expect(pageSource).toMatch(/<h2[^>]*>Material requests<\/h2>/);
  expect(pageSource).toContain("<article");
  expect(pageSource).toContain("<details");
  expect(pageSource).toContain("<summary");
  expect(pageSource).toContain('aria-label="Account quick actions"');
  expect(pageSource).toContain("aria-current={openedFromText");
  expect(pageSource).toContain("sm:grid-cols-3");
  expect(pageSource).not.toMatch(/<(?:div|span)[^>]+onClick=/);
  expect(pageSource).not.toContain("user-scalable=no");
  expect(pageSource).not.toContain("maximum-scale=1");
});

test("signed-out customer access stays one-tap, zoomable, and usable on a narrow phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/requests");

  await expect(
    page.getByRole("heading", { level: 1, name: "Open from your text" }),
  ).toBeVisible();
  await expect(page.locator("input")).toHaveCount(0);

  const accountLink = page.getByRole("link", {
    name: "Use an existing account instead",
  });
  await expect(accountLink).toBeVisible();
  expect((await accountLink.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);

  const viewport = page.locator('meta[name="viewport"]');
  const viewportContent = (await viewport.getAttribute("content")) ?? "";
  expect(viewportContent).not.toContain("user-scalable=no");
  expect(viewportContent).not.toContain("maximum-scale=1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth),
  );
});

test.fixme(
  "quote history supports selecting old products for a catalog, client quote, or comparison",
  async () => {
    const pageSource = await readFile(
      path.join(root, "app/requests/page.tsx"),
      "utf8",
    );

    expect(pageSource).toMatch(/Quote history/i);
    expect(pageSource).toMatch(/type=["']checkbox["']/);
    expect(pageSource).toMatch(/Add (?:selected )?(?:items|products) to (?:my )?catalog/i);
    expect(pageSource).toMatch(/Create (?:a )?client quote/i);
    expect(pageSource).toMatch(/Compare (?:selected )?(?:items|products|quotes)/i);
  },
);
