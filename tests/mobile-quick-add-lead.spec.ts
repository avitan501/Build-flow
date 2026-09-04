import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

import { buildQuickLeadNotes, normalizeOutreachLeadEmail, normalizeOutreachLeadPhone } from "@/lib/outreach-lead-normalization"

const root = process.cwd()

test("normalizes equivalent email and US phone formats for duplicate detection", () => {
  expect(normalizeOutreachLeadEmail(" Lead@Example.COM ")).toBe("lead@example.com")
  expect(normalizeOutreachLeadPhone("+1 (516) 908-8319")).toBe("5169088319")
  expect(normalizeOutreachLeadPhone("516-908-8319")).toBe("5169088319")
})

test("stores source, follow-up, note, and raw intake in the existing notes field", () => {
  expect(buildQuickLeadNotes({ source: "Referral", followUpDate: "2026-09-10", note: "Call after 3", rawText: "Avi from ABC" })).toBe("Source: Referral\n\nFollow-up: 2026-09-10\n\nNote: Call after 3\n\nRaw intake:\nAvi from ABC")
})

test("Manager Tools exposes a permission-scoped mobile quick-add page", async () => {
  const [tools, page, form, action] = await Promise.all([
    readFile(path.join(root, "app/admin/ai-tools/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/quick-add-lead/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/mobile-quick-add-lead.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/quick-add-lead/actions.ts"), "utf8"),
  ])
  expect(tools).toContain('access.customers ? [{ href: "/admin/ai-tools/quick-add-lead"')
  expect(page).toContain('requireStaffProfile("customers")')
  expect(page).toContain("This creates a lead, not a client or order")
  for (const label of ["Name", "Company", "Phone", "Email", "Source", "Status", "Follow-up", "Short note", "Paste raw text"]) expect(form).toContain(label)
  expect(form).toContain("safe-area-inset-bottom")
  expect(form).toContain("Check duplicate & save lead")
  expect(action).toContain('.from("manager_outreach_leads")')
  expect(action).toContain("normalizeOutreachLeadEmail")
  expect(action).toContain("normalizeOutreachLeadPhone")
  expect(action).toContain("duplicateId")
  expect(action).not.toContain("createAdminClient")
})

test("Lead review is exception-only while trusted clear screenshots use the automatic path", async () => {
  const [tools, page] = await Promise.all([
    readFile(path.join(root, "app/admin/ai-tools/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/lead-drafts/page.tsx"), "utf8"),
  ])
  expect(tools).toContain('access.owner ? [{ href: "/admin/ai-tools/lead-drafts"')
  expect(tools).toContain("Small manual fallback")
  expect(page).toContain('requireOwnerAccess("/admin/ai-tools/lead-drafts")')
  expect(page).toContain('draft.proposal?.recordType === "lead"')
  expect(page).toContain('["needs_follow_up", "failed"]')
  expect(page).toContain("becomes a NEW lead automatically")
  expect(page).toContain("Only unclear, incomplete, or duplicate contacts wait here")
  expect(page).toContain("Nothing in this inbox sends a welcome message automatically")
  expect(page).toContain("Confirm reviewed lead")
  expect(page).toContain("Not a lead")
  expect(page).toContain("confirmAuraIntakeAction")
  expect(page).toContain("cancelAuraIntakeAction")
})
