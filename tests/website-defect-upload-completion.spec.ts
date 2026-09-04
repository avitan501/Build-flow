import fs from "node:fs"
import path from "node:path"

import { expect, test } from "@playwright/test"

import {
  normalizeWebsiteDefectMimeType,
  verifyWebsiteDefectStorage,
  websiteDefectStorageMetadata,
} from "@/lib/website-defect-upload-validation"

test("reads Supabase upload metadata from both info response shapes", () => {
  expect(websiteDefectStorageMetadata({
    metadata: { size: "4096", mimetype: "Video/MP4; charset=binary" },
  })).toEqual({ size: 4096, type: "video/mp4" })

  expect(websiteDefectStorageMetadata({
    size: 2048,
    contentType: "IMAGE/PNG",
    metadata: { size: 1, mimetype: "application/octet-stream" },
  })).toEqual({ size: 2048, type: "image/png" })

  expect(normalizeWebsiteDefectMimeType(" video/webm; codecs=vp9 ")).toBe("video/webm")
})

test("retries delayed Storage info metadata before accepting the upload", async () => {
  const waits: number[] = []
  let calls = 0
  const result = await verifyWebsiteDefectStorage(async () => {
    calls += 1
    if (calls === 1) return { data: null, error: new Error("not visible yet") }
    if (calls === 2) return { data: { metadata: {} }, error: null }
    return { data: { metadata: { size: "4096", mimetype: "video/mp4" } }, error: null }
  }, { size: 4096, type: "video/mp4" }, { wait: async (milliseconds) => { waits.push(milliseconds) } })

  expect(result).toEqual({ ok: true, actual: { size: 4096, type: "video/mp4" } })
  expect(calls).toBe(3)
  expect(waits).toEqual([125, 250])
})

test("classifies confirmed mismatches separately from temporary verification failures", async () => {
  const mismatch = await verifyWebsiteDefectStorage(async () => ({
    data: { metadata: { size: 4097, mimetype: "video/mp4" } },
    error: null,
  }), { size: 4096, type: "video/mp4" }, { wait: async () => {} })
  expect(mismatch).toMatchObject({ ok: false, reason: "mismatch" })

  let calls = 0
  const unavailable = await verifyWebsiteDefectStorage(async () => {
    calls += 1
    throw new Error("temporary Storage outage")
  }, { size: 4096, type: "video/mp4" }, { wait: async () => {} })
  expect(unavailable).toMatchObject({ ok: false, reason: "unavailable" })
  expect(calls).toBe(3)
})

test("completion validates the exact owner path and deletes only confirmed mismatches", () => {
  const actions = fs.readFileSync(path.join(process.cwd(), "app/admin/ai-tools/website-defects/actions.ts"), "utf8")
  expect(actions).toContain("input.filePath !== expectedFilePath")
  expect(actions).toContain("Number.isSafeInteger(fileSize)")
  expect(actions).toContain('verified.reason === "unavailable"')
  expect(actions).toMatch(/verified\.reason === "unavailable"[\s\S]*?return \{ ok: false[\s\S]*?\}\s*if \(!verified\.ok\) \{\s*await admin\.storage\.from\(BUCKET\)\.remove/)
  expect(actions).toContain("mime_type: verified.actual.type")
  expect(actions).toContain("file_size: verified.actual.size")
})

test("batch upload keeps one primary file and stores private ordered attachments", () => {
  const actions = fs.readFileSync(path.join(process.cwd(), "app/admin/ai-tools/website-defects/actions.ts"), "utf8")
  const page = fs.readFileSync(path.join(process.cwd(), "app/admin/ai-tools/website-defects/page.tsx"), "utf8")
  const migration = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20260904194500_add_website_defect_attachments.sql"), "utf8")

  expect(actions).toContain("export async function prepareWebsiteDefectUploadsAction")
  expect(actions).toContain("export async function completeWebsiteDefectUploadsAction")
  expect(actions).toContain("const MAX_BATCH_FILE_COUNT = 6")
  expect(actions).toContain("const MAX_BATCH_TOTAL_SIZE = 250 * 1024 * 1024")
  expect(actions).toContain('String(index + 1).padStart(2, "0")')
  expect(actions).toContain('supabase.rpc("create_website_defect_batch"')
  expect(actions).toContain("exactManifest")
  expect(actions).toContain("uploaded files were kept safely")
  expect(actions).toContain("await Promise.all(files.map")
  expect(page).toContain('from("website_defect_attachments")')
  expect(page).toContain("createSignedUrls(allPaths, 60 * 60)")
  expect(page).toContain("attachmentsByDefect.get(row.id)")

  expect(migration).toContain("defect_id uuid not null references public.website_defects(id) on delete cascade")
  expect(migration).toContain("position smallint not null check (position between 1 and 5)")
  expect(migration).toContain("unique (defect_id, position)")
  expect(migration).toContain("alter table public.website_defect_attachments enable row level security")
  expect(migration).toContain("website_defects.created_by = (select auth.uid())")
  expect(migration).toContain("split_part(file_path, '/', 1) = (select auth.uid())::text")
  expect(migration).toContain("create or replace function public.create_website_defect_batch")
  expect(migration).toContain("v_primary_size + v_extra_size > 262144000")
  expect(migration).toContain("security invoker")
})
