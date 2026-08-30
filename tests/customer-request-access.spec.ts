import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

test("request access no longer exposes a broken phone-auth form", async ({ page }) => {
  await page.goto("/requests");
  await expect(page.getByRole("heading", { name: "Open from your text" })).toBeVisible();
  await expect(page.getByLabel("Phone number")).toHaveCount(0);
  await expect(page.getByText(/Phone login is not enabled/i)).toHaveCount(0);
  await page.getByRole("link", { name: "Use an existing account instead" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Frequests|\/login\?next=\/requests/);
});

test("menu login closes the drawer and navigates", async ({ page }) => {
  await page.goto("/shop");
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.getByLabel("Site navigation").getByRole("link", { name: "Account" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("request PDFs fail closed without an authenticated linked request", async ({ request }) => {
  const response = await request.get("/requests/638378/pdf");
  expect(response.status()).toBe(404);
});

test("opening a request link never starts a PDF download automatically", async ({ page }) => {
  const pdfRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/requests\/\d+\/pdf(?:\?|$)/.test(request.url())) pdfRequests.push(request.url());
  });

  await page.goto("/requests?request=638379&download=1");
  await expect(page.getByRole("heading", { name: "Open from your text" })).toBeVisible();
  expect(pdfRequests).toEqual([]);
});

test("secure text entry prioritizes the opened request instead of account dashboard chrome", async () => {
  const source = await readFile(path.join(root, "app/requests/page.tsx"), "utf8");
  expect(source).toContain("Opened securely from your text");
  expect(source).toContain("The request from your text is open below.");
  expect(source).toContain("!openedRequest ? <section");
  expect(source).toContain("Request <span className=\"font-mono text-cyan-200\"");
});
