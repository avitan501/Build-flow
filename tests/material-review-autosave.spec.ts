import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"
import ts from "typescript"
import { materialReviewChoiceUpdate } from "../lib/material-review-recommendations"
import { createClient } from "@supabase/supabase-js"

const item = { id: "11111111-1111-1111-1111-111111111111", name: "CDX plywood", department: "Lumber", quantity: 60, unit: "sheets", metadata: { ai_organized: true, thickness: "5/8", review_reasons: ["Sheet size is missing"], supplier_route_names: ["Existing supplier"] } }
const input = { requestId: "22222222-2222-2222-2222-222222222222", itemId: item.id, field: "dimensions", value: "4 x 8 ft." }

async function runAction(saveResult: { data: unknown; error: unknown }, denied = false) {
  const source = await readFile(path.join(process.cwd(), "app/owner/materials/requests/actions.ts"), "utf8")
  const action = "export async function saveMaterialReviewChoiceAction" + source.split("export async function saveMaterialReviewChoiceAction")[1].split("export async function updateOrganizedMaterialItemAction")[0]
  const js = ts.transpileModule(action, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const updates: unknown[] = []
  const filters: unknown[] = []
  let reads = 0
  const query = { select: () => query, update: (value: unknown) => { updates.push(value); return query }, eq: (key: string, value: unknown) => { filters.push([key, value]); return query }, maybeSingle: async () => ++reads === 1 ? { data: item } : saveResult }
  const exports: { saveMaterialReviewChoiceAction?: (value: typeof input) => Promise<{ ok: boolean; item?: typeof item }> } = {}
  new Function("exports", "requireStaffProfile", "materialReviewChoiceUpdate", "revalidatePath", js)(exports, async () => {
    if (denied) throw new Error("Forbidden")
    return { supabase: { from: () => query }, user: { id: "staff" } }
  }, materialReviewChoiceUpdate, () => {})
  return { result: await exports.saveMaterialReviewChoiceAction!(input), updates, filters }
}

test("field-only action preserves current thickness, routing, quantity and request boundaries", async () => {
  const { result, updates, filters } = await runAction({ data: { id: item.id }, error: null })
  expect(result.ok).toBe(true)
  expect(result.item?.metadata.thickness).toBe("5/8")
  expect(result.item?.quantity).toBe(60)
  expect(updates).toHaveLength(1)
  expect(Object.keys(updates[0] as object).sort()).toEqual(["metadata", "qualification_status"])
  expect(result.item?.metadata.supplier_route_names).toEqual(["Existing supplier"])
  expect(filters).toContainEqual(["metadata", JSON.stringify(item.metadata)])
  expect(filters.filter((entry) => (entry as string[])[0] === "request_id")).toHaveLength(2)
})

test("stale-row zero match and database error are not reported saved", async () => {
  expect((await runAction({ data: null, error: null })).result.ok).toBe(false)
  expect((await runAction({ data: null, error: { message: "database failure" } })).result.ok).toBe(false)
  await expect(runAction({ data: null, error: null }, true)).rejects.toThrow("Forbidden")
})

test("Supabase serializes metadata equality without changing its JSON payload", async () => {
  let captured: URL | undefined
  const client = createClient("https://example.supabase.co", "test-public-key", { auth: { persistSession: false }, global: { fetch: async (url) => {
    captured = new URL(String(url))
    return new Response(JSON.stringify([{ id: item.id }]), { status: 200, headers: { "Content-Type": "application/json" } })
  } } })
  const result = await client.from("quote_request_items").update({ metadata: item.metadata }).eq("metadata", JSON.stringify(item.metadata)).select("id").maybeSingle()
  expect(result.error).toBeNull()
  expect(captured?.searchParams.get("metadata")).toBe(`eq.${JSON.stringify(item.metadata)}`)
})

test("review autosave requires deliberate choice and preserves failed values for retry", async () => {
  const source = await readFile(path.join(process.cwd(), "components/buildflow/material-review-editor.tsx"), "utf8")
  expect(source).toContain('useState<Record<string, string>>({})')
  expect(source).toContain('<option value="" disabled>Choose…</option>')
  expect(source).toContain('onChange={(event) => save(choice.field, event.target.value)}')
  expect(source).toContain("if (!value || saving.current) return")
  expect(source).toContain("setFailed({ field, value })")
  expect(source).toContain("Retry save")
  expect(source).not.toContain("Apply")
  expect(source).not.toContain("useEffect")
})

test("review action updates current-row metadata only and retains staff, request and stale-row guards", async () => {
  const source = await readFile(path.join(process.cwd(), "app/owner/materials/requests/actions.ts"), "utf8")
  const action = source.split("export async function saveMaterialReviewChoiceAction")[1].split("export async function updateOrganizedMaterialItemAction")[0]
  expect(action).toContain('requireStaffProfile("customers")')
  expect(action).toContain('eq("request_id", requestId)')
  expect(action).toContain('eq("metadata", JSON.stringify(item.metadata))')
  expect(action).toContain("if (error || !saved)")
  expect(action).toContain("materialReviewChoiceUpdate(item, field, value)")
  expect(action).toContain('.update({ metadata, qualification_status:')
  expect(action).not.toMatch(/update\(\{ (?:name|quantity|unit)|createAdminClient|send[A-Z]/)
})
