import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

test("proxy forwards refreshed cookies and required private cache headers", async () => {
  const proxySource = await readFile(path.join(process.cwd(), "proxy.ts"), "utf8")

  expect(proxySource).toContain("setAll(cookiesToSet, cacheHeaders)")
  expect(proxySource).toContain("response = NextResponse.next")
  expect(proxySource).toContain("response.headers.set(name, value)")
  expect(proxySource).toContain("supabase.auth.getClaims()")
  expect(proxySource).toContain("function redirectWithAuthState")
  expect(proxySource).toContain("response.cookies.getAll().forEach")
  expect(proxySource.match(/return redirectWithAuthState\(/g)).toHaveLength(3)
  expect(proxySource).not.toContain("supabase.auth.getUser()")
})

test("a stale public session cannot leave the Shop loading fallback stuck", async ({ context, page }) => {
  await context.addCookies([{
    name: "sb-nprfhspwdflpqlopydmp-auth-token",
    value: "stale-invalid-session",
    domain: "127.0.0.1",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  }])

  const response = await page.goto("/shop")

  expect(response?.status()).toBe(200)
  await expect(page.getByRole("heading", { level: 1, name: "Order Construction Materials" })).toBeAttached()
  await expect(page.getByText("Loading shop", { exact: true })).toHaveCount(0)
})

test("a protected-route redirect also clears a stale session", async ({ context, page }) => {
  const staleCookie = {
    name: "sb-nprfhspwdflpqlopydmp-auth-token",
    value: "stale-invalid-session",
    domain: "127.0.0.1",
    path: "/",
    httpOnly: true,
    sameSite: "Lax" as const,
  }
  await context.addCookies([staleCookie])

  await page.goto("/admin/ai-tools")

  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fai-tools/)
  const staleSession = (await context.cookies()).find((cookie) => cookie.name === staleCookie.name)
  expect(staleSession).toBeUndefined()
})
