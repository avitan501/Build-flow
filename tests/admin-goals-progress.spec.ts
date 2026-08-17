import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const root = process.cwd();

test("manager More menu includes Goals and Client Target for employees", async () => {
  const shell = await readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8");

  expect(shell).toContain('{ href: "/admin/goals-progress", label: "Goals & Progress", icon: Target }');
  expect(shell).toContain('{ href: "/admin/goals-progress/client-target", label: "Client Target", icon: Target }');
  expect(shell).toContain("const sharedMoreLinks");
  expect(shell).toContain("access.owner ? [...sharedMoreLinks, ...ownerMoreLinks] : [...sharedMoreLinks]");
  expect(shell.indexOf('label: "Client Target"')).toBeGreaterThan(shell.indexOf("const sharedMoreLinks"));
});

test("Goals & Progress allows manager employees while owner controls stay protected", async () => {
  const page = await readFile(path.join(root, "app/admin/goals-progress/page.tsx"), "utf8");

  expect(page).toContain("await requireManagerPortalProfile()");
  expect(page).toContain("async function OwnerAffiliateGoal()");
  expect(page).toContain("const { supabase } = await requireAdminProfile()");
  expect(page).toContain("https://build-flow-wfl3-em41309w2-avitanneto-1804s-projects.vercel.app/shop");
  expect(page).toContain("Publish new website");
  expect(page).toContain("Build a client target list and collect feedback");
  expect(page).toContain("Call suppliers and find their cheapest items");
  expect(page).toContain("Launch “Beat Your Quote”");
  expect(page).toContain("<AffiliateProgramTracker");
  expect(page).toContain("access.owner ? <OwnerAffiliateGoal />");
  expect(page).toContain('supabase.from("affiliate_programs")');
  expect(page).toContain("<AddTargetClient />");
  expect(page).toContain('href="/admin/goals-progress/client-target"');
});

test("Client Target conversation guide allows manager employees and is bilingual", async () => {
  const page = await readFile(path.join(root, "app/admin/goals-progress/client-target/page.tsx"), "utf8");

  expect(page).toContain("await requireManagerPortalProfile()");
  expect(page).toContain('href="/admin/goals-progress"');
  expect(page).toContain("Carlos&apos;s conversation guide");
  expect(page).toContain("Hi, this is Carlos");
  expect(page).toContain("Hola, soy Carlos");
  expect(page).toContain("English");
  expect(page).toContain("Español");
});

test("affiliate tracker is persistent, owner-only, filterable, and setup-gated", async () => {
  const component = await readFile(path.join(root, "components/buildflow/affiliate-program-tracker.tsx"), "utf8");
  const actions = await readFile(path.join(root, "app/admin/goals-progress/affiliate-actions.ts"), "utf8");
  const migration = await readFile(path.join(root, "supabase/migrations/20260816193932_create_affiliate_program_tracker.sql"), "utf8");

  expect(component).toContain("Supplier Affiliate Program");
  expect(component).toContain("Search supplier");
  expect(component).toContain("Lowe’s Developer/API Onboarding");
  expect(component).toContain("Start application opens the official program in a new tab");
  expect(component).toContain("Setup checklist");
  expect(actions).toContain("await requireAdminProfile()");
  expect(actions).toContain("Complete every setup checklist item");
  expect(migration).toContain("prevent_incomplete_affiliate_setup");
  expect(migration).toContain("affiliate_confirmation_owner_insert");
  expect((migration.match(/'Not Started'\)/g) ?? []).length).toBe(39);
  expect((migration.match(/'In Progress'\)/g) ?? []).length).toBeGreaterThanOrEqual(1);
  expect(migration).toContain("'Lowe''s Creator','A'");
  expect(migration).toContain("'Developer/API Integration','In Progress'");
});

test("Beat Your Quote flyer is owner-only and has print and sharing controls", async () => {
  const flyer = await readFile(path.join(root, "app/admin/goals-progress/beat-your-quote-flyer/page.tsx"), "utf8");
  const actions = await readFile(path.join(root, "components/buildflow/campaign-flyer-actions.tsx"), "utf8");

  expect(flyer).toContain("await requireAdminProfile()");
  expect(flyer).toContain("Let us try to beat your material quote.");
  expect(actions).toContain("window.print()");
  expect(actions).toContain("https://wa.me/");
});
