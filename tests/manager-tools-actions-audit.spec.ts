import { access, readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

const root = process.cwd()

const cardRoutes = [
  "/admin/ai-tools/media-messages",
  "/admin/ai-tools/website-defects",
  "/admin/ai-tools/aura",
  "/admin/ai-tools/internal-library",
  "/admin/ai-tools/construction-amazon-deals",
  "/admin/ai-tools/locate-cheap-item",
  "/admin/ai-tools/sms-replies",
  "/admin/documents",
  "/admin/ai-tools/material-list",
  "/shop/wood-floor/flooring-calculator",
  "/admin/abc",
  "/admin/traffic",
] as const

test("every Manager Tools card resolves to a real page and restricted cards match their destination", async () => {
  const tools = await readFile(path.join(root, "app/admin/ai-tools/page.tsx"), "utf8")

  for (const route of cardRoutes) {
    expect(tools).toContain(`href: "${route}"`)
    await expect(access(path.join(root, "app", route.replace(/^\//, ""), "page.tsx"))).resolves.toBeUndefined()
  }

  expect(tools).toContain('...(access.customers ? [{ href: "/admin/ai-tools/sms-replies"')
  expect(tools).toContain('...(access.suppliers ? [{ href: "/admin/documents"')
  expect(tools).toContain('...(access.traffic ? [{ href: "/admin/traffic"')
  expect(tools.match(/\.\.\.\(access\.owner \?/g)).toHaveLength(4)
})

test("interactive Manager Tools actions use the same capability as their visible page", async () => {
  const [locatePage, locateApi, smsPage, smsActions, defectPage, defectActions] = await Promise.all([
    readFile(path.join(root, "app/admin/ai-tools/locate-cheap-item/page.tsx"), "utf8"),
    readFile(path.join(root, "app/api/admin/catalog/exa-search/route.ts"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/sms-replies/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/sms-replies/actions.ts"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/website-defects/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/website-defects/actions.ts"), "utf8"),
  ])

  expect(locatePage).toContain("!access.aiTools")
  expect(locateApi).toContain('requireStaffProfile("aiTools")')
  expect(locateApi).not.toContain('requireStaffProfile("quotes")')

  expect(smsPage).toContain("!access.aiTools || !access.customers")
  expect(smsActions).toContain("!access.aiTools || !access.customers")

  expect(defectPage).toContain("!access.aiTools")
  expect(defectActions).toContain("!context.access.aiTools")
  for (const action of [
    "prepareWebsiteDefectUploadAction",
    "completeWebsiteDefectUploadAction",
    "updateWebsiteDefectAction",
    "recordWebsiteQaCheckAction",
  ]) expect(defectActions).toContain(`export async function ${action}`)
})

test("primary client-side buttons are wired to concrete handlers and protected APIs", async () => {
  const [organizer, locator, media, defectInbox, replyLab, meet] = await Promise.all([
    readFile(path.join(root, "components/buildflow/material-list-organizer.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/locate-cheap-item-preview.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/media-messages-library.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/website-defect-inbox.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/sms-replies/SmsReplyLab.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/google-meet-launcher.tsx"), "utf8"),
  ])

  for (const handler of ["onClick={organize}", "onClick={copy}", "onClick={downloadCsv}", "onClick={() => setRows"])
    expect(organizer).toContain(handler)
  expect(locator).toContain('fetch("/api/admin/catalog/exa-search"')
  expect(locator).toContain("onClick={analyze}")
  expect(locator).toContain("onClick={copyList}")
  expect(media).toContain("navigator.clipboard.writeText")
  expect(media).toContain("Open draft")
  expect(defectInbox).toContain("prepareWebsiteDefectUploadAction")
  expect(defectInbox).toContain("completeWebsiteDefectUploadAction")
  expect(defectInbox).toContain("updateWebsiteDefectAction")
  expect(defectInbox).toContain("recordWebsiteQaCheckAction")
  expect(replyLab).toContain('fetch("/api/admin/communications/ai-quality"')
  expect(replyLab).toContain("onClick={runLab}")
  expect(meet).toContain('fetch("/api/admin/google-meet"')
})

test("Material List Organizer only collects and organizes reviewable English and Spanish input", async () => {
  const [page, organizer] = await Promise.all([
    readFile(path.join(root, "app/admin/ai-tools/material-list/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/material-list-organizer.tsx"), "utf8"),
  ])
  expect(page).toContain("English or Spanish")
  expect(page).toContain("Nothing is ordered or sent")
  expect(organizer).toContain('aria-label="Material quantity"')
  expect(organizer).toContain('aria-label="Material unit"')
  expect(organizer).toContain("Notes / confirmation")
  expect(organizer).toContain("does not choose a product")
  expect(organizer).toContain("place an order")
  expect(organizer).toContain("Review every highlighted interpretation")
})
