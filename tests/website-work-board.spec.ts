import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

test("David Dashboard is owner-authenticated, PIN-gated, and publishes explicitly", async () => {
  const [page, actions, access, migration, readPolicy, dashboardMigration, policyOptimization, goals, board] = await Promise.all([
    readFile(path.join(root, "app/admin/goals-progress/website-work/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/goals-progress/website-work/actions.ts"), "utf8"),
    readFile(path.join(root, "lib/website-work-access.ts"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260830044717_create_website_work_items.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260830114000_allow_staff_website_work_read.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260831174444_organize_carlos_and_david_dashboards.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260831175523_optimize_david_dashboard_policies.sql"), "utf8"),
    readFile(path.join(root, "app/admin/goals-progress/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/david-dashboard-board.tsx"), "utf8"),
  ]);

  expect(page).toContain("requireManagerPortalProfile")
  expect(page).toContain("verifyWebsiteWorkToken")
  expect(page).toContain("David Dashboard")
  expect(page).toContain('if (!access.owner) redirect')
  expect(page).toContain("createClient")
  expect(page).not.toContain("createAdminClient")
  expect(actions).toContain("requireManagerPortalProfile")
  expect(actions).toContain("createDavidDashboardItemAction")
  expect(actions).toContain("setDavidTaskPublishedAction")
  expect(actions).toContain("httpOnly: true")
  expect(actions).toContain('sameSite: "strict"')
  expect(access).toContain('import "server-only"')
  expect(access).toContain("timingSafeEqual")
  expect(migration).toContain("alter table public.website_work_items enable row level security")
  expect(migration).toContain("revoke all on table public.website_work_items from anon, authenticated")
  expect(migration).not.toContain("grant select")
  expect(readPolicy).toContain("grant select on table public.website_work_items to authenticated")
  expect(readPolicy).toContain("private.is_admin_or_staff()")
  expect(dashboardMigration).toContain("published_to_carlos")
  expect(dashboardMigration).toContain("item_kind")
  expect(policyOptimization).toContain("private.is_admin()")
  expect(policyOptimization).toContain("private.is_staff()")
  expect(policyOptimization).toContain('create policy "website_work_items_manager_read"')
  expect(goals).toContain('href="/admin/goals-progress/website-work"')
  expect(goals).toContain("Phone Intake Tasks")
  expect(goals.indexOf("Phone Intake Tasks")).toBeLessThan(goals.indexOf("David Dashboard"))
  expect(board).toContain("Publish to Carlos")
  expect(board).toContain("Pain I&apos;m Resolving")
});

test("David Dashboard keeps existing website tasks and compact add controls", async () => {
  const [page, migration, board] = await Promise.all([
    readFile(path.join(root, "app/admin/goals-progress/website-work/page.tsx"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260830044717_create_website_work_items.sql"), "utf8"),
    readFile(path.join(root, "components/buildflow/david-dashboard-board.tsx"), "utf8"),
  ]);
  for (const field of ["category", "status", "assigned_agent", "progress_percent", "next_step", "source_chat_id"]) {
    expect(migration).toContain(field)
  }
  expect(page).toContain("DavidDashboardBoard")
  expect(page).toContain("published_to_carlos")
  expect(board).toContain('placeholder="New task"')
  expect(board).toContain('placeholder="Add a pain to resolve"')
});
