import { expect, test } from "@playwright/test"
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import ts from "typescript"
import * as continuity from "../lib/request-item-continuity"
import * as notices from "../lib/request-source-file-change"
import * as fields from "../lib/request-item-fields"
import type { saveReviewedRequestItemAction } from "../app/owner/materials/requests/item-edit-actions"
const item = { id: "00000000-0000-4000-8000-000000000020", name: "Plywood", department: "Framing", quantity: 60, unit: "sheets", qualification_status: "pending", metadata: { ai_organized: true, thickness: "5/8" } }
const updated = { ...item, metadata: { ...item.metadata, source_file_change: { revision: "new", event: "insert", file_name: "revised.pdf" } } }
function revision(value: unknown, source: unknown) { return createHash("sha256").update(JSON.stringify({ value, source })).digest("hex") }
const compiled = ts.transpileModule(readFileSync("app/owner/materials/requests/item-edit-actions.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
function harness(timing: "before" | "after" | "unchanged") {
  let reads = 0; let writes = 0
  const supabase = { from() { const query = { select() { return query }, eq() { return query }, async maybeSingle() { reads++; return { data: timing === "before" || (timing === "after" && reads > 1) ? updated : item } } }; return query } }
  const exported = {} as { saveReviewedRequestItemAction: typeof saveReviewedRequestItemAction }
  new Function("exports", "require", compiled)(exported, (id: string) => {
    if (id === "node:crypto") return { randomUUID: () => "00000000-0000-4000-8000-000000000030" }
    if (id === "next/cache") return { revalidatePath() {} }
    if (id === "@/lib/auth") return { requireStaffProfile: async () => ({ supabase, user: { id: "actor" } }) }
    if (id === "@/lib/supabase/admin") return { createAdminClient: () => ({ rpc: async () => { writes++; return { data: { ok: true }, error: null } } }) }
    if (id === "@/lib/request-item-revision") return { requestItemRevision: revision }
    if (id === "@/lib/request-item-continuity") return continuity
    if (id === "@/lib/request-source-file-change") return notices
    if (id === "@/lib/request-item-fields") return fields
    if (id === "@/lib/material-review-recommendations") return { materialReviewChoiceUpdate() { throw new Error("Unexpected quick answer") } }
    throw new Error(`Unexpected dependency ${id}`)
  })
  return { action: exported.saveReviewedRequestItemAction, writes: () => writes }
}
const input = { requestId: "00000000-0000-4000-8000-000000000010", itemId: item.id, revision: revision(item, null), edit: { name: "Plywood", quantity: 61, unit: "sheets", details: "", fields: [] } }
test("upload before action is a conflict without any edit", async () => {
  const h = harness("before"); expect(await h.action(input)).toMatchObject({ ok: false, conflict: true }); expect(h.writes()).toBe(0)
})
test("upload after commit but before readback is not silently acknowledged", async () => {
  const h = harness("after"); const result = await h.action(input)
  expect(result).toMatchObject({ ok: false, conflict: true, item: updated }); expect(result).toHaveProperty("error", expect.stringContaining("saved before a source-file update")); expect(h.writes()).toBe(1)
})
test("unchanged source retains successful normal editing", async () => {
  const h = harness("unchanged"); expect(await h.action(input)).toMatchObject({ ok: true }); expect(h.writes()).toBe(1)
})
