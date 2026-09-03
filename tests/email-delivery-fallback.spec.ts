import { expect, test } from "@playwright/test"

import { deliverEmailWithSupabaseFallback, type EmailDeliveryAttempt } from "../lib/email-delivery-fallback"

test("uses the Supabase fallback once when website direct email is not configured", async () => {
  let directCalls = 0
  let fallbackCalls = 0

  const result = await deliverEmailWithSupabaseFallback(
    async () => {
      directCalls += 1
      return { status: "not_configured" } as EmailDeliveryAttempt
    },
    async () => {
      fallbackCalls += 1
      return { data: { ok: true, providerId: "fallback-delivery-1" }, error: null }
    },
  )

  expect(result).toEqual({ status: "sent", providerId: "fallback-delivery-1", route: "supabase-fallback" })
  expect(directCalls).toBe(1)
  expect(fallbackCalls).toBe(1)
})

test("returns the truthful fallback error without retrying", async () => {
  let fallbackCalls = 0

  const result = await deliverEmailWithSupabaseFallback(
    async () => ({ status: "not_configured" }),
    async () => {
      fallbackCalls += 1
      return { data: { ok: false, error: "email_provider_not_configured" }, error: null }
    },
  )

  expect(result).toEqual({
    status: "failed",
    error: "Supabase email fallback is not configured.",
    route: "supabase-fallback",
  })
  expect(fallbackCalls).toBe(1)
})

test("surfaces the Edge Function response instead of a generic HTTP wrapper error", async () => {
  const result = await deliverEmailWithSupabaseFallback(
    async () => ({ status: "not_configured" }),
    async () => ({
      data: null,
      error: {
        message: "Edge Function returned a non-2xx status code",
        context: new Response(JSON.stringify({ error: "email_provider_not_configured" }), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
      },
    }),
  )

  expect(result).toEqual({
    status: "failed",
    error: "Supabase email fallback is not configured.",
    route: "supabase-fallback",
  })
})

test("does not fall through after a direct send or an ambiguous direct provider failure", async () => {
  let fallbackCalls = 0
  const fallback = async () => {
    fallbackCalls += 1
    return { data: { ok: true, providerId: "unexpected" }, error: null }
  }

  const sent = await deliverEmailWithSupabaseFallback(
    async () => ({ status: "sent", providerId: "direct-delivery-1" }),
    fallback,
  )
  const failed = await deliverEmailWithSupabaseFallback(
    async () => ({ status: "failed", error: "Direct provider response was ambiguous" }),
    fallback,
  )

  expect(sent).toEqual({ status: "sent", providerId: "direct-delivery-1", route: "website-direct" })
  expect(failed).toEqual({ status: "failed", error: "Direct provider response was ambiguous", route: "website-direct" })
  expect(fallbackCalls).toBe(0)
})

test("reports an unconfirmed or unreachable fallback as a failure", async () => {
  const unconfirmed = await deliverEmailWithSupabaseFallback(
    async () => ({ status: "not_configured" }),
    async () => ({ data: {}, error: null }),
  )
  const unreachable = await deliverEmailWithSupabaseFallback(
    async () => ({ status: "not_configured" }),
    async () => { throw new Error("function timeout") },
  )

  expect(unconfirmed.status).toBe("failed")
  expect(unconfirmed.status === "failed" ? unconfirmed.error : "").toContain("did not confirm delivery")
  expect(unreachable).toEqual({
    status: "failed",
    error: "Supabase email fallback could not be reached: function timeout",
    route: "supabase-fallback",
  })
})
