import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

test("David Dashboard is owner-authenticated, PIN-gated, and publishes explicitly", async () => {
  const [
    page,
    actions,
    access,
    migration,
    readPolicy,
    dashboardMigration,
    policyOptimization,
    ideasMigration,
    visibilityMigration,
    broker,
    goals,
    board,
  ] = await Promise.all([
    readFile(
      path.join(root, "app/admin/goals-progress/website-work/page.tsx"),
      "utf8",
    ),
    readFile(
      path.join(root, "app/admin/goals-progress/website-work/actions.ts"),
      "utf8",
    ),
    readFile(path.join(root, "lib/website-work-access.ts"), "utf8"),
    readFile(
      path.join(
        root,
        "supabase/migrations/20260830044717_create_website_work_items.sql",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        root,
        "supabase/migrations/20260830114000_allow_staff_website_work_read.sql",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        root,
        "supabase/migrations/20260831174444_organize_carlos_and_david_dashboards.sql",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        root,
        "supabase/migrations/20260831175523_optimize_david_dashboard_policies.sql",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        root,
        "supabase/migrations/20260831191020_add_david_dashboard_ideas.sql",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        root,
        "supabase/migrations/20260831195433_add_carlos_visibility_controls.sql",
      ),
      "utf8",
    ),
    readFile(
      path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
      "utf8",
    ),
    readFile(path.join(root, "app/admin/goals-progress/page.tsx"), "utf8"),
    readFile(
      path.join(root, "components/buildflow/david-dashboard-board.tsx"),
      "utf8",
    ),
  ]);

  expect(page).toContain("requireManagerPortalProfile");
  expect(page).toContain("verifyWebsiteWorkToken");
  expect(page).toContain("David Dashboard");
  expect(page).toContain("if (!access.owner) redirect");
  expect(page).toContain("createClient");
  expect(page).not.toContain("createAdminClient");
  expect(actions).toContain("requireManagerPortalProfile");
  expect(actions).toContain("createDavidDashboardItemAction");
  expect(actions).toContain("setDavidTaskPublishedAction");
  expect(actions).toContain("updateDavidDashboardItemAction");
  expect(actions).toContain("deleteDavidDashboardItemAction");
  expect(actions).toContain("rewriteDavidDashboardItemAction");
  expect(actions).toContain('action: "rewrite_dashboard_item"');
  expect(actions).toContain("unlockedDavidDashboard");
  expect(actions).toContain("httpOnly: true");
  expect(actions).toContain('sameSite: "strict"');
  expect(access).toContain('import "server-only"');
  expect(access).toContain("timingSafeEqual");
  expect(migration).toContain(
    "alter table public.website_work_items enable row level security",
  );
  expect(migration).toContain(
    "revoke all on table public.website_work_items from anon, authenticated",
  );
  expect(migration).not.toContain("grant select");
  expect(readPolicy).toContain(
    "grant select on table public.website_work_items to authenticated",
  );
  expect(readPolicy).toContain("private.is_admin_or_staff()");
  expect(dashboardMigration).toContain("published_to_carlos");
  expect(dashboardMigration).toContain("item_kind");
  expect(policyOptimization).toContain("private.is_admin()");
  expect(policyOptimization).toContain("private.is_staff()");
  expect(policyOptimization).toContain(
    'create policy "website_work_items_manager_read"',
  );
  expect(ideasMigration).toContain("'task', 'pain', 'idea'");
  expect(ideasMigration).toContain(
    "website_work_items_publish_task_only_check",
  );
  expect(broker).toContain('input.action === "rewrite_dashboard_item"');
  expect(broker).toContain("Only the owner can rewrite this item.");
  expect(broker).toContain("meaningfully different");
  expect(goals).not.toContain('href="/admin/goals-progress/website-work"');
  expect(goals).not.toContain("Phone Intake Tasks");
  expect(page).toContain("Phone Intake");
  expect(page).toContain("routePhoneIntakeTaskAction");
  expect(page).toContain("deletePhoneIntakeAction");
  expect(board).toContain("Show Carlos");
  expect(board.match(/Show Carlos/g)?.length).toBeGreaterThanOrEqual(2);
  expect(visibilityMigration).toContain("carlos-fixed-client-target");
  expect(visibilityMigration).toContain("carlos-fixed-call-suppliers");
  expect(visibilityMigration).toContain(
    "carlos-fixed-supplier-affiliate-program",
  );
  expect(visibilityMigration).toContain("carlos-fixed-supplier-partnerships");
  expect(visibilityMigration).toContain("carlos-fixed-abc-supply-demo");
  expect(board).toContain("Pain I&apos;m Resolving");
  expect(board).toContain("Saving…");
  expect(board).not.toContain(">Save</button><button type=\"button\" disabled={pending} onClick={onRewrite}");
  expect(board).toContain("AI Task Archive");
  expect(board).toContain("Ideas");
  expect(board).toContain("Rewrite with AI");
  expect(board).toContain("Delete this ${kind}?");
  expect(board).toContain('"whatsapp-coexistence", "abc-private-pricing"');
});

test("David Dashboard keeps existing website tasks and compact add controls", async () => {
  const [page, migration, board] = await Promise.all([
    readFile(
      path.join(root, "app/admin/goals-progress/website-work/page.tsx"),
      "utf8",
    ),
    readFile(
      path.join(
        root,
        "supabase/migrations/20260830044717_create_website_work_items.sql",
      ),
      "utf8",
    ),
    readFile(
      path.join(root, "components/buildflow/david-dashboard-board.tsx"),
      "utf8",
    ),
  ]);
  for (const field of [
    "category",
    "status",
    "assigned_agent",
    "progress_percent",
    "next_step",
    "source_chat_id",
  ]) {
    expect(migration).toContain(field);
  }
  expect(page).toContain("DavidDashboardBoard");
  expect(page).toContain("published_to_carlos");
  expect(page).toContain("source_chat_title");
  expect(page).toContain("task_key");
  expect(board).toContain('placeholder="New task"');
  expect(board).toContain('placeholder="Problem title"');
  expect(page).toContain("resolution_cost");
  expect(board).toContain("How I&apos;ll resolve it");
  expect(board).toContain('aria-label="Resolution cost"');
  expect(board).toContain("grid-cols-[1.1fr_1.35fr_1.55fr_7.5rem_11rem]");
  expect(board).toContain('aria-label="Rewrite pain with AI"');
});

test("pain resolution table persists the issue, resolution, and cost", async () => {
  const [actions, migration] = await Promise.all([
    readFile(path.join(root, "app/admin/goals-progress/website-work/actions.ts"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260831215746_add_pain_resolution_fields.sql"), "utf8"),
  ]);
  expect(migration).toContain("add column if not exists resolution_cost numeric(12, 2)");
  expect(migration).toContain("resolution_cost >= 0");
  expect(actions).toContain("summary: issue");
  expect(actions).toContain('next_step: input.kind === "pain" ? resolution : nextStep');
  expect(actions).toContain('resolution_cost: input.kind === "pain" ? cost : null');
  expect(actions).toContain("{ title, summary: issue, next_step: resolution, resolution_cost: cost }");
});

test("David quote challenge is private, persistent, and action focused", async () => {
  const [dashboard, page, tracker, actions, definitions, migration] = await Promise.all([
    readFile(path.join(root, "app/admin/goals-progress/website-work/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/goals-progress/website-work/quote-challenge/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/david-quote-growth-tracker.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/goals-progress/website-work/quote-challenge/actions.ts"), "utf8"),
    readFile(path.join(root, "lib/david-quote-growth.ts"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260901024749_add_david_quote_growth_tracker.sql"), "utf8"),
  ]);

  expect(dashboard).toContain("30-Day Quote Challenge");
  expect(dashboard).toContain('href="/admin/goals-progress/website-work/quote-challenge"');
  expect(page).toContain("requireManagerPortalProfile");
  expect(page).toContain("verifyWebsiteWorkToken");
  expect(page).toContain('if (!context.access.owner) redirect');
  expect(tracker).toContain("Beat Your Material Quote");
  expect(tracker).toContain("Collect 20 real quotes");
  expect(tracker).not.toContain("Supplier call script");
  expect(tracker).not.toContain("Contractor call script");
  expect(tracker).toContain("Call 5 suppliers first");
  expect(tracker).toContain("Then call 20 contractors");
  expect(tracker).toContain("updateQuoteGrowthMetricAction");
  expect(definitions).toContain('key: "supplier_calls"');
  expect(definitions).toContain('key: "active_suppliers"');
  expect(definitions).toContain('key: "calls"');
  expect(definitions).toContain('key: "quotes_received"');
  expect(definitions).toContain('key: "purchases"');
  expect(actions).toContain("quoteGrowthMetricDefinition");
  expect(actions).toContain('period_kind: input.period');
  expect(actions).toContain('onConflict: "metric_key,period_kind,period_start"');
  expect(migration).toContain("enable row level security");
  expect(migration).toContain("revoke all on table public.david_quote_growth_metrics from anon, authenticated");
  expect(migration).toContain("private.is_admin()");
  expect(migration).not.toContain("to anon");
});

test("approved homepage keeps the selected layout, three-photo hero, process film, and services", async () => {
  const preview = await readFile(
    path.join(root, "components/buildflow/homepage-concept-preview.tsx"),
    "utf8",
  );
  expect(preview).toContain("reviewHeroPhotos");
  expect(preview).toContain("hero-material-yard-v4.webp");
  expect(preview).toContain("hero-long-island-home-v4.webp");
  expect(preview).toContain("hero-exterior-materials-v4.webp");
  expect(preview).toContain("homepage-material-process-v2.mp4");
  expect(preview).toContain("process-text-request-v6.webp");
  expect(preview).toContain("A contractor texts a same-day material list");
  expect(preview).toContain(">Building materials</p>");
  expect(preview).not.toContain(">Before / after</p>");
  expect(preview).toContain('compact ? "w-[60%] min-w-[12.5rem] max-w-[22rem]"');
  expect(preview).toContain("brightness-[.72]");
  expect(preview).toContain("rgba(244,239,230,.18)_82%");
  expect(preview).toContain("ShopBrandShowcase compact transparent");
  for (const service of ["Beat Your Quote", "Send Any Material List", "Find a Specific Item"]) {
    expect(preview).toContain(service);
  }
  expect(preview).toContain("Serving all 50 states");
});
