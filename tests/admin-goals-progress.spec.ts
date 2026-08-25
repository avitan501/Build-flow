import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const root = process.cwd();

test("Goals and Client Target stay in the dashboard instead of manager navigation", async () => {
  const shell = await readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8");

  expect(shell).not.toContain('{ href: "/admin/goals-progress", label: "Goals & Progress"');
  expect(shell).not.toContain('{ href: "/admin/goals-progress/client-target", label: "Client Target", icon: Target }');
  expect(shell).toContain("function navigationLinks(access: ManagerAccess)");
  expect(shell).not.toContain("sharedMoreLinks");
  expect(shell).not.toContain('label: "Directories & Catalog"');
  expect(shell).not.toContain('label: "Supplier Pricing"');
  expect(shell).toContain("Customer Website");
  expect(shell).toContain("Quick Access");
  expect(shell).not.toContain('label: "Tasks"');
  expect(shell).not.toContain('label: "Quotes & Orders"');
  expect(shell).not.toContain('label: "Tasks & Daily Summary"');
});

test("Goals & Progress allows manager employees while owner controls stay protected", async () => {
  const [page, actions, dashboard] = await Promise.all([
    readFile(path.join(root, "app/admin/goals-progress/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/goals-progress/goal-actions.ts"), "utf8"),
    readFile(path.join(root, "app/admin/build-map/page.tsx"), "utf8"),
  ]);

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
  expect(page).toContain("ABC Supply Demo");
  expect(page).toContain('href="/admin/abc"');
  expect(page).toContain('PersonHeader assignee="david"');
  expect(page).toContain('PersonHeader assignee="carlos"');
  expect(page).toContain("<AffiliateProgramTracker");
  expect(page).toContain("access.owner ? <OwnerAffiliateGoal />");
  expect(page).toContain('supabase.from("affiliate_programs")');
  expect(page).toContain("<AddTargetClient />");
  expect(page).toContain("<ClientTargetCallGuide />");
  expect(page).toContain('title="Supplier Affiliate Program"');
  expect(page).toContain("<GoalDisclosure number={3}");
  expect(page).toContain('supabase.from("manager_goals")');
  expect(page).toContain("<AddManagerGoal");
  expect(page.indexOf('PersonHeader assignee="carlos"')).toBeLessThan(page.indexOf('PersonHeader assignee="david"'));
  expect(page).toContain('if (!access.owner) goalsQuery = goalsQuery.eq("assignee", "carlos")');
  expect(page).toContain('access.owner ? <section aria-labelledby="david-goals-title"');
  expect(dashboard).toContain('if (!access.owner) goalsQuery = goalsQuery.eq("assignee", "carlos")');
  expect(dashboard).toContain('access.owner ? <GoalDisclosure assignee="david" priorityCount={3}');
  expect(dashboard).toContain('title="ABC Supply Demo"');
  expect(actions).toContain('if (!access.owner && assignee !== "carlos")');
  expect(actions.match(/if \(!access\.owner\).*\.eq\("assignee", "carlos"\)/g)?.length).toBe(2);
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

test("outreach leads remain separate from clients and store relationship level and language", async () => {
  const [page, component, addClient, actions, userActions, migration, levelMigration, languageMigration, indexMigration, ownerPolicyMigration] = await Promise.all([
    readFile(path.join(root, "app/admin/goals-progress/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/client-target-outreach.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/add-target-client.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/goals-progress/lead-actions.ts"), "utf8"),
    readFile(path.join(root, "app/admin/users/actions.ts"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260817175631_manager_outreach_leads.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260817214500_add_outreach_lead_relationship_level.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260817223000_add_client_preferred_language.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260817180209_index_manager_tracking_creators.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260817183000_allow_owner_manage_outreach_leads.sql"), "utf8"),
  ]);

  expect(page).toContain('supabase.from("manager_outreach_leads")');
  expect(component).toContain("Add an outreach lead");
  expect(component).toContain("A lead stays separate from active clients and orders.");
  expect(component).toContain("Relationship level");
  expect(component).toContain("Level {lead.relationship_level}");
  expect(component).toContain("Preferred language");
  expect(component).toContain("updateClientLanguageAction");
  expect(component).toContain("Edit outreach lead");
  expect(component).toContain("Save lead");
  expect(component).toContain("updateOutreachLeadAction");
  expect(addClient).toContain("Preferred language");
  expect(actions.match(/requireStaffProfile\("customers"\)/g)?.length).toBe(5);
  expect(actions).not.toContain("createAdminClient");
  expect(actions.match(/supabase\.from\("manager_outreach_leads"\)/g)?.length).toBe(5);
  expect(actions).toContain('error: "Enter a valid phone number."');
  expect(actions).toContain("relationship_level: relationshipLevel");
  expect(actions).toContain("preferred_language: preferredLanguage");
  expect(actions).toContain('target: "lead" | "client"');
  expect(actions).toContain("export async function updateOutreachLeadAction");
  expect(actions).toContain('.eq("id", input.id).select("id").maybeSingle');
  expect(userActions).toContain('createTargetClientAction(input: ManagerNewClientInput)');
  expect(userActions).toContain('requireStaffProfile("customers")');
  expect(migration).toContain("create table if not exists public.manager_outreach_leads");
  expect(migration).toContain("alter table public.manager_outreach_leads enable row level security");
  expect(migration).toContain("role in ('admin', 'staff')");
  expect(migration).toContain("created_by = (select auth.uid())");
  expect(indexMigration).toContain("manager_outreach_leads_created_by_idx");
  expect(ownerPolicyMigration).toContain("manager_outreach_leads_manager_insert");
  expect(ownerPolicyMigration).toContain("avitanneto@gmail.com");
  expect(levelMigration).toContain("relationship_level smallint not null default 1");
  expect(levelMigration).toContain("relationship_level between 1 and 5");
  expect(languageMigration).toContain("manager_outreach_leads_preferred_language_check");
  expect(languageMigration).toContain("profiles_preferred_language_check");
  expect(languageMigration.match(/preferred_language in \('en', 'es'\)/g)?.length).toBe(2);
});

test("Client Target call guide opens in Goals and the old page redirects", async () => {
  const [page, guide] = await Promise.all([
    readFile(path.join(root, "app/admin/goals-progress/client-target/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/client-target-call-guide.tsx"), "utf8"),
  ]);

  expect(page).toContain('redirect("/admin/goals-progress")');
  expect(guide).toContain("Carlos&apos;s conversation guide");
  expect(guide).toContain("Hi, this is Carlos");
  expect(guide).toContain("Hola, soy Carlos");
  expect(guide).toContain("English");
  expect(guide).toContain("Español");
  expect(guide).toContain('role="dialog"');
});

test("Goals and lists use collapsed disclosures to keep the page compact", async () => {
  const [page, leads, goals] = await Promise.all([
    readFile(path.join(root, "app/admin/goals-progress/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/client-target-outreach.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/manager-goals.tsx"), "utf8"),
  ]);

  expect(page).toContain("function GoalDisclosure");
  expect(page).toContain("<details");
  expect(page).toContain("Clients in the system");
  expect(leads).toContain('<details className="group');
  expect(goals).toContain("goals.map((goal) => <details");
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

test("Carlos has a call-ready list of 50 relevant affiliate targets with honest contact routes", async () => {
  const [page, component, data] = await Promise.all([
    readFile(path.join(root, "app/admin/goals-progress/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/affiliate-call-list.tsx"), "utf8"),
    readFile(path.join(root, "lib/affiliate-call-list.ts"), "utf8"),
  ]);

  expect(page).toContain("<AffiliateCallList />");
  expect(page).toContain("50 construction-focused targets with direct call routes first.");
  expect(component).toContain("50 construction-focused targets");
  expect(component).toContain("Direct business");
  expect(component).toContain("Network managed");
  expect(component).toContain("Only public business numbers are shown");
  expect((data.match(/\btarget\(/g) ?? []).length).toBe(50);

  const companies = [...data.matchAll(/target\(\d+, "([^"]+)"/g)].map((match) => match[1]);
  const phones = [...data.matchAll(/target\(\d+, "[^"]+", "([\d-]+)"/g)].map((match) => match[1]);
  expect(new Set(companies).size).toBe(50);
  expect(phones).toHaveLength(50);
  expect(phones.every((phone) => /^\d{3}-\d{3}-\d{4}$/.test(phone))).toBe(true);
});

test("Beat Your Quote flyer is owner-only and has print and sharing controls", async () => {
  const flyer = await readFile(path.join(root, "app/admin/goals-progress/beat-your-quote-flyer/page.tsx"), "utf8");
  const actions = await readFile(path.join(root, "components/buildflow/campaign-flyer-actions.tsx"), "utf8");

  expect(flyer).toContain("await requireAdminProfile()");
  expect(flyer).toContain("Let us try to beat your material quote.");
  expect(actions).toContain("window.print()");
  expect(actions).toContain("https://wa.me/");
});
