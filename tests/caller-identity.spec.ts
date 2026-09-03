import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import { resolveCallerIdentity, type CallerIdentityCandidate } from "../lib/aura/caller-identity"
import { withManagerCallerIdentity, type ManagerNotificationEvent } from "../lib/manager-notification-feed"

function candidate(overrides: Partial<CallerIdentityCandidate> = {}): CallerIdentityCandidate {
  return {
    canonicalKey: "customer:one",
    id: "one",
    kind: "customer",
    name: "Maria Rivera",
    company: "Rivera Builders",
    phone: "+1 (519) 742-9188",
    source: "directory",
    ...overrides,
  }
}

function notification(overrides: Partial<ManagerNotificationEvent> = {}): ManagerNotificationEvent {
  return {
    id: 1,
    event_type: "call_message",
    title: "Incoming call from Phone ending 9188",
    body: "Call received",
    href: "/admin/communications?communication=11111111-1111-1111-1111-111111111111&channel=call",
    created_at: "2026-09-03T12:00:00.000Z",
    processed_at: null,
    read_at: null,
    ...overrides,
  }
}

test("caller identity uses an exact normalized E.164 match and preserves company", () => {
  const result = resolveCallerIdentity("519.742.9188", [
    candidate(),
    candidate({ id: "last-four-only", canonicalKey: "lead:last-four", name: "Wrong", phone: "+12125559188" }),
  ])

  expect(result.status).toBe("verified")
  expect(result.phone).toBe("+15197429188")
  expect(result.primary).toMatchObject({ name: "Maria Rivera", company: "Rivera Builders" })
})

test("linked sources for one canonical record collapse without creating false ambiguity", () => {
  const result = resolveCallerIdentity("+15197429188", [
    candidate(),
    candidate({ id: "aura-contact", source: "contact-link" }),
    candidate({ id: "prior-link", source: "communication-link" }),
  ])

  expect(result.status).toBe("verified")
  expect(result.candidates).toHaveLength(1)
})

test("duplicate exact matches stay ambiguous and deterministic regardless of input order", () => {
  const customer = candidate()
  const supplier = candidate({ canonicalKey: "supplier:two", id: "two", kind: "supplier", name: "Maria at Supply Co", company: "Supply Co" })
  const first = resolveCallerIdentity("+15197429188", [supplier, customer])
  const second = resolveCallerIdentity("+15197429188", [customer, supplier])

  expect(first.status).toBe("ambiguous")
  expect(first.candidates.map((entry) => entry.canonicalKey)).toEqual(["customer:one", "supplier:two"])
  expect(second.candidates).toEqual(first.candidates)
})

test("unknown calls and texts keep the normalized phone visible", () => {
  const resolution = resolveCallerIdentity("(519) 742-9188", [
    candidate({ name: "Unnamed customer", company: "" }),
    candidate({ canonicalKey: "contact:phone", id: "phone", kind: "contact", name: "(519) 742-9188", company: "" }),
  ])
  const incomingCall = withManagerCallerIdentity(notification(), resolution)
  const text = withManagerCallerIdentity(notification({ title: "Text message", href: "/admin/communications?communication=one&channel=sms" }), resolution)

  expect(incomingCall.title).toBe("Incoming call from Unknown caller")
  expect(incomingCall.body).toContain("+15197429188")
  expect(text.title).toBe("Text message from Unknown sender")
})

test("detailed notification copy exposes verified and ambiguous identities", () => {
  const verified = withManagerCallerIdentity(notification(), resolveCallerIdentity("+15197429188", [candidate()]))
  const ambiguousResolution = resolveCallerIdentity("+15197429188", [
    candidate(),
    candidate({ canonicalKey: "lead:two", id: "two", kind: "lead", name: "Maria R." }),
  ])
  const ambiguous = withManagerCallerIdentity(notification(), ambiguousResolution)

  expect(verified.title).toBe("Incoming call from Maria Rivera")
  expect(verified.body).toContain("Rivera Builders · +15197429188")
  expect(ambiguous.title).toBe("Incoming call — 2 exact phone matches")
  expect(ambiguous.body).toContain("Maria Rivera · Rivera Builders (Customer)")
  expect(ambiguous.body).toContain("Maria R. · Rivera Builders (Lead)")
})

test("communication UI and detailed notifications use every verified internal phone source", async () => {
  const root = process.cwd()
  const [inbox, store, route, phoneLinks, pushIdentityMigration] = await Promise.all([
    readFile(path.join(root, "components/buildflow/unified-communication-inbox.tsx"), "utf8"),
    readFile(path.join(root, "lib/manager-notification-store.ts"), "utf8"),
    readFile(path.join(root, "app/api/manager-notifications/route.ts"), "utf8"),
    readFile(path.join(root, "lib/aura/phone-links.ts"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260903023000_resolve_manager_caller_identity.sql"), "utf8"),
  ])

  expect(inbox).toContain("resolveCallerIdentity")
  expect(inbox).toContain("Duplicate phone number")
  expect(inbox).toContain("Unknown caller")
  expect(inbox).toContain("supplier.additionalContacts")
  expect(store).toContain('.from("aura_contacts")')
  expect(store).toContain('.from("profiles")')
  expect(store).toContain('.from("manager_outreach_leads")')
  expect(store).toContain('rpc("staff_load_supplier_directory_snapshot")')
  expect(store).toContain("loadAuraCommunicationLinks(linkedCommunicationIds)")
  expect(route).toContain("session.user.id, 100, true")
  expect(phoneLinks).toContain("return normalizeAuraPhone(value)")
  expect(phoneLinks).toContain("return phone ? `tel:${phone}` : null")
  expect(pushIdentityMigration).toContain("exact matches:")
  expect(pushIdentityMigration).toContain("Unknown caller · ")
  expect(pushIdentityMigration).toContain("manager_outreach_leads")
  expect(pushIdentityMigration).toContain("additionalContacts")
  expect(pushIdentityMigration).toContain("aura_communication_links")
})
