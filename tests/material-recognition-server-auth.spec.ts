import { test, expect } from "@playwright/test"
import { authorizedRecognitionServer } from "../supabase/functions/material-row-recognition/server-auth"

test("recognition accepts only configured server keys, modern or legacy", () => {
  const keys: Record<string, string> = {
    SUPABASE_SERVICE_ROLE_KEY: "legacy-test-key",
    SUPABASE_SECRET_KEYS: JSON.stringify({ default: "sb_secret_example" }),
  }
  const env = (name: string) => keys[name]
  expect(authorizedRecognitionServer(new Headers({ apikey: "sb_secret_example" }), env)).toBe(true)
  expect(authorizedRecognitionServer(new Headers({ authorization: "Bearer legacy-test-key" }), env)).toBe(true)
  for (const headers of [{}, { apikey: "anon" }, { apikey: "sb_secret_wrong" }, { authorization: "Bearer forged-role-admin" }]) {
    expect(authorizedRecognitionServer(new Headers(headers), env)).toBe(false)
  }
})

test("missing or malformed server configuration fails closed", () => {
  expect(authorizedRecognitionServer(new Headers({ apikey: "anything" }), () => undefined)).toBe(false)
  expect(authorizedRecognitionServer(new Headers({ apikey: "anything" }), name => name === "SUPABASE_SECRET_KEYS" ? "bad-json" : undefined)).toBe(false)
})
