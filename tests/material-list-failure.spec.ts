import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import { completedMaterialListOutput, MaterialListFailure, materialListFailureCode, safeMaterialListFailure, validMaterialListOutput } from "../supabase/functions/_shared/material-list-failure"

const item = {
  name: "2x4 lumber", department: "Lumber", quantity: 3, unit: "each", dimensions: "2x4",
  thickness: "", details: "", sourceText: "3 2x4 lumber", needsReview: true,
  reviewStatus: "check", reviewReasons: ["Confirm length"], attributes: [],
}
const output = { documentType: "material_list", summary: "Lumber", items: [item] }
const response = (value: unknown = output) => ({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(value) }] }] })

test("completed validated material list can continue; plan review remains valid", () => {
  expect(completedMaterialListOutput(response())).toEqual(output)
  expect(completedMaterialListOutput(response({ documentType: "plan", summary: "Needs takeoff", items: [] }))).toEqual({ documentType: "plan", summary: "Needs takeoff", items: [] })
})

test("reject incomplete payload even if its partial JSON is parseable", () => {
  for (const status of ["incomplete", "failed", "in_progress", "queued", undefined]) {
    expect(() => completedMaterialListOutput({ ...response(), status })).toThrow("openai_incomplete")
  }
})

test("refusal, empty output, invalid JSON, wrong shape each have safe codes", () => {
  expect(() => completedMaterialListOutput({ status: "completed", output: [{ content: [{ type: "refusal", refusal: "private explanation" }] }] })).toThrow("openai_refused")
  expect(() => completedMaterialListOutput({ status: "completed", output: [] })).toThrow("openai_empty_output")
  expect(() => completedMaterialListOutput({ status: "completed", output_text: "not json" })).toThrow("openai_invalid_json")
  expect(() => completedMaterialListOutput(response({ items: [item] }))).toThrow("openai_invalid_shape")
})

test("all consumed row fields are validated before persistence", () => {
  for (const invalid of [
    { ...item, name: "" }, { ...item, quantity: -1 }, { ...item, quantity: Infinity },
    { ...item, reviewReasons: null }, { ...item, reviewStatus: "invented" },
    { ...item, attributes: [null] }, { ...item, sourceText: {} },
  ]) expect(validMaterialListOutput({ ...output, items: [invalid] })).toBe(false)
  expect(validMaterialListOutput({ ...output, items: [] })).toBe(false)
  expect(validMaterialListOutput({ ...output, items: Array(301).fill(item) })).toBe(false)
})

test("unknown exception text and payload fields cannot leak through failure codes", () => {
  for (const value of ["sk-secret-value", "SQL customer information", "openai_http_502\nprivate", { secret: "value" }, 502]) {
    expect(safeMaterialListFailure(value)).toBe("organizer_failed")
  }
  expect(safeMaterialListFailure("openai_http_429")).toBe("openai_http_429")
  expect(materialListFailureCode(new Error("private text"))).toBe("organizer_failed")
  expect(materialListFailureCode(new MaterialListFailure("organized_items_insert_failed"))).toBe("organized_items_insert_failed")
  expect(materialListFailureCode(new DOMException("private text", "AbortError"))).toBe("openai_timeout")
})

test("error survives worker finalization without requiring database DDL", async () => {
  const organizer = await readFile("supabase/functions/client-material-list-ai/index.ts", "utf8")
  const worker = await readFile("supabase/functions/client-material-list-worker/index.ts", "utf8")
  const migration = await readFile("supabase/migrations/20260902140536_add_durable_client_material_processing.sql", "utf8")
  expect(organizer).toContain("ai_organization_failure_code: code")
  expect(organizer).toContain("failureCode: code")
  expect(worker).toContain("safeMaterialListFailure(payload.failureCode)")
  expect(migration).toContain("set metadata = coalesce(metadata, '{}'::jsonb) ||")
  expect(migration).toContain("last_error = left(coalesce(nullif(p_error, ''), 'organizer_failed'), 240)")
  expect(migration).toContain("v_status := 'failed'")
  expect(organizer.indexOf("completedMaterialListOutput(payload)")).toBeLessThan(organizer.indexOf('.insert(rows)'))
  expect(organizer.indexOf("completedMaterialListOutput(payload)")).toBeLessThan(organizer.indexOf('.delete().in("id", existing'))
})

test("provider budget covers body read and remains below worker and cron budgets", async () => {
  const organizer = await readFile("supabase/functions/client-material-list-ai/index.ts", "utf8")
  const worker = await readFile("supabase/functions/client-material-list-worker/index.ts", "utf8")
  const migration = await readFile("supabase/migrations/20260902140536_add_durable_client_material_processing.sql", "utf8")
  expect(organizer.indexOf("await response.json()")).toBeLessThan(organizer.indexOf("clearTimeout(openAiTimeout)"))
  expect(organizer).toContain("controller.abort(), 30_000")
  expect(worker).toContain("controller.abort(), 45_000")
  expect(migration).toContain("timeout_milliseconds := 55000")
  expect(organizer).toContain('if (error || !file) throw new MaterialListFailure("attachment_unavailable")')
})
