import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { firstListedPrice } from "../lib/catalog-price";

const root = process.cwd();

test("Locate Cheap Item is manager-only and uses live sourced research", async () => {
  const [tools, page, component] = await Promise.all([
    readFile(path.join(root, "app/admin/ai-tools/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/locate-cheap-item/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/locate-cheap-item-preview.tsx"), "utf8"),
  ]);

  expect(tools).toContain('href: "/admin/ai-tools/locate-cheap-item"');
  expect(tools).toContain('badge: "Live beta"');
  expect(page).toContain("requireManagerPortalProfile");
  expect(page).toContain("if (!access.aiTools) redirect");
  expect(component).toContain('fetch("/api/admin/catalog/exa-search"');
  expect(component).toContain("No sample prices are shown.");
  expect(component).toContain("No email or order is sent");
  expect(component).toContain("matchScore");
  expect(component).toContain('target="_blank"');
  expect(component).toContain("Verified public contacts");
  expect(component).toContain("Pricing request draft");
  expect(component).toContain("Nothing has been sent");
  expect(component).toContain("salesContacts");
  expect(component).toContain("callForPrice");
  expect(component).toContain("New house construction");
});

test("Locate Cheap Item validates and limits product research", async () => {
  const component = await readFile(path.join(root, "components/buildflow/locate-cheap-item-preview.tsx"), "utf8");
  expect(component).toContain('.slice(0, 5)');
  expect(component).toContain("Enter a complete public website address");
  expect(component).toContain("Enter a valid 5-digit ZIP code");
  expect(component).toContain("Prices can change; verify stock, package size, tax, and delivery before buying.");
});

test("Locate Cheap Item sorts a regular price before a higher result without using its bulk tier", () => {
  const enteredSupplier = firstListedPrice("$17.78 each; $15.11 at 26+");
  const otherSupplier = firstListedPrice("$18.77 each");

  expect(enteredSupplier).toBe(17.78);
  expect(otherSupplier).toBe(18.77);
  expect(enteredSupplier).toBeLessThan(otherSupplier);
});
