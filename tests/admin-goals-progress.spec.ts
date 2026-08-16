import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const root = process.cwd();

test("owner manager navigation includes Goals & Progress", async () => {
  const shell = await readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8");

  expect(shell).toContain('{ href: "/admin/goals-progress", label: "Goals & Progress", icon: Target }');
  expect(shell).toContain("{access.owner ? (");
});

test("Goals & Progress protects the page and links the approved Shop preview", async () => {
  const page = await readFile(path.join(root, "app/admin/goals-progress/page.tsx"), "utf8");

  expect(page).toContain("await requireAdminProfile()");
  expect(page).toContain("https://build-flow-wfl3-em41309w2-avitanneto-1804s-projects.vercel.app/shop");
  expect(page).toContain("Open Shop preview");
});
