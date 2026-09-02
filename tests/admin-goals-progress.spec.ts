import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const root = process.cwd();

test("Goals and Client Target stay in the dashboard instead of manager navigation", async () => {
  const shell = await readFile(
    path.join(root, "components/buildflow/admin-shell.tsx"),
    "utf8",
  );

  expect(shell).not.toContain(
    '{ href: "/admin/goals-progress", label: "Goals & Progress"',
  );
  expect(shell).not.toContain(
    '{ href: "/admin/goals-progress/client-target", label: "Client Target", icon: Target }',
  );
  expect(shell).toContain("function navigationLinks(access: ManagerAccess)");
  expect(shell).not.toContain("sharedMoreLinks");
  expect(shell).not.toContain('label: "Directories & Catalog"');
  expect(shell).not.toContain('label: "Supplier Pricing"');
  expect(shell).not.toContain("Customer Website");
  expect(shell).not.toContain("Quick Access");
  expect(shell).toContain(
    'link={{ href: "/admin/communications", label: "Communications", shortLabel: "Communication"',
  );
  expect(shell).not.toContain('label: "Tasks"');
  expect(shell).not.toContain('label: "Quotes & Orders"');
  expect(shell).not.toContain('label: "Tasks & Daily Summary"');
});

test("Carlos Goals keeps every Carlos priority together and hides David goals", async () => {
  const [page, actions, dashboard, prioritySelect] = await Promise.all([
    readFile(path.join(root, "app/admin/goals-progress/page.tsx"), "utf8"),
    readFile(
      path.join(root, "app/admin/goals-progress/goal-actions.ts"),
      "utf8",
    ),
    readFile(path.join(root, "app/admin/build-map/page.tsx"), "utf8"),
    readFile(
      path.join(root, "components/buildflow/manager-goal-priority-select.tsx"),
      "utf8",
    ),
  ]);

  expect(page).toContain("await requireManagerPortalProfile()");
  expect(page).toContain("function SupplierNetworkGoalLink({");
  expect(page).toContain("Carlos Dashboard");
  expect(page).toContain("Contact New Clients");
  expect(page).toContain("<ContractorCallScript />");
  expect(page).toContain("<AddOutreachLead />");
  expect(page).toContain("<OutreachLeadList");
  expect(page).toContain("Clients in the system");
  expect(page).not.toContain('title="Find Best Supplier Prices"');
  expect(page).toContain("Build Supplier Relationships");
  expect(page).toContain("Prepare ABC Demo");
  expect(page).toContain('href="/admin/abc"');
  expect(page).not.toContain("<PersonHeader");
  expect(page).toContain('href="/admin/supplier-network"');
  expect(page).not.toContain("<SupplierNetworkWorkspace");
  expect(page).toContain("<AddTargetClient />");
  expect(page).toContain("<ClientTargetCallGuide />");
  expect(page).not.toContain('title="API, Affiliate & Partnership"');
  expect(page).toContain("<GoalNumber>2</GoalNumber>");
  expect(page).toContain("number={3}");
  expect(page).not.toContain("number={4}");
  expect(page).not.toContain("number={5}");
  expect(page).toContain("<ManagerGoalPrioritySelect");
  expect(page).toContain('priorityFor("client-target")');
  expect(actions).toContain("setFixedManagerGoalPriorityAction");
  expect(actions).toContain("Only David can change Carlos task priority.");
  expect(prioritySelect).toContain('label: "Focus now"');
  expect(prioritySelect).toContain('label: "Do later"');
  expect(prioritySelect).toContain('label: "Low priority"');
  expect(page).toContain('id="supplier-affiliate-program"');
  expect(page).toContain('fixedKey="supplier-affiliate-program"');
  expect(page).toContain('.from("manager_goals")');
  expect(page).toContain("activeFixedGoals.map");
  expect(page).toContain("md:grid-cols-2 xl:grid-cols-3");
  expect(page).toContain("has-[>details[open]]:md:col-span-2");
  expect(page).toContain("published_to_carlos");
  expect(page).toContain("carlosFixedTaskKeys");
  expect(page).toContain("publishedTaskKeys");
  expect(page).toContain("visibleFixedGoals");
  expect(page).not.toContain('PersonHeader assignee="david"');
  expect(page).toContain('.eq("assignee", "carlos")');
  expect(page).not.toContain("david-goals-title");
  expect(page).toContain("export async function CarlosGoalsWorkspace");
  expect(page).toContain("if (embedded) return");
  expect(dashboard).toContain(
    'if (!access.owner) goalsQuery = goalsQuery.eq("assignee", "carlos")',
  );
  expect(dashboard).not.toContain('GoalDisclosure assignee="david"');
  expect(dashboard).toContain("<CarlosGoalsWorkspace embedded />");
  expect(dashboard).not.toContain('href="/admin/goals-progress#client-target"');
  expect(actions).toContain('if (!access.owner && assignee !== "carlos")');
  expect(
    actions.match(/if \(!access\.owner\).*\.eq\("assignee", "carlos"\)/g)
      ?.length,
  ).toBe(3);
});

test("ABC task provides a policy-correct certification menu and stable bridge", async () => {
  const [goals, demo, pricing, bridge, callback] = await Promise.all([
    readFile(path.join(root, "app/admin/goals-progress/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/abc/page.tsx"), "utf8"),
    readFile(
      path.join(root, "components/buildflow/abc-supply-pricing.tsx"),
      "utf8",
    ),
    readFile(path.join(root, "lib/abc-supply/bridge.ts"), "utf8"),
    readFile(
      path.join(root, "app/api/integrations/abc/callback/route.ts"),
      "utf8",
    ),
  ]);

  for (const label of [
    "Customer connection",
    "Ship-To",
    "Authorized branch",
    "Product search",
    "Unit & quantity",
    "Availability & price",
    "Demo script",
  ]) {
    expect(goals).toContain(label);
  }
  expect(demo).toContain('aria-label="ABC demo menu"');
  expect(demo).toContain("ABC Supply remains the seller");
  expect(demo).toContain("TPA private pricing requires");
  expect(demo).toContain("API ordering is not presented in this demo");
  expect(pricing).toContain('id="unit-quantity"');
  expect(pricing).toContain('id="availability-price"');
  expect(pricing).not.toContain("Estimated total");
  expect(bridge).toContain("build-flow-wfl3-git-codex-abc-7d0632");
  expect(bridge).toContain("getAbcBridgeCallbackUrl");
  expect(callback).toContain("getAbcBridgeCallbackUrl(callbackParams)");
  expect(callback).toContain('["error", "error_description", "code", "state"]');
  expect(callback).not.toContain("requireSignedInProfile");
});

test("manager goals are persistent, status-aware, archivable, and protected for manager users", async () => {
  const [component, statusSelect, actions, migration, archiveMigration] =
    await Promise.all([
      readFile(
        path.join(root, "components/buildflow/manager-goals.tsx"),
        "utf8",
      ),
      readFile(
        path.join(root, "components/buildflow/manager-goal-status-select.tsx"),
        "utf8",
      ),
      readFile(
        path.join(root, "app/admin/goals-progress/goal-actions.ts"),
        "utf8",
      ),
      readFile(
        path.join(
          root,
          "supabase/migrations/20260817140952_create_manager_goals.sql",
        ),
        "utf8",
      ),
      readFile(
        path.join(
          root,
          "supabase/migrations/20260826221441_add_archived_manager_goal_status.sql",
        ),
        "utf8",
      ),
    ]);

  expect(component).toContain("Add task");
  expect(component).toContain("Archived goals");
  expect(component).toContain('id="carlos-custom-tasks"');
  expect(component).toContain("Tasks");
  expect(component).toContain("Goal title");
  expect(component).toContain("Next step");
  expect(component).toContain("ManagerGoalStatusSelect");
  expect(component).toContain("deleteManagerGoalAction");
  expect(statusSelect).toContain('label: "In progress"');
  expect(statusSelect).toContain('label: "Done"');
  expect(statusSelect).toContain('label: "Archived"');
  expect(actions).toContain("setManagerGoalStatusAction");
  expect(actions).toContain("setFixedManagerGoalStatusAction");
  expect(actions.match(/requireManagerPortalProfile\(\)/g)?.length).toBe(7);
  expect(migration).toContain(
    "create table if not exists public.manager_goals",
  );
  expect(migration).toContain(
    "alter table public.manager_goals enable row level security",
  );
  expect(migration).toContain("role in ('admin', 'staff')");
  expect(migration).toContain("approval_status = 'approved'");
  expect(migration).toContain("created_by = (select auth.uid())");
  expect(archiveMigration).toContain(
    "status in ('open', 'completed', 'archived')",
  );
});

test("Carlos dashboard removes the old Focus and Work Area duplication", async () => {
  const [page, component, dashboard, migration] = await Promise.all([
    readFile(path.join(root, "app/admin/goals-progress/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/manager-goals.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/build-map/page.tsx"), "utf8"),
    readFile(
      path.join(
        root,
        "supabase/migrations/20260828170000_add_manager_goal_focus.sql",
      ),
      "utf8",
    ),
  ]);

  expect(page).toContain("Carlos Dashboard");
  expect(page).not.toContain("Work areas");
  expect(page).not.toContain("One priority, clear tasks");
  expect(component).not.toContain("Add to Focus");
  expect(component).not.toContain("Remove from Focus");
  expect(dashboard).not.toContain("goal.is_focus ||");
  expect(dashboard).not.toContain("ManagerTodayTasks");
  expect(migration).toContain(
    "add column if not exists is_focus boolean not null default false",
  );
  expect(migration).toContain("where is_focus = true");
});

test("outreach leads remain separate from clients and store relationship level and language", async () => {
  const [
    page,
    component,
    addClient,
    actions,
    userActions,
    migration,
    levelMigration,
    languageMigration,
    indexMigration,
    ownerPolicyMigration,
  ] = await Promise.all([
    readFile(path.join(root, "app/admin/goals-progress/page.tsx"), "utf8"),
    readFile(
      path.join(root, "components/buildflow/client-target-outreach.tsx"),
      "utf8",
    ),
    readFile(
      path.join(root, "components/buildflow/add-target-client.tsx"),
      "utf8",
    ),
    readFile(
      path.join(root, "app/admin/goals-progress/lead-actions.ts"),
      "utf8",
    ),
    readFile(path.join(root, "app/admin/users/actions.ts"), "utf8"),
    readFile(
      path.join(
        root,
        "supabase/migrations/20260817175631_manager_outreach_leads.sql",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        root,
        "supabase/migrations/20260817214500_add_outreach_lead_relationship_level.sql",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        root,
        "supabase/migrations/20260817223000_add_client_preferred_language.sql",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        root,
        "supabase/migrations/20260817180209_index_manager_tracking_creators.sql",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        root,
        "supabase/migrations/20260817183000_allow_owner_manage_outreach_leads.sql",
      ),
      "utf8",
    ),
  ]);

  expect(page).toContain('.from("manager_outreach_leads")');
  expect(component).toContain("Add an outreach lead");
  expect(component).toContain(
    "A lead stays separate from active clients and orders.",
  );
  expect(component).toContain("Lead group");
  expect(component).toContain('label: "Friend"');
  expect(component).toContain('label: "Worked with"');
  expect(component).toContain("updateOutreachLeadRelationshipAction");
  expect(component).toContain("Preferred language");
  expect(component).toContain("updateClientLanguageAction");
  expect(component).toContain("Edit outreach lead");
  expect(component).toContain("Save lead");
  expect(component).toContain("updateOutreachLeadAction");
  expect(addClient).toContain("Preferred language");
  expect(actions.match(/requireStaffProfile\("customers"\)/g)?.length).toBe(6);
  expect(actions).not.toContain("createAdminClient");
  expect(
    actions.match(/supabase\.from\("manager_outreach_leads"\)/g)?.length,
  ).toBe(5);
  expect(actions).toContain(
    "export async function updateOutreachLeadRelationshipAction",
  );
  expect(actions).toContain('error: "Enter a valid phone number."');
  expect(actions).toContain("relationship_level: relationshipLevel");
  expect(actions).toContain("preferred_language: preferredLanguage");
  expect(actions).toContain('target: "lead" | "client"');
  expect(actions).toContain("export async function updateOutreachLeadAction");
  expect(actions).toContain('.eq("id", input.id).select("id").maybeSingle');
  expect(userActions).toContain(
    "createTargetClientAction(input: ManagerNewClientInput)",
  );
  expect(userActions).toContain('requireStaffProfile("customers")');
  expect(migration).toContain(
    "create table if not exists public.manager_outreach_leads",
  );
  expect(migration).toContain(
    "alter table public.manager_outreach_leads enable row level security",
  );
  expect(migration).toContain("role in ('admin', 'staff')");
  expect(migration).toContain("created_by = (select auth.uid())");
  expect(indexMigration).toContain("manager_outreach_leads_created_by_idx");
  expect(ownerPolicyMigration).toContain(
    "manager_outreach_leads_manager_insert",
  );
  expect(ownerPolicyMigration).toContain("avitanneto@gmail.com");
  expect(levelMigration).toContain(
    "relationship_level smallint not null default 1",
  );
  expect(levelMigration).toContain("relationship_level between 1 and 5");
  expect(languageMigration).toContain(
    "manager_outreach_leads_preferred_language_check",
  );
  expect(languageMigration).toContain("profiles_preferred_language_check");
  expect(
    languageMigration.match(/preferred_language in \('en', 'es'\)/g)?.length,
  ).toBe(2);
});

test("Client Target call guide opens in Goals and the old page redirects", async () => {
  const [page, guide] = await Promise.all([
    readFile(
      path.join(root, "app/admin/goals-progress/client-target/page.tsx"),
      "utf8",
    ),
    readFile(
      path.join(root, "components/buildflow/client-target-call-guide.tsx"),
      "utf8",
    ),
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
    readFile(
      path.join(root, "components/buildflow/client-target-outreach.tsx"),
      "utf8",
    ),
    readFile(path.join(root, "components/buildflow/manager-goals.tsx"), "utf8"),
  ]);

  expect(page).toContain("function GoalDisclosure");
  expect(page).toContain("<details");
  expect(page).toContain("Clients in the system");
  expect(leads).toContain('<details className="group');
  expect(goals).toContain("activeGoals.map(goalRow)");
  expect(goals).toContain("grid-cols-[2rem_minmax(0,1fr)_auto]");
  expect(goals).toContain("min-h-16");
});

test("Carlos Dashboard keeps direct tasks without Focus or Work Area wrappers", async () => {
  const [page, goals] = await Promise.all([
    readFile(path.join(root, "app/admin/goals-progress/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/manager-goals.tsx"), "utf8"),
  ]);

  expect(goals).toContain("{goal.title}");
  expect(goals).toContain("Next step");
  expect(goals).toContain("text-xs leading-5");
  expect(goals).not.toContain("Focus first");
  expect(page).toContain("activeFixedGoals.map");
  expect(page).not.toContain('aria-labelledby="carlos-work-areas"');
  expect(page).not.toContain("Work areas");
});

test("affiliate tracker is persistent, owner-only, filterable, and setup-gated", async () => {
  const component = await readFile(
    path.join(root, "components/buildflow/affiliate-program-tracker.tsx"),
    "utf8",
  );
  const actions = await readFile(
    path.join(root, "app/admin/goals-progress/affiliate-actions.ts"),
    "utf8",
  );
  const migration = await readFile(
    path.join(
      root,
      "supabase/migrations/20260816193932_create_affiliate_program_tracker.sql",
    ),
    "utf8",
  );

  expect(component).toContain("Top 10 Supplier Programs");
  expect(component).toContain("Search supplier");
  expect(component).toContain("Lowe’s Developer/API Onboarding");
  expect(component).toContain("Brand approvals are separate");
  expect(component).toContain("integrations.map");
  expect(component).toContain(
    "Start application opens the official program in a new tab",
  );
  expect(component).toContain("Live affiliate link");
  expect(component).toContain("Open affiliate link");
  expect(component).toContain("Save verified Amazon link");
  expect(component).toContain("Record Impact approval");
  expect(component).toContain("Apply verified Aug 28 audit");
  expect(component).toContain("Top 10 Supplier Programs");
  expect(component).toContain("TOP_SUPPLIER_NAMES");
  expect(component).toContain("<ProgramDrawer key={selected.id}");
  expect(component).toContain('rel="sponsored noopener noreferrer"');
  expect(component).toContain("Setup checklist");
  expect(actions).toContain("await requireAdminProfile()");
  expect(actions).toContain("optionalHttpUrl");
  expect(actions).toContain("affiliate_test_url: affiliateTestUrl.value");
  expect(actions).toContain("recordAmazonAffiliateLinkAction");
  expect(actions).toContain("recordImpactMarketplaceApprovalAction");
  expect(actions).toContain("recordTopTenSupplierAuditAction");
  expect(actions).toContain("The Home Depot Affiliate Team confirmed receipt");
  expect(actions).toContain(
    "Re-certification demo scheduled for September 3, 2026",
  );
  expect(actions).toContain(
    "each retailer still requires a separate brand application and approval",
  );
  expect(actions).toContain("Complete every setup checklist item");
  expect(migration).toContain("prevent_incomplete_affiliate_setup");
  expect(migration).toContain("affiliate_confirmation_owner_insert");
  expect((migration.match(/'Not Started'\)/g) ?? []).length).toBe(39);
  expect(
    (migration.match(/'In Progress'\)/g) ?? []).length,
  ).toBeGreaterThanOrEqual(1);
  expect(migration).toContain("'Lowe''s Creator','A'");
  expect(migration).toContain("'Developer/API Integration','In Progress'");
});

test("Carlos has one compact deduplicated supplier network while the research list stays preserved", async () => {
  const [page, component, badges, network, data] = await Promise.all([
    readFile(path.join(root, "app/admin/supplier-network/page.tsx"), "utf8"),
    readFile(
      path.join(root, "components/buildflow/supplier-network-workspace.tsx"),
      "utf8",
    ),
    readFile(path.join(root, "components/buildflow/supplier-program-badges.tsx"), "utf8"),
    readFile(path.join(root, "lib/supplier-network.ts"), "utf8"),
    readFile(path.join(root, "lib/affiliate-call-list.ts"), "utf8"),
  ]);

  expect(page).toContain("<SupplierNetworkWorkspace");
  expect(page).toContain("Build Supplier Relationships");
  expect(page).toContain('href="/admin/goals-progress"');
  expect(page).toContain("requireManagerPortalProfile");
  expect(component).toContain("Sells / departments");
  expect(component).toContain("What to ask");
  for (const source of ["Show", "Friends", "Google", "Nearby"]) {
    expect(component).toContain(`"${source}"`);
  }
  expect(component).toContain("CHANNEL_DESCRIPTIONS");
  expect(badges).toContain("Direct catalog, stock, or pricing connection");
  expect(component).toContain("Choose options for");
  expect(component).toContain("updateSupplierNetworkRowAction");
  expect(component).toContain("Saved automatically");
  expect(component).toContain("Actions for");
  expect(component).toContain("Move to");
  expect(component).toContain("Write a short note");
  expect(component).toContain("Waiting for reply");
  expect(component).toContain('label: "Hidden"');
  expect(component).toContain("Restore");
  expect(component).toContain("deleteConfirm === row.key");
  expect(component).toContain("aria-pressed={priorityOnly}");
  expect(component).toContain("Current focus");
  expect(component).toContain("Top vendors");
  expect(component).toContain("Building Relationship");
  expect(component).toContain("Generate 10 more");
  expect(component).toContain("Top vendors · actively working together");
  expect(component).toContain("Current priority");
  expect(component).toContain("priorityDifference");
  expect(component).toContain("priorityOnly");
  expect(component).toContain("SUPPLIER_NETWORK_CHANNELS.map");
  expect(component).toContain("min-h-11");
  expect(network).toContain("canonicalSupplierKey");
  expect(network).toContain("sourceRefs");
  expect(network).toContain("mergeRow(rows");
  expect(network).toContain("itemProgress?.important");
  expect(network).toContain("AFFILIATE_CALL_TARGETS");
  expect(page).toContain('.from("affiliate_programs")');
  expect(data).toContain("export const TOP_AFFILIATE_CALL_TARGETS");
  expect((data.match(/trackerName:/g) ?? []).length).toBe(10);
  expect((data.match(/currentSituation:/g) ?? []).length).toBe(10);
  expect((data.match(/contactMethods:/g) ?? []).length).toBe(10);
  expect((data.match(/recommendedScript:/g) ?? []).length).toBe(10);
  expect((data.match(/termsFit:/g) ?? []).length).toBe(10);
  expect(data).toContain("allie.smith@cj.com");
  expect(data).toContain("publisher.growth@impact.com");
  expect(data).toContain("affiliatesmanager@acmetools.com");
  expect((data.match(/\btarget\(/g) ?? []).length).toBe(50);

  const companies = [...data.matchAll(/target\(\d+, "([^"]+)"/g)].map(
    (match) => match[1],
  );
  const phones = [...data.matchAll(/target\(\d+, "[^"]+", "([\d-]+)"/g)].map(
    (match) => match[1],
  );
  expect(new Set(companies).size).toBe(50);
  expect(phones).toHaveLength(50);
  expect(phones.every((phone) => /^\d{3}-\d{3}-\d{4}$/.test(phone))).toBe(true);
});

test("Beat Your Quote flyer is owner-only and has print and sharing controls", async () => {
  const flyer = await readFile(
    path.join(root, "app/admin/goals-progress/beat-your-quote-flyer/page.tsx"),
    "utf8",
  );
  const actions = await readFile(
    path.join(root, "components/buildflow/campaign-flyer-actions.tsx"),
    "utf8",
  );

  expect(flyer).toContain("await requireAdminProfile()");
  expect(flyer).toContain("Let us try to beat your material quote.");
  expect(actions).toContain("window.print()");
  expect(actions).toContain("https://wa.me/");
});
