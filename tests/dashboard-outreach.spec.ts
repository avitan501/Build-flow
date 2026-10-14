import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { expect, test } from "@playwright/test";
import * as outreach from "@/lib/dashboard-outreach";
import type { DashboardOutreachLead } from "@/lib/dashboard-outreach";

type Actions = typeof import("@/app/admin/goals-progress/website-work/actions");
const contact = (input: Partial<DashboardOutreachLead> = {}): DashboardOutreachLead => ({
  id: "fixture", full_name: "Sample Contractor", company_name: null, email: null, phone: "(212) 555-0123", notes: null,
  status: "new", preferred_language: "en", relationship_level: 5, ...input,
});

function readAction(rows: DashboardOutreachLead[], failPage = -1) {
  const ranges: number[][] = [];
  const dependencies: Record<string, unknown> = {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "fixture" }) }) },
    "next/cache": {}, "@/lib/aura/trusted-owner-phones": {}, "@/lib/supabase/admin": {},
    "@/app/admin/goals-progress/goal-actions": {}, "@/lib/manager-goal-status": {},
    "@/lib/dashboard-outreach": outreach,
    "@/lib/website-work-access": { verifyWebsiteWorkToken: () => true },
    "@/lib/auth": { requireManagerPortalProfile: async () => ({ access: { owner: true }, user: { id: "owner" }, supabase: {
      from(table: string) {
        expect(table).toBe("manager_outreach_leads");
        let start = 0, end = 0;
        const query = {
          select: () => query, order: () => query,
          range: (a: number, b: number) => { start = a; end = b; ranges.push([a, b]); return query; },
          returns: async () => ranges.length - 1 === failPage ? { data: null, error: { code: "FAIL" } } : { data: rows.slice(start, end + 1), error: null },
        };
        return query;
      },
    } }) },
  };
  const output = ts.transpileModule(fs.readFileSync("app/admin/goals-progress/website-work/actions.ts", "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: (name: string) => { if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`); return dependencies[name]; } });
  return { read: (exports as Actions).getDashboardOutreachLeadsAction, ranges };
}

test("loads all pages, excludes only explicitly internal test contacts, and preserves email-only leads", async () => {
  const rows = Array.from({ length: 501 }, (_, index) => contact({ id: String(index), full_name: `Person ${index}` }));
  rows[0] = contact({ id: "internal", notes: "Internal test lead for verification. Do not use for outreach." });
  rows[500] = contact({ id: "email-only", full_name: "Alpha Architecture", phone: null, email: "example@example.test" });
  const { read, ranges } = readAction(rows);
  const result = await read();
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error);
  expect(ranges).toEqual([[0, 499], [500, 999]]);
  expect(result.leads).toHaveLength(500);
  expect(result.excludedCount).toBe(1);
  expect(result.leads[0].id).toBe("email-only");
  expect(result.leads.some((lead) => lead.id === "internal")).toBe(false);
});

test("a failed later page reports failure instead of presenting a partial list as all contacts", async () => {
  const { read } = readAction(Array.from({ length: 501 }, () => contact()), 1);
  expect(await read()).toMatchObject({ ok: false, error: expect.stringContaining("try again") });
});

test("empty lead directory is a successful empty result", async () => {
  expect(await readAction([]).read()).toEqual({ ok: true, leads: [], excludedCount: 0 });
});

test("normalizes US phones and never creates a call target for missing or invalid numbers", () => {
  expect(outreach.outreachPhone(contact())).toEqual({ label: "(212) 555-0123", href: "tel:+12125550123" });
  expect(outreach.outreachPhone(contact({ phone: null }))).toBeNull();
  expect(outreach.outreachPhone(contact({ phone: "123" }))).toBeNull();
  expect(outreach.outreachPhone(contact({ phone: "+442079460958" }))?.href).toBe("tel:+442079460958");
});

test("search finds names, companies, and differently formatted phones", () => {
  expect(outreach.matchesOutreachSearch(contact(), "CONTRACTOR")).toBe(true);
  expect(outreach.matchesOutreachSearch(contact(), "212-555-0123")).toBe(true);
  expect(outreach.matchesOutreachSearch(contact({ company_name: "North Build" }), "north")).toBe(true);
  expect(outreach.matchesOutreachSearch(contact(), "Missing company")).toBe(false);
});

test("contact links reach the correct department with encoded search text", () => {
  const url = new URL(outreach.outreachContactHref(contact({ relationship_level: 3, phone: null, email: "plans+quotes@example.test" })), "https://example.test");
  expect(url.pathname).toBe("/admin/users");
  expect(url.searchParams.get("department")).toBe("3");
  expect(url.searchParams.get("q")).toBe("plans+quotes@example.test");
  expect(outreach.isInternalOutreachLead(contact({ notes: "Test pricing with this supplier" }))).toBe(false);
});
