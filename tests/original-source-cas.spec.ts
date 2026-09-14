import { expect, test } from "@playwright/test"
import { readFileSync } from "node:fs"
import ts from "typescript"
import { canonicalItemValue, itemEditSnapshot } from "../lib/request-item-continuity"
import { requestItemFieldsMetadata } from "../lib/request-item-fields"
import type { saveOriginalMaterialItemAction } from "../app/owner/materials/requests/actions"

const requestId = "11111111-1111-4111-8111-111111111111"
const itemId = "22222222-2222-4222-8222-222222222222"
const current = { id: itemId, name: "Free-text material list", department: "Framing", quantity: 1, unit: "request", qualification_status: "not_required", metadata: { request_details: "Old original", source_file_change: { revision: "original-file" } } }
const source = readFileSync("app/owner/materials/requests/actions.ts", "utf8")
const body = source.slice(source.indexOf("export async function saveOriginalMaterialItemAction"), source.indexOf("export async function moveRequestItemDepartmentAction"))
const compiled = ts.transpileModule(body, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText

function harness(options: { stale?: boolean; race?: boolean; dbError?: boolean; childError?: boolean } = {}) {
  let rpcCalls = 0, writes = 0
  let patch: Record<string, unknown> | null = null
  const child = { id: "child", quantity: 20, unit: "sheets", metadata: { ai_organized: true, manually_reviewed_at: "reviewed", dimensions: "4x8" } }
  const before = JSON.stringify(child)
  const supabase = { from(table: string) { const q = {
    select() { return q }, eq() { return q }, contains() { return q },
    async maybeSingle() { return { data: table === "quote_requests" ? { id: requestId, project_id: "project", owner_id: "owner" } : options.stale ? { ...current, metadata: { ...current.metadata, request_details: "Coworker original" } } : current } },
    async returns() { return { data: [child], error: options.childError ? { message: "unavailable" } : null } },
    update() { throw new Error("Blind update forbidden") },
  }; return q } }
  const exported = {} as { saveOriginalMaterialItemAction: typeof saveOriginalMaterialItemAction }
  new Function("exports", "requireStaffProfile", "createAdminClient", "requestItemFieldsMetadata", "canonicalItemValue", "itemEditSnapshot", "randomUUID", "revalidatePath", compiled)(exported,
    async (capability: string) => { expect(capability).toBe("customers"); return { supabase, user: { id: "actor" } } },
    () => ({ rpc: async (name: string, input: Record<string, unknown>) => {
      rpcCalls++; expect(name).toBe("staff_apply_request_item_edit"); expect(input.p_expected).toEqual(itemEditSnapshot(current));
      expect(input.p_source_id).toBeNull(); expect(input.p_undo).toBe(false); expect(input.p_item_id).toBe(itemId);
      if (options.dbError) return { error: { message: "unavailable" }, data: null }
      if (options.race) return { error: null, data: { ok: false, conflict: true } }
      writes++; patch = input.p_patch as Record<string, unknown>; return { error: null, data: { ok: true } }
    } }), requestItemFieldsMetadata, canonicalItemValue, itemEditSnapshot, () => "receipt", () => {})
  return { action: exported.saveOriginalMaterialItemAction, state: () => ({ rpcCalls, writes, patch, childUntouched: before === JSON.stringify(child) }) }
}
const payload = () => ({ requestId, itemId, name: current.name, quantity: 2, unit: "request", details: "First line\nSecond line", expectedItemSnapshot: itemEditSnapshot(current) })

test("missing or stale displayed source refuses save before RPC", async () => {
  for (const stale of [false, true]) {
    const h = harness({ stale })
    expect(await h.action({ ...payload(), ...(stale ? {} : { expectedItemSnapshot: undefined }) })).toMatchObject({ ok: false, conflict: true })
    expect(h.state()).toMatchObject({ writes: 0, rpcCalls: 0 })
  }
})
test("write-time CAS race is a conflict and never changes the organized child", async () => {
  const h = harness({ race: true })
  expect(await h.action(payload())).toMatchObject({ ok: false, conflict: true })
  expect(h.state()).toMatchObject({ rpcCalls: 1, writes: 0, childUntouched: true })
})
test("raw source keeps20k multiline and fields, source marked changed but reviewed child untouched", async () => {
  const h = harness()
  const details = "First line\n" + "x".repeat(19_989)
  expect(details.length).toBe(20_000)
  expect(await h.action({ ...payload(), details, fields: [{ id: "custom-1", label: "Manager field", value: "Keep me" }] })).toMatchObject({ ok: true })
  expect(h.state()).toMatchObject({ writes: 1, childUntouched: true, patch: { quantity: 2, metadata: { request_details: details, ai_organization_status: "draft_changed", source_file_change: { revision: "original-file" } } } })
  expect(JSON.stringify(h.state().patch)).toContain("Keep me")
})
test("database or linked-row read failure returns not-saved without writes", async () => {
  for (const options of [{ dbError: true }, { childError: true }]) {
    const h = harness(options); expect(await h.action(payload())).toMatchObject({ ok: false }); expect(h.state().writes).toBe(0)
  }
})
test("editor captures expected snapshot on open and retains draft on failed result", () => {
  const editor = readFileSync("components/buildflow/original-request-item-editor.tsx", "utf8")
  expect(editor).toContain("setExpectedItemSnapshot(item ? itemEditSnapshot(item) : undefined)")
  expect(editor).toContain("fields: value.fields, expectedItemSnapshot: expectedRef.current")
  expect(editor).toContain("if (!result.ok) { setFeedback(result.error); return }")
})
