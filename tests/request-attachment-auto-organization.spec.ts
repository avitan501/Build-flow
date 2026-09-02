import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()

async function source(file: string) {
  return readFile(path.join(root, file), "utf8")
}

test("adding files to an existing request schedules one safe forced reorganization", async () => {
  const [actions, scheduler, organizer] = await Promise.all([
    source("app/owner/materials/requests/actions.ts"),
    source("lib/material-request-organization.ts"),
    source("supabase/functions/client-material-list-ai/index.ts"),
  ])

  const scheduleAt = actions.indexOf("scheduleClientMaterialListOrganization({ requestId, force: true })")
  const attachmentLoopAt = actions.indexOf("for (const attachment of attachments)")
  expect(scheduleAt).toBeGreaterThan(attachmentLoopAt)
  expect(actions.slice(attachmentLoopAt, scheduleAt)).toContain("attachment_record_failed")
  expect(scheduler).toContain("after(async () =>")
  expect(scheduler).toContain('"client-material-list-ai"')
  expect(scheduler).toContain("force: input.force === true")
  expect(organizer).toContain('ai_organization_status === "processing"')
  expect(organizer).toContain('metadata?.ai_organized === true')
  expect(organizer).toContain('metadata?.ai_organized !== true')
})

test("David can create an attachment-only request and AI receives its files", async () => {
  const [actions, component] = await Promise.all([
    source("app/admin/users/actions.ts"),
    source("components/buildflow/manager-create-client-request.tsx"),
  ])

  expect(actions).toContain("!lines.length && !freeText && !attachments.length")
  expect(actions).toContain('freeText || !lines.length ? [{ name: "Free-text material list"')
  expect(actions).toContain("if (freeText || attachments.length) scheduleClientMaterialListOrganization")
  expect(component).toContain("const hasMaterialInput = attachments.length > 0")
  expect(component).toContain("!hasMaterialInput")
  expect(component).toContain("attach the client&apos;s photo/PDF below")
})

test("file limits remain enforced before request mutation", async () => {
  const [actions, component, attachmentInput] = await Promise.all([
    source("app/admin/users/actions.ts"),
    source("components/buildflow/manager-create-client-request.tsx"),
    source("supabase/functions/client-material-list-ai/attachment-input.ts"),
  ])

  expect(actions).toContain("attachments.length > 10")
  expect(actions).toContain("PROJECT_UPLOAD_MAX_FILE_SIZE_BYTES")
  expect(component).toContain("const MAX_ATTACHMENT_COUNT = 10")
  expect(component).toContain("const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024")
  expect(attachmentInput).toContain("MAX_ATTACHMENT_COUNT = 8")
  expect(attachmentInput).toContain("MAX_TOTAL_ATTACHMENT_BYTES = 32 * 1024 * 1024")
})
