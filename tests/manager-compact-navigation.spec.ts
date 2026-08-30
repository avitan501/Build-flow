import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { managerNavigationDefaultCollapsed } from "../components/buildflow/admin-shell";

const root = process.cwd();

test("small laptops start with the manager rail collapsed unless the user chose otherwise", () => {
  expect(managerNavigationDefaultCollapsed({ savedPreference: null, smallLaptop: true })).toBe(true);
  expect(managerNavigationDefaultCollapsed({ savedPreference: null, smallLaptop: false })).toBe(false);
  expect(managerNavigationDefaultCollapsed({ savedPreference: "expanded", smallLaptop: true })).toBe(false);
  expect(managerNavigationDefaultCollapsed({ savedPreference: "collapsed", smallLaptop: false })).toBe(true);
});

test("manager navigation exposes six short permission-scoped areas without changing their routes", async () => {
  const shell = await readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8");

  for (const label of ["Manager", "Customers", "Catalog", "Documents", "Communication", "AI"]) {
    expect(shell).toContain(`shortLabel: "${label}"`);
  }
  for (const route of ["/admin/build-map", "/admin/users", "/admin/catalog", "/admin/documents", "/admin/communications", "/admin/ai-tools"]) {
    expect(shell).toContain(`href: "${route}"`);
  }
  expect(shell).toContain("access.customers");
  expect(shell).toContain("access.suppliers");
  expect(shell).toContain("access.communications");
  expect(shell).toContain("access.aiTools");
});

test("collapsed manager rail remembers preference and provides keyboard-readable tooltips", async () => {
  const shell = await readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8");

  expect(shell).toContain("window.localStorage.getItem(MANAGER_NAV_STORAGE_KEY)");
  expect(shell).toContain("window.localStorage.setItem(MANAGER_NAV_STORAGE_KEY");
  expect(shell).toContain("MANAGER_NAV_SMALL_LAPTOP_QUERY");
  expect(shell).toContain('role="tooltip"');
  expect(shell).toContain("group-focus-visible:block");
  expect(shell).toContain("aria-describedby");
  expect(shell).toContain('aria-label="Expand manager navigation"');
  expect(shell).toContain('aria-label="Collapse manager navigation"');
  expect(shell).toContain("lg:grid-cols-[4.5rem_minmax(0,1fr)]");
  expect(shell).toContain("lg:grid-cols-[13rem_minmax(0,1fr)]");
});
