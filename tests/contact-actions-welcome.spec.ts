import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()
test("Carlos sends one approved welcome through the idempotent communication outbox", async () => {
  const [actions, broker] = await Promise.all([
    readFile(path.join(root, "components/buildflow/contact-actions.tsx"), "utf8"),
    readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
  ])

  expect(actions).toContain("Carlos from Avantia Build. Send us any material list, quote, photo, plan, or hard-to-find item.")
  expect(actions).toContain("We’ll check pricing, availability, and delivery for you. See how it works: https://build.avantiap.com")
  expect(actions).toContain("Send Welcome Package")
  expect(actions).toContain("Exact message preview")
  expect(actions).toContain("setIsWelcomePackage(value === \"welcome\")")
  expect(actions).toContain("isWelcomePackage && channel !== \"email\"")
  expect(actions).toContain('`welcome/${normalizedPhone.replace(/\\D/g, "")}`')
  expect(actions).toContain("idempotencyKey: welcomeIdempotencyKey")
  expect(broker).toContain("public.enqueue_aura_message_outbox(")
  expect(broker).toContain("sms_ai_bare_greeting_suppressed")
  expect(broker).toContain('route: "manager-welcome-only"')
})
