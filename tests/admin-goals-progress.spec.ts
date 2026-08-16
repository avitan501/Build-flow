import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const root = process.cwd();

test("owner manager navigation includes Goals & Progress", async () => {
  const shell = await readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8");

  expect(shell).toContain('{ href: "/admin/goals-progress", label: "Goals & Progress", icon: Target }');
  expect(shell).toContain("{access.owner ? (");
});

test("Goals & Progress protects the page and includes all four owner goals", async () => {
  const page = await readFile(path.join(root, "app/admin/goals-progress/page.tsx"), "utf8");

  expect(page).toContain("await requireAdminProfile()");
  expect(page).toContain("https://build-flow-wfl3-em41309w2-avitanneto-1804s-projects.vercel.app/shop");
  expect(page).toContain("Publish new website");
  expect(page).toContain("Build a client target list and collect feedback");
  expect(page).toContain("Call suppliers and find their cheapest items");
  expect(page).toContain("Launch “Beat Your Quote”");
  expect(page).toContain("<AddTargetClient />");
});

test("Beat Your Quote flyer is owner-only and has print and sharing controls", async () => {
  const flyer = await readFile(path.join(root, "app/admin/goals-progress/beat-your-quote-flyer/page.tsx"), "utf8");
  const actions = await readFile(path.join(root, "components/buildflow/campaign-flyer-actions.tsx"), "utf8");

  expect(flyer).toContain("await requireAdminProfile()");
  expect(flyer).toContain("Let us try to beat your material quote.");
  expect(actions).toContain("window.print()");
  expect(actions).toContain("https://wa.me/");
});
