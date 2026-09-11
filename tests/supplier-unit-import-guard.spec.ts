import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import ts from "typescript"
import { effectiveRequestComparisonItems, matchSupplierQuoteItems, planRequestComparisonSync, requestItemSpecification } from "../lib/supplier-quote-routing"
import { supplierQuoteUnitBasisIssue } from "../lib/supplier-quote-safety"

const itemId = "11111111-1111-4111-8111-111111111111"
const targetId = "22222222-2222-4222-8222-222222222222"

async function blockedImport(sourceUnit: string | null, requestUnit: string | null, savedUnit = "each", linkedRequest = true) {
  const text = await readFile("app/admin/supplier-quotes/actions.ts", "utf8")
  const source = "export " + text.slice(text.indexOf("async function createComparisonFromQuote("), text.indexOf("export async function sendSupplierQuoteToComparisonAction("))
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const writes: string[] = []
  const reads: string[] = []
  const supplierRow = { id: itemId, description: "Valve", specification: "4 in", unit: sourceUnit, quantity: 2, unit_price: 12, line_total: 24, review_status: "ready", comparison_item_id: targetId }
  const quote = { id: "quote", status: "ready", supplier_id: "vendor", comparison_id: "comparison", client_id: "client" }
  const requestRow = { id: "source", name: "Valve", quantity: 12, unit: requestUnit, department: "4 in", metadata: {} }
  const existing = { id: targetId, source_request_item_id: "source", description: "Valve", specification: "4 in", quantity: 12, unit: savedUnit, sort_order: 0 }
  const tables: Record<string, unknown> = {
    supplier_quote_items: [supplierRow],
    quote_comparisons: { id: "comparison", request_id: linkedRequest ? "request" : null, client_id: "client", status: "draft" },
    quote_request_items: [requestRow],
    quote_comparison_items: [existing],
  }
  const supabase = { from(table: string) {
    reads.push(table)
    const query = {
      select: () => query, eq: () => query, in: () => query, order: () => query,
      update: () => { writes.push(`update:${table}`); return query },
      insert: () => { writes.push(`insert:${table}`); return query },
      delete: () => { writes.push(`delete:${table}`); return query },
      maybeSingle: async () => ({ data: tables[table], error: null }),
      returns: async () => ({ data: tables[table], error: null }),
    }
    return query
  }, rpc: async () => { throw new Error("Unexpected mutation-stage RPC") } }
  const exports: { createComparisonFromQuote?: (id: string, ids: string[], client: boolean) => Promise<{ ok: boolean; error?: string }> } = {}
  new Function("exports", "loadQuote", "UUID_PATTERN", "supplierQuoteUnitBasisIssue", "effectiveRequestComparisonItems", "matchSupplierQuoteItems", "planRequestComparisonSync", "requestItemSpecification", "clean", compiled)(exports,
    async () => ({ supabase, quote, user: { id: "staff" } }), /^[0-9a-f-]{36}$/i, supplierQuoteUnitBasisIssue, effectiveRequestComparisonItems, matchSupplierQuoteItems, planRequestComparisonSync, requestItemSpecification, (value: string) => value)
  const result = await exports.createComparisonFromQuote!("quote", [itemId], false)
  return { result, writes, reads }
}

test("unknown supplier unit blocks before comparison lookup or any writes", async () => {
  const { result, writes, reads } = await blockedImport(null, "each")
  expect(result.ok).toBe(false)
  expect(result.error).toContain("unknown unit")
  expect(writes).toEqual([])
  expect(reads).toEqual(["supplier_quote_items"])
})

test("request unit mismatch is rejected before sync parks or rewrites existing prices", async () => {
  const { result, writes } = await blockedImport("each", "sheet", "each")
  expect(result.ok).toBe(false)
  expect(result.error).toContain("selling units differ")
  expect(writes).toEqual([])
})

test("missing current request unit does not inherit stale comparison each", async () => {
  const { result, writes } = await blockedImport("each", null, "each")
  expect(result.ok).toBe(false)
  expect(result.error).toContain("unknown unit")
  expect(writes).toEqual([])
})

test("standalone existing comparison unit mismatch blocks before bid or price writes", async () => {
  const { result, writes } = await blockedImport("each", "each", "sheet", false)
  expect(result.ok).toBe(false)
  expect(result.error).toContain("selling units differ")
  expect(writes).toEqual([])
})

test("compatible known per-piece units can reach the unchanged supplier-stage path", async () => {
  // The sentinel stops this read-only mock exactly where normal import continues.
  await expect(blockedImport("each", "each", "each", false)).rejects.toThrow("Unexpected mutation-stage RPC")
})

test("integration does not adopt draft availability schema or change price replacement semantics", async () => {
  const source = await readFile("app/admin/supplier-quotes/actions.ts", "utf8")
  expect(source).not.toContain("availability_status")
  expect(source).not.toContain("approvedMatches")
  expect(source).toContain("const matched = unitCheckedMatches")
  expect(source.indexOf("const unitCheckedMatches")).toBeLessThan(source.indexOf("const priceRows = matched.map"))
})
