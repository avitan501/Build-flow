import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

test("outgoing SMS campaigns are identified in Communications", async () => {
  const inbox = await readFile(
    path.join(process.cwd(), "components/buildflow/unified-communication-inbox.tsx"),
    "utf8",
  )

  expect(inbox).toContain("function isAdvertisingCampaignMessage")
  expect(inbox).toContain('message.direction !== "outgoing"')
  expect(inbox).toContain('message.channel !== "sms"')
  expect(inbox).toContain('text.includes("avantiabuild.com")')
  expect(inbox).toContain("Ad campaign")
  expect(inbox).toContain("Advertising campaign message")
})
