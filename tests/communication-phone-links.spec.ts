import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import {
  communicationTelHref,
  normalizeCommunicationCallPhone,
} from "@/lib/aura/phone-links"

const root = process.cwd()

test("communication calls normalize every supported phone format to E.164", () => {
  for (const phone of [
    "(516) 555-0123",
    "516-555-0123",
    "1 (516) 555-0123",
    "+1 516 555 0123",
  ]) {
    expect(normalizeCommunicationCallPhone(phone)).toBe("+15165550123")
    expect(communicationTelHref(phone)).toBe("tel:+15165550123")
  }

  expect(normalizeCommunicationCallPhone("516-55")).toBeNull()
  expect(communicationTelHref("not a phone")).toBeNull()
})

test("the communication inbox never passes a display-formatted number to a call provider", async () => {
  const [inbox, softphone] = await Promise.all([
    readFile(path.join(root, "components/buildflow/unified-communication-inbox.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/two-chat-softphone.tsx"), "utf8"),
  ])

  expect(inbox).toContain("normalizeCommunicationCallPhone(conversation.phone)")
  expect(inbox).toContain("setSoftphone({ phone, name: conversation.name })")
  expect(inbox).not.toContain("setSoftphone({ phone: conversation.phone")
  expect(inbox).toContain("window.location.assign(communicationTelHref(phone)!)")
  expect(softphone).toContain("normalizeCommunicationCallPhone(phone)")
  expect(softphone).toContain("device.connect({ to: normalizedPhone, from: result.from })")
  expect(softphone).toContain("Call from this device")
})
