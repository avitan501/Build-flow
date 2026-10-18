import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { expect, test } from "@playwright/test";
import * as personal from "@/lib/personal-dashboard";

type Actions = typeof import("@/app/admin/goals-progress/website-work/personal/actions");
const ownerId = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const updatedAt = "2026-10-18T10:00:00Z";

function load(owner = true, unlocked = true, found = true) {
  const calls: [string, ...unknown[]][] = [];
  const chain = {
    insert: async (data: unknown) => { calls.push(["insert", data]); return { error: null }; },
    update: (data: unknown) => { calls.push(["update", data]); return chain; },
    eq: (key: string, value: unknown) => { calls.push(["eq", key, value]); return chain; },
    select: () => chain,
    maybeSingle: async () => ({ data: found ? { id } : null, error: null }),
  };
  const context = { user: { id: ownerId }, access: { owner }, supabase: { from(table: string) { calls.push(["from", table]); return chain; } } };
  const dependencies: Record<string, unknown> = {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "local-test" }) }) },
    "next/cache": { revalidatePath(path: string) { calls.push(["revalidate", path]); } },
    "@/lib/auth": { requireManagerPortalProfile: async () => context },
    "@/lib/website-work-access": { verifyWebsiteWorkToken: () => unlocked },
    "@/lib/personal-dashboard": personal,
  };
  const output = ts.transpileModule(fs.readFileSync("app/admin/goals-progress/website-work/personal/actions.ts", "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: (name: string) => { if (!(name in dependencies)) throw new Error(name); return dependencies[name]; } });
  return { actions: exports as Actions, calls };
}

test("personal actions require owner and board unlock before touching data", async () => {
  for (const [owner, unlocked] of [[false, true], [true, false], [false, false]]) {
    const { actions, calls } = load(owner, unlocked);
    const results = await Promise.all([
      actions.createPersonalTaskAction({ title: "Private task" }),
      actions.savePersonalTaskAction({ id, title: "Private edit", summary: "", nextStep: "", updatedAt }),
      actions.setPersonalTaskStatusAction({ id, status: "archived", updatedAt }),
    ]);
    expect(results.every((r) => !r.ok)).toBe(true);
    expect(calls).toEqual([]);
  }
});

test("create binds ownership to session; edits and status bind owner and version", async () => {
  const { actions, calls } = load();
  expect(await actions.createPersonalTaskAction({ title: "  New   task ", nextStep: "Call tomorrow" })).toEqual({ ok: true });
  expect(calls).toContainEqual(["insert", { owner_id: ownerId, title: "New task", next_step: "Call tomorrow" }]);
  calls.length = 0;
  for (const action of [
    () => actions.savePersonalTaskAction({ id, title: "New title", summary: "Private note", nextStep: "", updatedAt }),
    () => actions.setPersonalTaskStatusAction({ id, status: "completed", updatedAt }),
    () => actions.setPersonalTaskStatusAction({ id, status: "archived", updatedAt }),
    () => actions.setPersonalTaskStatusAction({ id, status: "open", updatedAt }),
  ]) {
    expect(await action()).toEqual({ ok: true });
    expect(calls).toContainEqual(["from", "personal_dashboard_tasks"]);
    expect(calls).toContainEqual(["eq", "owner_id", ownerId]);
    expect(calls).toContainEqual(["eq", "id", id]);
    expect(calls).toContainEqual(["eq", "updated_at", updatedAt]);
    expect(calls).toContainEqual(["revalidate", personal.PERSONAL_DASHBOARD_PATH]);
    calls.length = 0;
  }
});

test("bad input is rejected and stale or foreign records cannot report success", async () => {
  const { actions, calls } = load();
  expect((await actions.createPersonalTaskAction({ title: "x" })).ok).toBe(false);
  expect((await actions.savePersonalTaskAction({ id, title: "Valid title", summary: "x".repeat(501), nextStep: "", updatedAt })).ok).toBe(false);
  expect((await actions.setPersonalTaskStatusAction({ id, status: "open", updatedAt: "invalid" })).ok).toBe(false);
  expect(calls).toEqual([]);
  const stale = load(true, true, false);
  expect((await stale.actions.savePersonalTaskAction({ id, title: "Valid title", summary: "", nextStep: "", updatedAt })).ok).toBe(false);
  expect((await stale.actions.setPersonalTaskStatusAction({ id, status: "completed", updatedAt })).ok).toBe(false);
  expect(stale.calls.some(([call]) => call === "revalidate")).toBe(false);
});
