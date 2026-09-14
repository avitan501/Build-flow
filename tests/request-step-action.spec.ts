import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import ts from "typescript"

const input = { requestId: "11111111-1111-1111-1111-111111111111", step: 1, revision: 2, patch: { note: "Private note" } }
async function run(patch: object = input.patch, options: { conflict?: boolean; denied?: boolean; invalidCompletion?: boolean; revision?: number } = {}) {
  const source = await readFile("app/owner/materials/requests/actions.ts", "utf8")
  const action = "export async function updateRequestWorkflowStepDetailsAction" + source.split("export async function updateRequestWorkflowStepDetailsAction")[1].split("export async function updateRequestSubstepAction")[0]
  const js = ts.transpileModule(action, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const writes: unknown[] = [], filters: unknown[] = [], tables: string[] = []
  let validations = 0
  const record = { request_id: input.requestId, step: 1, assignee: "carlos", note: "Private note", completed_override: null, revision: 3 }
  const query = { select: () => query, eq: (key: string, value: unknown) => { filters.push([key, value]); return query }, update: (value: unknown) => { writes.push(value); return query }, insert: (value: unknown) => { writes.push(value); return query }, maybeSingle: async () => tables.at(-1) === "quote_requests" ? { data: { id: input.requestId, manager_assignee: "carlos" } } : { data: options.conflict ? null : record, error: null } }
  const exports: Record<string, (value: unknown) => Promise<{ ok: boolean; error?: string }>> = {}
  new Function("exports", "requireStaffProfile", "updateRequestWorkflowStepAction", "revalidatePath", js)(exports, async () => { if (options.denied) throw new Error("Forbidden"); return { supabase: { from: (table: string) => { tables.push(table); return query } }, user: { id: "staff" } } }, async () => { validations++; return options.invalidCompletion ? { ok: false, error: "Missing proof" } : { ok: true } }, () => {})
  return { result: await exports.updateRequestWorkflowStepDetailsAction({ ...input, revision: options.revision ?? input.revision, patch }), writes, filters, tables, validations }
}
test("note autosave uses staff-private table and revision filter without public audit writes", async () => {
  const result = await run()
  expect(result.result.ok).toBe(true)
  expect(result.tables).toEqual(["quote_requests", "request_workflow_steps"])
  expect(result.filters).toContainEqual(["revision", 2])
  expect(result.validations).toBe(0)
  expect(result.writes[0]).toMatchObject({ note: "Private note", revision: 3, updated_by: "staff" })
})
test("completion requires existing proof validation before any private write", async () => {
  const failed = await run({ completed_override: true }, { invalidCompletion: true })
  expect(failed.result.ok).toBe(false)
  expect(failed.writes).toEqual([])
  expect(failed.validations).toBe(1)
})
test("conflict and denied authorization never report saved", async () => {
  expect((await run(undefined, { conflict: true })).result.ok).toBe(false)
  await expect(run(undefined, { denied: true })).rejects.toThrow("Forbidden")
})
test("rejects invalid fields and note limits before storage", async () => {
  for (const patch of [{ note: "x".repeat(2001) }, { assignee: "unknown" }, { completed_override: "true" }, { status: "quoted" }]) expect((await run(patch)).writes).toEqual([])
})
