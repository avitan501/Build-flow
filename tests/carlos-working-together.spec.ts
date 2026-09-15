import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import ts from "typescript";

// Use the actual React JSX runtime, not Playwright's component-test JSX transform.
const file = resolve("components/buildflow/carlos-working-together.tsx");
const compiled = ts.transpileModule(readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
}).outputText;
const componentExports = { exports: {} };
new Function("module", "exports", "require", compiled)(componentExports, componentExports.exports, createRequire(file));
const { CarlosWorkingTogether } = componentExports.exports as { CarlosWorkingTogether: () => ReturnType<typeof createElement> };

test("work guide is on the time-log page without changing payroll permissions", () => {
  const page = readFileSync("app/admin/daily-summary/page.tsx", "utf8");
  expect(page).toContain("<CarlosWorkingTogether />");
  expect(page).toContain('canRequest={email==="buildavantiap@gmail.com"}');
  expect(page).toContain('canMarkPaid={email==="avitanneto@gmail.com"}');
  const component = readFileSync("components/buildflow/carlos-working-together.tsx", "utf8");
  expect(component).not.toContain("use client");
  expect(component).not.toContain("onClick");
  expect(component).not.toContain("<form");
});

for (const width of [390, 1440]) test(`all 13 friendly rules readable with keyboard at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1"><main style="max-width:1024px;margin:auto;padding:16px">${renderToStaticMarkup(createElement(CarlosWorkingTogether))}</main>`);
  for (const file of readdirSync(".next/static/css").filter(file => file.endsWith(".css"))) {
    await page.addStyleTag({ content: readFileSync(`.next/static/css/${file}`, "utf8") });
  }
  await expect(page.locator("summary")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your workday", exact: true })).not.toBeVisible();
  await page.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Your workday", exact: true })).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(13);
  const guide = page.locator("#working-together");
  for (const text of ["9:00 AM–2:30 PM, New York time", "30-minute break", "only when David asks", "every two weeks", "Done or Blocked", "five minutes", "WhatsApp, email, text, or phone", "before submitting or sending any quote", "before contacting a supplier he introduced"]) {
    await expect(guide).toContainText(text);
  }
  await expect(page.getByRole("button")).toHaveCount(0);
  expect(await page.evaluate(() => innerWidth)).toBe(width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `/tmp/carlos-working-together-${width}.png`, fullPage: true });
  await page.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Your workday", exact: true })).not.toBeVisible();
});
