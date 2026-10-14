import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { expect, test } from "@playwright/test";
import * as dashboardOutreach from "@/lib/dashboard-outreach";

type Actions = typeof import("@/app/admin/goals-progress/website-work/actions");
function guardedActions(owner: boolean, unlocked: boolean) {
  let writes = 0;
  const context = { access: { owner }, user: { id: "owner-test" }, supabase: { from() { writes++; throw new Error("Unauthorized data access"); } } };
  const dependencies: Record<string, unknown> = {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "test-cookie" }) }) },
    "next/cache": { revalidatePath() {} },
    "@/lib/auth": { requireManagerPortalProfile: async () => context },
    "@/lib/aura/trusted-owner-phones": {}, "@/lib/supabase/admin": {},
    "@/app/admin/goals-progress/goal-actions": {}, "@/lib/manager-goal-status": {},
    "@/lib/dashboard-outreach": dashboardOutreach,
    "@/lib/website-work-access": { verifyWebsiteWorkToken: () => unlocked },
  };
  const output = ts.transpileModule(fs.readFileSync("app/admin/goals-progress/website-work/actions.ts", "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: (name: string) => { if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`); return dependencies[name]; } });
  return { actions: exports as Actions, writes: () => writes };
}

for (const [owner, unlocked, name] of [[false, true, "staff cannot forge a task mutation"], [true, false, "locked owner cannot mutate tasks"]] as const) {
  test(name, async () => {
    const { actions, writes } = guardedActions(owner, unlocked);
    const id = "11111111-1111-4111-8111-111111111112";
    const results = await Promise.all([
      actions.getDashboardOutreachLeadsAction(),
      actions.createDavidDashboardItemAction({ title: "Restricted task", kind: "task" }),
      actions.saveDashboardTaskAction({ id, title: "Restricted edit", summary: "", nextStep: "", updatedAt: "2026-10-14" }),
      actions.setDashboardTaskStatusAction({ id, status: "completed", updatedAt: "2026-10-14" }),
      actions.setDashboardTaskStatusAction({ id, status: "archived", updatedAt: "2026-10-14" }),
      actions.setDavidTaskPublishedAction({ id, published: true }),
    ]);
    expect(results.every((result) => !result.ok)).toBe(true);
    expect(writes()).toBe(0);
  });
}
