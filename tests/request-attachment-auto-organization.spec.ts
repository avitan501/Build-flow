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
