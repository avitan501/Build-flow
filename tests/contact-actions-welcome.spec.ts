import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()
test("Carlos sends one approved welcome through the correct channel", async () => {
  const [actions, serverActions, broker, worker, migration] = await Promise.all([
    readFile(path.join(root, "components/buildflow/contact-actions.tsx"), "utf8"),
    readFile(path.join(root, "app/owner/aura/actions.ts"), "utf8"),
    readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
    readFile(path.join(root, "supabase/functions/aura-communication-outbox-worker/index.ts"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260904040000_add_ordered_message_packages.sql"), "utf8"),
  ])
  const marketingTemplate = broker.slice(
    broker.indexOf("async function sendWhatsAppMarketingTemplate"),
    broker.indexOf("async function sendWhatsApp(", broker.indexOf("async function sendWhatsAppMarketingTemplate")),
  )

  expect(actions).toContain("Carlos from Avantia Build. We compare construction material quotes, negotiate supplier pricing, and coordinate delivery.")
  expect(actions).toContain("Send me whatever you have—a material list, photo, plan, or another supplier’s quote. We’ll work from there.")
  expect(actions).toContain("Send Welcome Package")
  expect(actions).toContain("Message 1 of 2")
  expect(actions).toContain("Message 2 of 2")
  expect(actions).toContain("One WhatsApp template preview")
  expect(actions).toContain("Construction material pricing")
  expect(actions).toContain("Reply STOP to stop promotional updates.")
  expect(actions).toContain("I confirm this customer agreed to receive WhatsApp messages from Avantia Build.")
  expect(actions).toContain("sendAuraWhatsAppWelcomeTemplateAction")
  expect(actions).toContain("Send WhatsApp template")
  expect(actions).toContain("isWelcomePackage && channel === \"whatsapp\" && !marketingConsentConfirmed")
  expect(actions).toContain("See how it works: ${PRODUCTION_SITE_ORIGIN}")
  expect(actions).toContain("setIsWelcomePackage(value === \"welcome\")")
  expect(actions).toContain("isWelcomePackage && channel !== \"email\"")
  expect(actions).toContain('`welcome/${normalizedPhone.replace(/\\D/g, "")}`')
  expect(actions).toContain("sendAuraWelcomePackageAction")
  expect(actions).toContain("messages: [message, welcomeFollowUp]")
  expect(broker).toContain('input.action === "send_welcome_package"')
  expect(broker).toContain("public.enqueue_aura_message_package_outbox(")
  expect(broker).toContain('const packageKey = `welcome/${destination.replace(/\\D/g, "")}`')
  expect(broker).toContain("idempotencyValue !== packageKey")
  expect(serverActions).toContain("if (!result.duplicate)")
  expect(serverActions).toContain('const templateName: AuraWhatsAppMarketingTemplateName = "carlos_welcome_package"')
  expect(serverActions).toContain('action: "send_whatsapp_marketing_template"')
  expect(serverActions).toContain("consentConfirmed: true")
  expect(worker).toContain("prior.package_index < candidate_outbox.package_index")
  expect(worker).toContain("prior.status not in ('accepted', 'sent', 'delivered', 'read')")
  expect(migration).toContain("jsonb_array_length(p_messages) <> 2")
  expect(migration).toContain("pg_advisory_xact_lock")
  expect(migration).toContain("existing_part_count <> 2")
  expect(migration).toContain("aura_message_outbox_package_part_uidx")
  expect(broker).toContain("sms_ai_bare_greeting_suppressed")
  expect(broker).toContain('route: "manager-welcome-only"')
  expect(broker).toContain('carlos_welcome_package: {')
  expect(broker).toContain('candidate.category === "MARKETING"')
  expect(broker).toContain('input.action === "send_whatsapp_marketing_template"')
  expect(broker).toContain('throw new Error("whatsapp_recipient_opted_out")')
  expect(broker).toContain("isWhatsAppMarketingOptOutMessage")
  expect(broker).toContain("do\\s+not\\s+contact")
  expect(broker).toContain("consentSource !== \"manager_confirmed_customer_opt_in\"")
  expect(broker).toContain("Approved marketing template:")
  expect(broker).toContain("See how it works: https://avantiabuild.com")
  expect(marketingTemplate.indexOf('candidate.status === "APPROVED"')).toBeLessThan(
    marketingTemplate.indexOf('type: "template"'),
  )
})
