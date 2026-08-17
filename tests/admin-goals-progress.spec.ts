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
  expect(page).toContain("Fix Website");
  expect(page).toContain("<WebsiteFixNotes");
  expect(page).toContain("Client Target");
  expect(page).toContain("<AddOutreachLead />");
  expect(page).toContain("<OutreachLeadList");
  expect(page).toContain("Clients in the system");
  expect(page).toContain("Call suppliers and find what they sell cheaper than anyone else");
  expect(page).toContain("Launch campaign: Beat Your Quote");
  expect(page).toContain('PersonHeader assignee="david"');
  expect(page).toContain('PersonHeader assignee="carlos"');
  expect(page).toContain("<AffiliateProgramTracker");
  expect(page).toContain("access.owner ? <OwnerAffiliateGoal />");
  expect(page).toContain('supabase.from("affiliate_programs")');
  expect(page).toContain("<AddTargetClient />");
  expect(page).toContain('href="/admin/goals-progress/client-target"');
  expect(page).toContain('supabase.from("manager_goals")');
  expect(page).toContain("<AddManagerGoal");
  expect(page.indexOf('PersonHeader assignee="carlos"')).toBeLessThan(page.indexOf('PersonHeader assignee="david"'));
});

test("manager goals are persistent and protected for manager users", async () => {
  const [component, actions, migration] = await Promise.all([
    readFile(path.join(root, "components/buildflow/manager-goals.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/goals-progress/goal-actions.ts"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260817140952_create_manager_goals.sql"), "utf8"),
  ]);

  expect(component).toContain("Add a goal");
  expect(component).toContain("setManagerGoalCompletedAction");
  expect(component).toContain("deleteManagerGoalAction");
  expect(actions.match(/requireManagerPortalProfile\(\)/g)?.length).toBe(4);
  expect(migration).toContain("create table if not exists public.manager_goals");
  expect(migration).toContain("alter table public.manager_goals enable row level security");
  expect(migration).toContain("role in ('admin', 'staff')");
  expect(migration).toContain("approval_status = 'approved'");
  expect(migration).toContain("created_by = (select auth.uid())");
});

test("outreach leads remain separate from clients and are protected for customer staff", async () => {
  const [page, component, actions, userActions, migration, indexMigration, ownerPolicyMigration] = await Promise.all([
    readFile(path.join(root, "app/admin/goals-progress/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/client-target-outreach.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/goals-progress/lead-actions.ts"), "utf8"),
    readFile(path.join(root, "app/admin/users/actions.ts"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260817175631_manager_outreach_leads.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260817180209_index_manager_tracking_creators.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260817183000_allow_owner_manage_outreach_leads.sql"), "utf8"),
  ]);

  expect(page).toContain('supabase.from("manager_outreach_leads")');
  expect(component).toContain("Add an outreach lead");
  expect(component).toContain("A lead stays separate from active clients and orders.");
  expect(actions.match(/requireStaffProfile\("customers"\)/g)?.length).toBe(3);
  expect(userActions).toContain('createTargetClientAction(input: ManagerNewClientInput)');
  expect(userActions).toContain('requireStaffProfile("customers")');
  expect(migration).toContain("create table if not exists public.manager_outreach_leads");
  expect(migration).toContain("alter table public.manager_outreach_leads enable row level security");
  expect(migration).toContain("role in ('admin', 'staff')");
  expect(migration).toContain("created_by = (select auth.uid())");
  expect(indexMigration).toContain("manager_outreach_leads_created_by_idx");
  expect(ownerPolicyMigration).toContain("manager_outreach_leads_manager_insert");
  expect(ownerPolicyMigration).toContain("avitanneto@gmail.com");
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
