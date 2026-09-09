import { expect, test } from "@playwright/test";
import { readFile, access } from "node:fs/promises";
import capabilities from "@/data/business-blueprint.json";

test("capability inventory has unique short titles and real evidence", async()=>{
  expect(capabilities.length).toBeGreaterThanOrEqual(150);
  expect(capabilities.length).toBeLessThanOrEqual(200);
  expect(new Set(capabilities.map(e=>e.id)).size).toBe(capabilities.length);
  expect(new Set(capabilities.map(e=>e.title)).size).toBe(capabilities.length);
  for(const entry of capabilities){
    expect(entry.title.split(/\s+/).length).toBeLessThanOrEqual(3);
    expect(`blueprint-${entry.id}`.length).toBeLessThanOrEqual(80);
    await access(entry.source);
  }
});

test("private notes use owner authorization and cannot publish to staff", async()=>{
  const action=await readFile("app/admin/build-map/blueprint-actions.ts","utf8");
  expect(action.indexOf("await requireOwnerAccess")).toBeLessThan(action.indexOf('supabase.from("website_work_items")'));
  expect(action).toContain("published_to_carlos: false");
  expect(action).toContain('onConflict: "task_key"');
  const page=await readFile("app/admin/build-map/page.tsx","utf8");
  expect(page).toContain('view === "blueprint" && access.owner');
});
