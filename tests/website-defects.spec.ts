import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import { canManageWebsiteDefects, canReportWebsiteDefects } from "@/lib/website-defects-access"
import { normalizeWebsiteDefectFileType, retryWebsiteDefectUpload, validateWebsiteDefectFiles, WEBSITE_DEFECT_MAX_FILES, WEBSITE_DEFECT_MAX_FILE_SIZE, WEBSITE_DEFECT_MAX_TOTAL_SIZE, websiteDefectDeploymentIsStale, websiteDefectUploadErrorMessage } from "@/lib/website-defect-upload"

const root = process.cwd()

test("Manager Tools exposes a private website defect issue inbox", async () => {
  const [tools, dashboard, page, actions, inbox, migration, accessMigration] = await Promise.all([
    readFile(path.join(root, "app/admin/ai-tools/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/build-map/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/website-defects/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/website-defects/actions.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/website-defect-inbox.tsx"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260903205430_create_website_defects.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260904053000_protect_website_defect_management.sql"), "utf8"),
  ])

  expect(tools).toContain('href: "/admin/ai-tools/website-defects"')
  expect(tools).toContain('title: "Website Defects"')
  expect(dashboard).toContain('href: "/admin/ai-tools/website-defects"')
  expect(dashboard).toContain('label: "Website Defects"')
  expect(page).toContain("requireManagerPortalProfile")
  expect(page).toContain("!canReportWebsiteDefects(access)")
  expect(page).toContain("canManage={canManageWebsiteDefects(access)}")
  expect(page).toContain('createSignedUrls(allPaths')
  expect(page).toContain('from("website_defect_attachments")')
  expect(actions).toContain("prepareWebsiteDefectUploadAction")
  expect(actions).toContain("completeWebsiteDefectUploadAction")
  expect(actions).toContain("updateWebsiteDefectAction")
  expect(actions).toContain("recordWebsiteQaCheckAction")
  expect(actions).toContain("MAX_FILE_SIZE = 100 * 1024 * 1024")
  expect(actions).toContain('"video/quicktime"')
  expect(actions).toContain("expectedFilePath")
  expect(actions).toContain("reporterContext()")
  expect(actions).toContain("ownerContext()")
  expect(inbox).toContain("and create issue")
  expect(inbox).toContain("Ready to verify")
  expect(inbox).toContain("Codex review / fix notes")
  expect(inbox).toContain("Required website checks")
  expect(inbox).toContain("Last checked:")
  expect(inbox).toContain("canManage: boolean")
  expect(inbox).toContain("Review the latest owner-verified results.")
  expect(inbox).toContain("prepareWebsiteDefectUploadsAction")
  expect(inbox).toContain("completeWebsiteDefectUploadsAction")
  expect(inbox).toContain("Connection interrupted—retrying file")
  expect(inbox).toContain("selected.file.slice(0, selected.file.size, selected.fileType)")
  expect(inbox).toContain('isError ? "Try upload again"')
  expect(inbox).toContain("websiteDefectDeploymentIsStale")
  expect(inbox).toContain("Open latest version")
  expect(inbox).toContain('target="_blank"')
  expect(inbox).toContain('multiple accept="video/mp4')
  expect(inbox).toContain('aria-label="Selected issue files"')
  expect(inbox).toContain("Remove ${file.name}")
  expect(inbox).toContain("WebsiteDefectAttachmentRecord")
  expect(inbox).toContain("issue.attachments ?? []")
  expect(inbox).toContain("{index + 1}/{media.length}")
  expect(migration).toContain("alter table public.website_defects enable row level security")
  expect(migration).toContain("public = false")
  expect(migration).toContain("website_defect_files_manager_read")
  expect(migration).toContain("website_defects_manager_update")
  expect(migration).toContain("create table if not exists public.website_qa_checks")
  expect(migration).toContain("Send a message as a client")
  expect(migration).toContain("Create and send a proposal")
  expect(accessMigration).toContain("create policy website_defects_owner_update")
  expect(accessMigration).toContain("create policy website_qa_checks_owner_update")
  expect(accessMigration).toContain("create policy website_defect_files_owner_delete")
  expect(accessMigration).not.toContain("private.is_staff())")
})

test("a stale Website Defects tab detects the latest release without looping an old Server Action", async () => {
  const responseFor = (release: string) => async () => new Response(JSON.stringify({ release }), { status: 200 })
  expect(await websiteDefectDeploymentIsStale(responseFor("bbbbbbb") as typeof fetch, "aaaaaaa")).toBe(true)
  expect(await websiteDefectDeploymentIsStale(responseFor("AAAAAAA") as typeof fetch, "aaaaaaa")).toBe(false)
  expect(await websiteDefectDeploymentIsStale(async () => { throw new Error("offline") }, "aaaaaaa")).toBe(false)
  expect(await websiteDefectDeploymentIsStale(responseFor("bbbbbbb") as typeof fetch, "development")).toBe(false)
})

test("mobile file metadata is normalized without accepting unapproved formats", () => {
  expect(normalizeWebsiteDefectFileType({ name: "Screenshot.jpg", type: "image/jpg" })).toBe("image/jpeg")
  expect(normalizeWebsiteDefectFileType({ name: "screen-recording.mp4", type: "" })).toBe("video/mp4")
  expect(normalizeWebsiteDefectFileType({ name: "screen-recording.MOV", type: "application/octet-stream" })).toBe("video/quicktime")
  expect(normalizeWebsiteDefectFileType({ name: "screen-recording.exe", type: "" })).toBe("")
  expect(normalizeWebsiteDefectFileType({ name: "fake.jpg", type: "application/x-msdownload" })).toBe("")
})

test("one website issue accepts a bounded multi-file selection", () => {
  const photo = { name: "screen.jpg", type: "image/jpeg", size: 1024 }
  expect(WEBSITE_DEFECT_MAX_FILES).toBe(6)
  expect(WEBSITE_DEFECT_MAX_FILE_SIZE).toBe(100 * 1024 * 1024)
  expect(WEBSITE_DEFECT_MAX_TOTAL_SIZE).toBe(250 * 1024 * 1024)
  expect(validateWebsiteDefectFiles([photo, { name: "recording.mp4", type: "video/mp4", size: 2048 }])).toBeNull()
  expect(validateWebsiteDefectFiles(Array.from({ length: 7 }, (_, index) => ({ ...photo, name: `${index}.jpg` })))).toContain("up to 6")
  expect(validateWebsiteDefectFiles([{ ...photo, size: WEBSITE_DEFECT_MAX_FILE_SIZE + 1 }])).toContain("100 MB")
  expect(validateWebsiteDefectFiles([
    { name: "one.mp4", type: "video/mp4", size: 90 * 1024 * 1024 },
    { name: "two.mp4", type: "video/mp4", size: 90 * 1024 * 1024 },
    { name: "three.mp4", type: "video/mp4", size: 90 * 1024 * 1024 },
  ])).toContain("250 MB")
})

test("secure upload retries only transient failures and gives actionable safe errors", () => {
  expect(retryWebsiteDefectUpload({ status: 503 })).toBe(true)
  expect(retryWebsiteDefectUpload({ status: 429 })).toBe(true)
  expect(retryWebsiteDefectUpload(new TypeError("Failed to fetch"))).toBe(true)
  expect(retryWebsiteDefectUpload({ status: 403 })).toBe(false)
  expect(retryWebsiteDefectUpload({ status: 415 })).toBe(false)
  expect(websiteDefectUploadErrorMessage({ status: 403 })).toContain("session expired")
  expect(websiteDefectUploadErrorMessage({ status: 413 })).toContain("under 100 MB")
  expect(websiteDefectUploadErrorMessage({ status: 415 })).toContain("MP4")
  expect(websiteDefectUploadErrorMessage(new TypeError("secret backend detail"))).not.toContain("secret")
})

test("approved operations staff can report defects but only the owner can manage them", () => {
  expect(canReportWebsiteDefects({ owner: true, operationsManager: false })).toBe(true)
  expect(canReportWebsiteDefects({ owner: false, operationsManager: true })).toBe(true)
  expect(canReportWebsiteDefects({ owner: false, operationsManager: false })).toBe(false)
  expect(canManageWebsiteDefects({ owner: true, operationsManager: false })).toBe(true)
  expect(canManageWebsiteDefects({ owner: false, operationsManager: true })).toBe(false)
})

test("website defect uploads stay private and become numbered trackable issues", async () => {
  const migration = await readFile(path.join(root, "supabase/migrations/20260903205430_create_website_defects.sql"), "utf8")
  expect(migration).toContain("issue_number bigint generated by default as identity unique")
  expect(migration).toContain("'new', 'reviewing', 'fixing', 'ready_to_verify', 'resolved'")
  expect(migration).toContain("file_size between 1 and 104857600")
  expect(migration).toContain("(storage.foldername(name))[1] = (select auth.uid())::text")
  expect(migration).not.toMatch(/to anon[\s\S]*using \(true\)/)
})
