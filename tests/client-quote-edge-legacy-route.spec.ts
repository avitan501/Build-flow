import { expect, test } from "@playwright/test"
import { readFileSync } from "node:fs"
import ts from "typescript"

async function legacyAttempt(activeRoute: string | null) {
  const source = readFileSync("supabase/functions/send-supplier-quote/index.ts", "utf8").replace(/^import .*$/gm, "")
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  let handler: (request: Request) => Promise<Response> = async () => new Response(null, { status: 500 })
  let providerCalls = 0, attachmentReads = 0
  const queried: string[] = []
  const admin = {
    auth: { getUser: async () => ({ data: { user: { id: "11111111-1111-4111-8111-111111111111", email: "avitanneto@gmail.com" } } }) },
    from(table: string) {
      queried.push(table)
      const data = table === "profiles" ? { role: "admin", approval_status: "approved", is_active: true }
        : table === "quote_comparisons" ? { id: "22222222-2222-4222-8222-222222222222", awarded_bid_id: "historical-bid", active_route_id: activeRoute, client_email_snapshot: "qa@example.invalid" }
          : table === "staff_access_grants" ? null : []
      const query = { select: (_fields: string) => query, eq: () => query, ilike: () => query, maybeSingle: async () => ({ data }), order: async () => ({ data, error: null }) }
      return query
    },
    storage: { from: () => ({ download: async () => { attachmentReads++; throw Error("Unexpected attachment read") } }) },
  }
  new Function("createClient", "Deno", "fetch", code)(() => admin, {
    env: { get: (name: string) => ({ SUPABASE_URL: "https://example.invalid", SUPABASE_SERVICE_ROLE_KEY: "fixture-service", RESEND_API_KEY: "fixture-provider" } as Record<string, string>)[name] },
    serve: (callback: typeof handler) => { handler = callback },
  }, () => { providerCalls++; throw Error("Provider calls forbidden") })
  const response = await handler(new Request("https://example.invalid/functions/v1/send-supplier-quote", {
    method: "POST", headers: { authorization: "Bearer fixture-user", "content-type": "application/json" },
    body: JSON.stringify({ action: "send_client_quote", requestId: "22222222-2222-4222-8222-222222222222", deliveryId: "33333333-3333-4333-8333-333333333333", attachment: { filename: "fixture.pdf", content: "fixture" } }),
  }))
  return { response, body: await response.json(), queried, providerCalls, attachmentReads }
}

test("omitting routeId cannot bypass a mixed claim through a historical awarded bid", async () => {
  const result = await legacyAttempt("44444444-4444-4444-8444-444444444444")
  expect(result.response.status).toBe(409)
  expect(result.body.error).toBe("mixed_quote_requires_route_claim")
  expect(result.queried).not.toContain("quote_comparison_client_attachments")
  expect(result.providerCalls).toBe(0)
  expect(result.attachmentReads).toBe(0)
})

test("single-bid quote without active mixed route retains the legacy validation path", async () => {
  const result = await legacyAttempt(null)
  expect(result.body.error).toBe("client_prices_incomplete")
  expect(result.queried).toContain("quote_comparison_items")
  expect(result.providerCalls).toBe(0)
})
