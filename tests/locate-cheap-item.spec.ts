import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const root = process.cwd();

test("Locate Cheap Item is manager-only, flagged, and visibly Coming Soon", async () => {
  const [tools, page, preview, flag] = await Promise.all([
    readFile(path.join(root, "app/admin/ai-tools/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/locate-cheap-item/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/locate-cheap-item-preview.tsx"), "utf8"),
    readFile(path.join(root, "lib/locate-cheap-item/feature.ts"), "utf8"),
  ]);

  expect(tools).toContain('href: "/admin/ai-tools/locate-cheap-item"');
  expect(tools).toContain('badge: "Coming Soon"');
  expect(page).toContain("requireManagerPortalProfile");
  expect(page).toContain("if (!access.aiTools) redirect");
  expect(page).toContain("locateCheapItemEnabled()");
  expect(flag).toContain('process.env.LOCATE_CHEAP_ITEM_ENABLED === "true"');
  expect(preview).toContain("No supplier email or order");
  expect(preview).toContain("office@build.avantiap.com only");
  expect(preview).toContain("No analysis action sends email or places an order.");
});

test("Locate Cheap Item shows the required three-step sourced review examples", async () => {
  const preview = await readFile(path.join(root, "components/buildflow/locate-cheap-item-preview.tsx"), "utf8");
  for (const label of ["Website", "Items & Prices", "Suppliers & Email", "Example category analysis", "Exact Match", "Comparable", "Verified contact example", "TEST — DO NOT PROCESS", "Safety and approval flow"]) {
    expect(preview).toContain(label);
  }
  expect(preview).toContain("no address guessed");
  expect(preview).toContain("Price + package verified");
  expect(preview).toContain("Different breaker compatibility; never treated as exact.");
});
