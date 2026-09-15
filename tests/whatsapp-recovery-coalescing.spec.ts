import { expect, test } from "@playwright/test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import * as nodeCrypto from "node:crypto"
import ts from "typescript"
import { createRecoveryCoalescer } from "../lib/aura/recovery-coalescer"

test("100 simultaneous recovery requests share one run, including forced requests", async () => {
  let calls = 0, finish!: (value: number) => void
  const run = createRecoveryCoalescer<number>()
  const work = () => { calls++; return new Promise<number>(done => { finish = done }) }
  const requests = Array.from({ length: 100 }, (_, index) => run("config-a", work, index % 2 === 0))
  await Promise.resolve()
  expect(calls).toBe(1)
  finish(3)
  expect(await Promise.all(requests)).toEqual(Array(100).fill(3))
})

test("TTL starts after successful completion; force bypasses TTL; failures never cache", async () => {
  let time = 0, calls = 0, finish!: (value: number) => void
  const run = createRecoveryCoalescer<number>({ now: () => time })
  const first = run("a", () => { calls++; return new Promise<number>(done => { finish = done }) })
  await Promise.resolve(); time = 20_000; finish(1); await first
  const work = async () => ++calls
  time = 34_999; expect(await run("a", work)).toBe(1); expect(calls).toBe(1)
  time = 35_000; expect(await run("a", work)).toBe(2)
  expect(await run("a", work, true)).toBe(3)
  await expect(run("a", async () => { throw new Error("provider failure") }, true)).rejects.toThrow("provider failure")
  expect(await run("a", work)).toBe(4)
  await expect(run("a", () => { throw new Error("synchronous failure") }, true)).rejects.toThrow("synchronous failure")
  expect(await run("a", work)).toBe(5)
})

test("configuration keys never share results and bounded eviction does not cancel active work", async () => {
  const run = createRecoveryCoalescer<string>({ maxEntries: 2 })
  let finishA!: (value: string) => void, finishB!: (value: string) => void
  const a = run("a", () => new Promise<string>(done => { finishA = done }))
  const b = run("b", () => new Promise<string>(done => { finishB = done }))
  await Promise.resolve()
  expect(await run("c", async () => "uncached c")).toBe("uncached c")
  expect(run("a", async () => "wrong a")).toBe(a)
  finishA("a result"); finishB("b result"); await Promise.all([a, b])
  expect(await run("c", async () => "c result")).toBe("c result")
  expect(await run("b", async () => "wrong b")).toBe("b result")
  expect(await run("a", async () => "a reloaded")).toBe("a reloaded")
})

test("actual Twilio wrapper coalesces provider and database recovery, isolates config and bypasses no webhooks", async () => {
  let providerReads = 0, dbReads = 0, stores = 0, statusUpdates = 0, time = 0
  const exports: Record<string, (...args: unknown[]) => Promise<unknown>> = {}
  const compiledModule = { exports }
  const source = readFileSync(resolve("lib/aura/twilio-whatsapp.ts"), "utf8")
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
  const mockedRequire = (name: string): unknown => {
    if (name === "server-only") return {}
    if (name === "node:crypto") return nodeCrypto
    if (name === "twilio") return () => ({ messages: { list: async () => { providerReads++; return [{ sid: "synthetic-sid", direction: "inbound", from: "whatsapp:+15165550123", body: "Fixture", status: "received", dateSent: new Date(0) }] }, create: () => { throw new Error("Provider sends prohibited") } } })
    if (name === "@/lib/aura/recovery-coalescer") return { createRecoveryCoalescer: () => createRecoveryCoalescer({ now: () => time }) }
    if (name === "@/lib/aura/communications") return { normalizeAuraPhone: (v: string) => v, storeAuraCommunication: async () => { stores++ }, updateAuraCommunicationStatus: async () => { statusUpdates++ } }
    if (name === "@/lib/site-url") return { PRODUCTION_SITE_ORIGIN: "https://fixture.example.test" }
    if (name === "@/lib/supabase/admin") return { createAdminClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ in: async () => { dbReads++; return { data: [{ external_activity_id: "synthetic-sid" }], error: null } } }) }) }) }) }
    throw new Error(`Unexpected dependency: ${name}`)
  }
  new Function("require", "module", "exports", js)(mockedRequire, compiledModule, exports)
  const names = ["AURA_TWILIO_ACCOUNT_SID", "AURA_TWILIO_AUTH_TOKEN", "AURA_TWILIO_WHATSAPP_FROM"]
  const before = names.map(name => process.env[name])
  try {
    for (const name of names) delete process.env[name]
    expect(await exports.syncRecentTwilioWhatsAppMessages()).toEqual({ synced: 0, commands: 0 })
    expect(providerReads).toBe(0)
    process.env.AURA_TWILIO_ACCOUNT_SID = "fixture-account-a"
    process.env.AURA_TWILIO_AUTH_TOKEN = "fixture-token-a"
    process.env.AURA_TWILIO_WHATSAPP_FROM = "+15165550000"
    await Promise.all(Array.from({ length: 50 }, () => exports.syncRecentTwilioWhatsAppMessages()))
    expect({ providerReads, dbReads, stores }).toEqual({ providerReads: 1, dbReads: 1, stores: 1 })
    await exports.syncRecentTwilioWhatsAppMessages(); expect(providerReads).toBe(1)
    await exports.syncRecentTwilioWhatsAppMessages({ force: true }); expect(providerReads).toBe(2)
    process.env.AURA_TWILIO_ACCOUNT_SID = "fixture-account-b"
    await exports.syncRecentTwilioWhatsAppMessages(); expect(providerReads).toBe(3)
    process.env.AURA_TWILIO_AUTH_TOKEN = "fixture-token-rotated"
    await exports.syncRecentTwilioWhatsAppMessages(); expect(providerReads).toBe(4)
    process.env.AURA_TWILIO_WHATSAPP_FROM = "+15165550001"
    await exports.syncRecentTwilioWhatsAppMessages(); expect(providerReads).toBe(5)
    time = 15_000; await exports.syncRecentTwilioWhatsAppMessages(); expect(providerReads).toBe(6)
    await exports.processTwilioWhatsAppWebhook(new URLSearchParams({ MessageSid: "webhook-sid", MessageStatus: "delivered" }))
    expect(statusUpdates).toBe(1); expect(providerReads).toBe(6)
  } finally {
    names.forEach((name, index) => { if (before[index] === undefined) delete process.env[name]; else process.env[name] = before[index] })
  }
})
