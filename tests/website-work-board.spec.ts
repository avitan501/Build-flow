import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

test("website work board is manager-authenticated, PIN-gated, and server-only", async () => {
  const [page, actions, access, migration, goals] = await Promise.all([
    readFile(path.join(root, "app/admin/goals-progress/website-work/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/goals-progress/website-work/actions.ts"), "utf8"),
    readFile(path.join(root, "lib/website-work-access.ts"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260830044717_create_website_work_items.sql"), "utf8"),
    readFile(path.join(root, "app/admin/goals-progress/page.tsx"), "utf8"),
  ]);

  expect(page).toContain("requireManagerPortalProfile")
  expect(page).toContain("verifyWebsiteWorkToken")
  expect(page).toContain("createAdminClient")
  expect(actions).toContain("requireManagerPortalProfile")
  expect(actions).toContain("httpOnly: true")
  expect(actions).toContain('sameSite: "strict"')
  expect(access).toContain('import "server-only"')
  expect(access).toContain("timingSafeEqual")
  expect(migration).toContain("alter table public.website_work_items enable row level security")
  expect(migration).toContain("revoke all on table public.website_work_items from anon, authenticated")
  expect(migration).not.toContain("grant select")
  expect(goals).toContain('href="/admin/goals-progress/website-work"')
});

test("website work board keeps compact category, status, owner, progress, and next-step fields", async () => {
  const [page, migration] = await Promise.all([
    readFile(path.join(root, "app/admin/goals-progress/website-work/page.tsx"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260830044717_create_website_work_items.sql"), "utf8"),
  ]);
  for (const field of ["category", "status", "assigned_agent", "progress_percent", "next_step", "source_chat_id"]) {
    expect(migration).toContain(field)
  }
  expect(page).toContain("Object.groupBy")
  expect(page).toContain("Only open work")
  expect(page).toContain("latest decision wins")
  expect(page).toContain("md:grid-cols")
});
