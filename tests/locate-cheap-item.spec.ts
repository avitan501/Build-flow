import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

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
});

test("Locate Cheap Item validates and limits product research", async () => {
  const component = await readFile(path.join(root, "components/buildflow/locate-cheap-item-preview.tsx"), "utf8");
  expect(component).toContain('.slice(0, 5)');
  expect(component).toContain("Enter a complete public website address");
  expect(component).toContain("Enter a valid 5-digit ZIP code");
  expect(component).toContain("Prices can change; verify stock, package size, tax, and delivery before buying.");
});
