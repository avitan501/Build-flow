import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

import {
  normalizeRequestAttachmentMimeType,
  requestActionHasSameOrigin,
  requestAttachmentStorageMetadataMatches,
  validateRequestAttachmentFile,
  verifyRequestAttachmentStorage,
} from "@/lib/request-attachment-upload"

const root = process.cwd()

test("request attachment validation binds the declared MIME type to the file extension", () => {
  expect(validateRequestAttachmentFile({ filename: "glass-plan.PDF", type: "application/pdf", size: 2048 })).toBeNull()
  expect(validateRequestAttachmentFile({ filename: "glass-plan.jpg", type: "application/pdf", size: 2048 })).toContain("do not match")
  expect(validateRequestAttachmentFile({ filename: "glass-plan.pdf", type: "text/plain", size: 2048 })).toContain("PDF")
})

test("request attachment origin comparison honors the forwarded request host", () => {
  expect(requestActionHasSameOrigin("https://build.avantiap.com", "build.avantiap.com", "internal.example")).toBe(true)
  expect(requestActionHasSameOrigin("https://evil.example", "build.avantiap.com", "build.avantiap.com")).toBe(false)
  expect(requestActionHasSameOrigin(null, "build.avantiap.com", "build.avantiap.com")).toBe(false)
})

test("storage metadata accepts normalized Supabase metadata and rejects mismatches", () => {
  expect(normalizeRequestAttachmentMimeType("Application/PDF; charset=binary")).toBe("application/pdf")
  expect(requestAttachmentStorageMetadataMatches(
    { metadata: { size: "4096", mimetype: "Application/PDF; charset=binary" } },
    { size: 4096, type: "application/pdf" },
  )).toBe(true)
  expect(requestAttachmentStorageMetadataMatches(
    { size: 4095, contentType: "application/pdf" },
    { size: 4096, type: "application/pdf" },
  )).toBe(false)
})

test("storage metadata verification retries eventual-consistency misses", async () => {
  let calls = 0
  const waits: number[] = []
  const result = await verifyRequestAttachmentStorage(async () => {
    calls += 1
    return calls < 3
      ? { data: null, error: { message: "not found yet" } }
      : { data: { size: 8192, contentType: "image/png" }, error: null }
  }, { size: 8192, type: "image/png" }, {
    attempts: 3,
    wait: async (milliseconds) => { waits.push(milliseconds) },
  })

  expect(result).toEqual({ ok: true })
  expect(calls).toBe(3)
  expect(waits).toEqual([125, 250])
})

test("existing-request uploader prepares signed uploads only through the authenticated action", async () => {
  const [actions, uploader] = await Promise.all([
    readFile(path.join(root, "app/owner/materials/requests/actions.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/request-attachment-uploader.tsx"), "utf8"),
  ])

  expect(actions).toContain("prepareRequestAttachmentUploadAction")
  expect(actions).toContain("requestActionHasSameOrigin")
  expect(actions).toContain('requireStaffProfile("customers")')
  expect(actions).toContain("createSignedUploadUrl(storagePath)")
  expect(actions).toContain("verifyRequestAttachmentStorage")
  expect(uploader).toContain("prepareRequestAttachmentUploadAction")
  expect(uploader).not.toContain("public-quote-intake")
  expect(uploader).not.toContain("getSupabasePublicEnv")
})
