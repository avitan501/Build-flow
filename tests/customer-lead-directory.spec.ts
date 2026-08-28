import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

const root = process.cwd()

test("customer directory connects customers, leads, requests, and Aura conversations", async () => {
  const [page, leads, conversation, createCustomer] = await Promise.all([
    readFile(path.join(root, "app/admin/users/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/client-target-outreach.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/contact-conversation.tsx"), "utf8"),
    readFile(path.join(root, "supabase/functions/create-manager-client/index.ts"), "utf8"),
  ])

  expect(page).toContain('params.view === "leads"')
  expect(page).toContain('.from("manager_outreach_leads")')
  expect(page).toContain('body: { action: "dashboard" }')
  expect(page).toContain("directoryConversation(auraCommunications")
  expect(page).toContain("<ContactConversation")
  expect(page).toContain("<OutreachLeadDirectory")
  expect(page).toContain("<AddTargetClient compact />")
  expect(page).toContain("<AddOutreachLead compact />")
  expect(page).toContain("compact iconOnly")
  expect(page).toContain('customer.approval_status === "pending" ? "Unverified"')
  expect(page).toContain(">CRM</p>")
  expect(page).not.toContain('/admin/users?view=projects')
  expect(leads).toContain("export function OutreachLeadDirectory")
  expect(leads).toContain("conversations[lead.id]")
  expect(leads).toContain('max-w-[70%]')
  expect(leads).toContain('title="Edit lead"')
  expect(leads).toContain('aria-label={`Remove ${lead.full_name}`}')
  expect(conversation).toContain("No calls or messages yet.")
  expect(conversation).toContain("View earlier messages")
  expect(createCustomer).toContain('approval_status: "pending"')
  expect(createCustomer).toContain("is_active: true")
})

test("one-to-one composer provides approved editable templates and channel choice", async () => {
  const [composer, actions] = await Promise.all([
    readFile(path.join(root, "components/buildflow/contact-actions.tsx"), "utf8"),
    readFile(path.join(root, "app/owner/aura/actions.ts"), "utf8"),
  ])

  for (const label of ["Welcome", "Friendly follow-up", "Request material list", "Quote follow-up", "Order follow-up", "Custom message"]) {
    expect(composer).toContain(label)
  }
  expect(composer).toContain("Exact message preview")
  expect(composer).toContain("Reply STOP")
  expect(composer).toContain("Send a Message")
  expect(composer).toContain("Send WhatsApp")
  expect(composer).toContain("Send a Video")
  expect(composer).toContain('title="Contact"')
  expect(composer).toContain("Text")
  expect(composer).toContain("WhatsApp")
  expect(composer).toContain("Email")
  expect(actions).toContain('revalidatePath("/admin/users")')
})
