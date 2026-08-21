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
  const [action, component] = await Promise.all([
    readFile(path.join(root, "app/admin/build-map/actions.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/manager-dashboard-ai-search.tsx"), "utf8"),
  ])

  expect(action).toContain("requireManagerPortalProfile")
  expect(action).toContain("process.env.OPENAI_API_KEY")
  expect(action).toContain('process.env.OPENAI_DASHBOARD_MODEL || "gpt-5-mini"')
  expect(action).toContain("store: false")
  expect(action).toContain('reasoning: { effort: "low" }')
  expect(action).not.toContain("NEXT_PUBLIC_OPENAI")
  expect(component).toContain("Recent searches")
  expect(component).toContain("Waiting for the OpenAI key")
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
  expect(customerPage).toContain("Communication log")
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
