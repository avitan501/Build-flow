import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

test("new conversation uses a 44px mobile target and stays compact on desktop", async () => {
  const inbox = await readFile(path.join(process.cwd(), "components/buildflow/unified-communication-inbox.tsx"), "utf8")
  const button = inbox.match(/<button type="button" onClick=\{newConversation\}[^>]+>/)?.[0]

  expect(button).toBeTruthy()
  expect(button).toContain("h-11 w-11")
  expect(button).toContain("md:h-9 md:w-9")
  expect(button).toContain('aria-label="New conversation"')
})
