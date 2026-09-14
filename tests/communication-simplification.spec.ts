import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import { runInNewContext } from "node:vm"
import ts from "typescript"
import { isAutomatedSender, splitQuotedEmail } from "@/lib/communication-presentation"

test("automated senders include prefixed meeting notifications but not real contacts", () => {
  for (const email of ["no-reply@google.com", "noreply@example.com", "meetings-noreply@google.com", "DO.NOT.REPLY@example.com"]) expect(isAutomatedSender(email)).toBe(true)
  for (const email of ["dherian@example.com", "reply@example.com", "sales@example.com", "no-reply"]) expect(isAutomatedSender(email)).toBe(false)
})

test("draft storage isolates accounts and channels, survives remount, and clears only sent text", async () => {
  const source = await readFile("components/buildflow/use-communication-draft.ts", "utf8")
  const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const storage = new Map<string, string>()
  let blocked = false
  const exports: { useCommunicationDraft?: (scope: string, thread: string, fallback: string) => readonly [string, (value: string, targetThread?: string) => void, boolean, (value: string) => void] } = {}
  const load = () => {
    runInNewContext(javascript, {
      exports,
      require: () => ({ useCallback: (fn: unknown) => fn, useState: () => [false, () => {}], useSyncExternalStore: (_subscribe: unknown, read: () => string) => read() }),
      sessionStorage: { getItem: (key: string) => { if (blocked) throw Error("blocked"); return storage.get(key) ?? null }, setItem: (key: string, value: string) => { if (blocked) throw Error("blocked"); storage.set(key, value) } },
      window: { dispatchEvent: () => {} }, Event: class {},
    })
    return exports.useCommunicationDraft!
  }
  let useDraft = load()
  const draft = useDraft("owner", "sms:+15550000001", "AI suggestion")
  expect(draft[0]).toBe("AI suggestion")
  draft[1]("First draft")
  expect(useDraft("carlos", "sms:+15550000001", "")[0]).toBe("")
  expect(useDraft("owner", "email:sample@example.com", "")[0]).toBe("")
  expect(useDraft("owner", "sms:+15550000002", "")[0]).toBe("")
  // AI can switch the composer from email to SMS in the same React batch.
  const emailDraft = useDraft("owner", "email:sample@example.com", "")
  emailDraft[1]("Email draft")
  emailDraft[1]("Generated SMS reply", "sms:+15550000002")
  expect(useDraft("owner", "email:sample@example.com", "")[0]).toBe("Email draft")
  expect(useDraft("owner", "sms:+15550000002", "")[0]).toBe("Generated SMS reply")
  // Simulate a send failure: no clear call, so the draft remains intact.
  expect(useDraft("owner", "sms:+15550000001", "")[0]).toBe("First draft")
  draft[1]("New text while sending")
  draft[3]("First draft")
  expect(useDraft("owner", "sms:+15550000001", "")[0]).toBe("New text while sending")
  useDraft = load() // Fresh module memory, same tab session storage (reload).
  expect(useDraft("owner", "sms:+15550000001", "")[0]).toBe("New text while sending")
  useDraft("owner", "sms:+15550000001", "")[3]("New text while sending")
  expect(useDraft("owner", "sms:+15550000001", "AI suggestion")[0]).toBe("")
  blocked = true
  useDraft("owner", "sms:+15550000003", "")[1]("Memory fallback")
  expect(useDraft("owner", "sms:+15550000003", "")[0]).toBe("Memory fallback")
})

test("email history stays recoverable and ordinary message text stays intact", () => {
  const text = "The price is $42.\nOn Monday, Alex wrote:\nPlease quote this item."
  expect(splitQuotedEmail(text)).toEqual({ current: "The price is $42.", previous: "On Monday, Alex wrote:\nPlease quote this item." })
  expect(splitQuotedEmail("Need 20 sheets\nand 10 studs")).toEqual({current:"Need 20 sheets\nand 10 studs",previous:""})
  expect(splitQuotedEmail("Thanks\n> older text").previous).toBe("> older text")
})

test("drafts and directory cache are scoped to the signed-in account", async () => {
  const inbox = await readFile("components/buildflow/unified-communication-inbox.tsx", "utf8")
  const hook = await readFile("components/buildflow/use-communication-draft.ts", "utf8")
  expect(inbox).toContain("${COMMUNICATION_DIRECTORY_CACHE_KEY}:${draftScope}")
  expect(inbox).toContain('recipient.trim().toLowerCase()')
  expect(inbox).toContain('normalizeAuraPhone(recipient)')
  expect(inbox).toContain('clearSentDraft(sentDraftText)')
  expect(hook).toContain("${scope}:${thread}")
  expect(hook).toContain("sessionStorage.setItem")
  expect(hook).not.toContain("localStorage")
})
