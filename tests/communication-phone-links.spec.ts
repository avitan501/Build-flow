import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import {
  communicationQuoCallHref,
  communicationTelHref,
  communicationThreadHref,
  normalizeCommunicationCallPhone,
  normalizeCommunicationThread,
} from "@/lib/aura/phone-links"
import { MANAGER_EMAIL, STAFF_EMAILS, managerCapabilities } from "@/lib/owner-identity"

const root = process.cwd()

test("communication calls normalize domestic, international, and repaired legacy numbers to E.164", () => {
  for (const phone of [
    "(516) 555-0123",
    "516-555-0123",
    "1 (516) 555-0123",
    "+1 516 555 0123",
  ]) {
    expect(normalizeCommunicationCallPhone(phone)).toBe("+15165550123")
    expect(communicationTelHref(phone)).toBe("tel:+15165550123")
  }

  expect(normalizeCommunicationCallPhone("+44 20 7946 0958")).toBe("+442079460958")
  expect(normalizeCommunicationCallPhone("+3479378665")).toBe("+13479378665")
  expect(normalizeCommunicationCallPhone("516-55")).toBeNull()
  expect(normalizeCommunicationCallPhone(undefined)).toBeNull()
  expect(communicationTelHref("not a phone")).toBeNull()
})

test("Q U O links are platform-safe and never auto-dial", () => {
  for (const userAgent of [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
    "Mozilla/5.0 (Linux; Android 15; Pixel 9)",
  ]) {
    const href = communicationQuoCallHref("(516) 555-0123", userAgent)
    expect(href).toBe("openphone://dial?number=%2B15165550123&from=%2B15169088319")
    expect(href).not.toContain("action=call")
  }

  expect(communicationQuoCallHref("516.555.0123", "Mozilla/5.0 (Macintosh; Intel Mac OS X)")).toBe("tel:+15165550123")
  expect(communicationQuoCallHref("bad", "Mozilla/5.0 (Windows NT 10.0)")).toBeNull()
})

test("phone and email thread links are canonical across number formats", () => {
  for (const phone of ["(516) 555-0123", "516-555-0123", "+1 516 555 0123"]) {
    expect(normalizeCommunicationThread(phone)).toEqual({ key: "+15165550123", phone: "+15165550123", email: null })
    expect(communicationThreadHref(phone, "call")).toBe("/admin/communications?thread=%2B15165550123&channel=call")
  }

  expect(normalizeCommunicationThread(" Ops@Example.COM ")).toEqual({ key: "ops@example.com", phone: null, email: "ops@example.com" })
  expect(communicationThreadHref(" Ops@Example.COM ", "email")).toBe("/admin/communications?thread=ops%40example.com&channel=email")
  expect(communicationThreadHref("invalid", "sms")).toBeNull()
})

test("every approved Communications role keeps access while inactive and unapproved identities do not", () => {
  expect(managerCapabilities({ email: MANAGER_EMAIL, role: "admin", approvalStatus: "approved", isActive: true }).communications).toBe(true)
  for (const email of STAFF_EMAILS) {
    expect(managerCapabilities({ email, role: "staff", approvalStatus: "approved", isActive: true }).communications).toBe(true)
  }
  expect(managerCapabilities({ email: MANAGER_EMAIL, role: "admin", approvalStatus: "pending", isActive: true }).communications).toBe(false)
  expect(managerCapabilities({ email: STAFF_EMAILS[0], role: "staff", approvalStatus: "approved", isActive: false }).communications).toBe(false)
  expect(managerCapabilities({ email: "client@example.com", role: "client", approvalStatus: "approved", isActive: true }).communications).toBe(false)
})

test("Communications uses a controlled launcher and prioritizes exact conversation routing", async () => {
  const [inbox, launcher, page] = await Promise.all([
    readFile(path.join(root, "components/buildflow/unified-communication-inbox.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/communication-call-launcher.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/communications/page.tsx"), "utf8"),
  ])

  expect(inbox).toContain("normalizeCommunicationCallPhone(conversation.phone)")
  expect(inbox).toContain("setCallLauncher({ phone, name: conversation.name })")
  expect(inbox).toContain("<CommunicationCallLauncher")
  expect(inbox).not.toContain("window.location.assign(")
  expect(inbox).not.toContain("TwoChatSoftphone")
  expect(inbox.indexOf("communications.find((communication) => communication.id === initialCommunicationId)")).toBeLessThan(inbox.indexOf("initialCommunicationForThread(communications, initialThread"))
  expect(inbox.indexOf("initialCommunicationForThread(communications, initialThread")).toBeLessThan(inbox.indexOf("initialCommunicationForQuery(communications, initialQuery"))

  expect(launcher).toContain("communicationQuoCallHref(normalizedPhone, userAgent)")
  expect(launcher).toContain("href={callHref || undefined}")
  expect(launcher).toContain("Copy number")
  expect(launcher).toContain("does not place a call")
  expect(launcher).not.toContain("@2chat/voice-sdk")
  expect(launcher).not.toContain("getTwoChatVoiceTokenAction")

  expect(page).toContain("const exactThreadIdentity = normalizeCommunicationThread(exactThread)")
  expect(page).toContain("const exactPhone = exactThreadIdentity?.phone ?? null")
  expect(page).toContain("const exactEmail = exactThreadIdentity?.email ?? null")
})
