import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import {
  parseCommunicationLog,
  parseDashboardAiHistory,
  parseEmployeeActivity,
  serializeCommunicationLog,
  serializeDashboardAiHistory,
  serializeEmployeeActivity,
} from "../lib/manager-command-center"

const root = process.cwd()

test("dashboard AI uses authorized server data and keeps the API key private", async () => {
  const [action, component, broker] = await Promise.all([
    readFile(path.join(root, "app/admin/build-map/actions.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/manager-dashboard-ai-search.tsx"), "utf8"),
    readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
  ])

  expect(action).toContain("requireManagerPortalProfile")
  expect(action).toContain('action: "dashboard_ai"')
  expect(action).toContain('formData.get("image")')
  expect(action).toContain("DASHBOARD_AI_MODELS")
  expect(action).toContain("websitePages")
  expect(action).not.toContain("process.env.OPENAI_API_KEY")
  expect(broker).toContain('openaiKey: "openai_supplier_quote_api_key"')
  expect(broker).toContain('luna: { id: "gpt-5.6-luna"')
  expect(broker).toContain('terra: { id: "gpt-5.6-terra"')
  expect(broker).toContain('sol: { id: "gpt-5.6-sol"')
  expect(broker).toContain('type: "input_image"')
  expect(broker).toContain("store: false")
  expect(broker).toContain("reasoning: { effort: selectedModel.effort }")
  expect(action).not.toContain("NEXT_PUBLIC_OPENAI")
  expect(component).toContain("Recent searches")
  expect(component).toContain("Ask AI")
  expect(component).toContain("Add photo")
  expect(component).toContain('aria-label="AI model"')
  expect(component).toContain("Terra · Recommended")
  expect(component).toContain("preparePhoto")
  expect(action).toContain("liveSearchFallback")
})

test("customer and lead records expose one compact contact menu", async () => {
  const [actions, customers, leads] = await Promise.all([
    readFile(path.join(root, "components/buildflow/contact-actions.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/users/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/client-target-outreach.tsx"), "utf8"),
  ])
  expect(actions).toContain(">Call</a>")
  expect(actions).toContain("Q U O text")
  expect(actions).toContain("Send a Message")
  expect(actions).toContain("Send WhatsApp")
  expect(actions).toContain("Send a Video")
  expect(actions).toContain('title="Contact"')
  expect(actions).toContain("Add attachment")
  expect(actions).toContain("prepareQuoAttachmentMessageAction")
  expect(customers).toContain("<ContactActions")
  expect(leads).toContain("<ContactActions")
  expect(leads).toContain('<option value="en">EN</option>')
  expect(leads).toContain('<option value="es">ES</option>')
})

test("approved staff use a compact manager workspace without owner-only controls", async () => {
  const [identity, shell, settings, traffic, aiTools, payments, affiliate, broker] = await Promise.all([
    readFile(path.join(root, "lib/owner-identity.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/settings/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/traffic/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/payments/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/goals-progress/affiliate-actions.ts"), "utf8"),
    readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
  ])

  for (const capability of ["communications", "tasks", "quotes", "aiTools", "traffic", "managerSettings"]) {
    expect(identity).toContain(`| "${capability}"`)
  }
  expect(identity).toContain("operationsManager")
  for (const removedHeading of ["Directories & Catalog", "Supplier Pricing"]) expect(shell).not.toContain(removedHeading)
  for (const removedSection of ['label: "Tasks"', 'label: "Quotes & Orders"']) expect(shell).not.toContain(removedSection)
  expect(shell).not.toContain('label: "AI Tools"')
  expect(shell).not.toContain('href: "/admin/abc"')
  expect(shell).not.toContain('href: "/admin/traffic"')
  expect(aiTools).toContain('href: "/admin/abc"')
  expect(aiTools).toContain('href: "/admin/traffic"')
  expect(shell).not.toContain('{ href: "/owner/aura", label: "Aura Communications"')
  expect(shell).not.toContain("Customer Website")
  expect(shell).not.toContain("Quick Access")
  expect(shell).toContain('>Communications</span>')
  expect(settings).toContain("Connection credentials and owner delivery tests remain restricted to David.")
  expect(settings).toContain("checkCommunicationConnectionsAction")
  expect(traffic).toContain('requireStaffProfile("traffic")')
  expect(traffic).toContain('action: "website_traffic"')
  expect(broker).toContain('input.action === "website_traffic"')
  expect(broker).toContain("left join public.profiles")
  expect(aiTools).toContain("requireManagerPortalProfile")
  expect(aiTools).toContain('if (!access.aiTools) redirect("/")')
  expect(payments).toContain("requireAdminProfile")
  expect(affiliate).toContain("requireAdminProfile")
})

test("communication records are linked to customers and visible in the customer directory", async () => {
  const [page, action, customerPage] = await Promise.all([
    readFile(path.join(root, "app/admin/communications/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/communications/actions.ts"), "utf8"),
    readFile(path.join(root, "app/admin/users/page.tsx"), "utf8"),
  ])

  expect(page).toContain("CommunicationCenter")
  expect(action).toContain("requireManagerPortalProfile")
  expect(action).toContain('eq("id", clientId)')
  expect(action).toContain("serializeCommunicationLog")
  expect(customerPage).toContain("communicationByClient")
  expect(customerPage).toContain("ContactConversation")
  expect(customerPage).toContain('body: { action: "dashboard" }')
})

test("employee activity reports only the current Avantia page with a visible notice", async () => {
  const [action, reporter] = await Promise.all([
    readFile(path.join(root, "app/admin/activity-actions.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/employee-activity-reporter.tsx"), "utf8"),
  ])

  expect(action).toContain('path.startsWith("/admin/")')
  expect(action).toContain("serializeEmployeeActivity")
  expect(reporter).toContain("Activity status visible to owner")
  expect(reporter).toContain("Screen contents are not recorded")
  expect(reporter).not.toContain("getDisplayMedia")
})

test("command-center records round trip through prefixed manager data", () => {
  const history = [{ id: "1", query: "open requests", answer: "Three", createdAt: "2026-08-21T12:00:00.000Z" }]
  expect(parseDashboardAiHistory(serializeDashboardAiHistory(history))).toEqual(history)

  const activity = { path: "/admin/catalog", pageLabel: "Material catalog", lastSeenAt: "2026-08-21T12:01:00.000Z" }
  expect(parseEmployeeActivity(serializeEmployeeActivity(activity))).toEqual(activity)

  const log = { id: "2", clientId: "client-1", clientName: "Test Client", channel: "call" as const, direction: "outbound" as const, summary: "Asked for framing list", outcome: "Follow up tomorrow", createdAt: "2026-08-21T12:02:00.000Z" }
  expect(parseCommunicationLog(serializeCommunicationLog(log))).toEqual(log)
})
