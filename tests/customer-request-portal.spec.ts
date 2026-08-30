import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

import { isExplicitCustomerRequestConfirmation } from "@/lib/customer-request-confirmation"

const root = process.cwd()

test("only explicit confirmations can complete an exact pending SMS summary", async () => {
  expect(isExplicitCustomerRequestConfirmation("YES")).toBe(true)
  expect(isExplicitCustomerRequestConfirmation("כן")).toBe(true)
  expect(isExplicitCustomerRequestConfirmation("Sí")).toBe(true)
  expect(isExplicitCustomerRequestConfirmation("yes, but change it to 12")).toBe(false)
  expect(isExplicitCustomerRequestConfirmation("cancel")).toBe(false)

  const broker = await readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8")
  expect(broker).toContain("aura_sms_request_pending_confirmations")
  expect(broker).toContain("summary_hash")
  expect(broker).toContain("summary_sent_at is not null")
  expect(broker).toContain("if (!pending) return null")
  expect(broker).toContain("if (await confirmPendingSmsRequest(communicationId, phone, body)) return")
  expect(broker).toContain("sql.begin")
  expect(broker).toContain("customer_request_portal_invite_outbox")
  expect(broker).toContain("await sendQuoSms(phone, outbox[0].message)")
  expect(broker).toContain("phone_confirm: true")
  expect(broker).toContain("where phone = ${phone} and phone_confirmed_at is not null")
  expect(broker).not.toContain("@phone-login.buildflow.local")
  expect(broker).toContain("and status in ('pending', 'failed')")
})

test("request numbers and portal ownership are enforced in the database", async () => {
  const migration = await readFile(path.join(root, "supabase/migrations/20260830051352_customer_request_portal_access.sql"), "utf8")
  expect(migration).toContain("minvalue 100000")
  expect(migration).toContain("maxvalue 999999")
  expect(migration).toContain("no cycle")
  expect(migration).toContain("quote_requests_public_number_uidx")
  expect(migration).toContain("request_public_number_is_immutable")
  expect(migration).toContain("customer_request_portal_access_owner_read")
  expect(migration).toContain("(select auth.uid()) = claimed_by")
  expect(migration).toContain("auth.jwt() ->> 'phone'")
  expect(migration).not.toContain("to anon\nusing ( true )")
})

test("customer portal returns a minimal server-only view and uses phone OTP", async () => {
  const [portal, otp, pageSource, accountActions] = await Promise.all([
    readFile(path.join(root, "lib/customer-request-portal.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/customer-request-otp.tsx"), "utf8"),
    readFile(path.join(root, "app/requests/page.tsx"), "utf8"),
    readFile(path.join(root, "app/account/actions.ts"), "utf8"),
  ])
  expect(portal).toContain('import "server-only"')
  expect(portal).toContain('select("id,public_number,title,status,updated_at")')
  expect(portal).toContain('select("id,request_id,name,quantity,unit,qualification_status")')
  expect(portal).not.toContain("supplier_packages")
  expect(portal).not.toContain("manager_notes")
  expect(otp).toContain('"/api/auth/phone/send"')
  expect(otp).toContain('"/api/auth/phone/verify"')
  expect(otp).not.toContain('type="password"')
  expect(otp).toContain("A request number alone never grants access")
  expect(pageSource).toContain("customer-visible details only")
  expect(accountActions).toContain("updateUserById(user.id")
  expect(accountActions).toContain("phone_confirm: true")
})

test("OTP portal works on desktop and mobile without asking for a password", async ({ page }) => {
  const calls: Array<Record<string, string>> = []
  await page.route("**/api/auth/phone/send", async (route) => {
    calls.push(await route.request().postDataJSON())
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
  })
  await page.route("**/api/auth/phone/verify", async (route) => {
    calls.push(await route.request().postDataJSON())
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
  })
  await page.goto("/requests")
  await page.waitForLoadState("networkidle")
  await expect(page.getByRole("heading", { name: "Open your request" })).toBeVisible()
  await expect(page.locator('input[type="password"]')).toHaveCount(0)
  await page.getByLabel("Phone number").fill("516 555 1234")
  await page.getByRole("button", { name: "Send secure code" }).click()
  await page.getByLabel("One-time code").fill("123456")
  await page.getByRole("button", { name: "Open my requests" }).click()
  expect(calls[0]).toEqual({ phone: "+15165551234" })
  expect(calls[1]).toEqual({ phone: "+15165551234", token: "123456" })
})
