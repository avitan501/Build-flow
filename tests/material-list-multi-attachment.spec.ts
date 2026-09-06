import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

import {
  attachmentMimeType,
  canAddMaterialListAttachment,
  materialListAttachmentCandidates,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_COUNT,
  MAX_ATTACHMENT_SCAN_COUNT,
  MAX_TOTAL_ATTACHMENT_BYTES,
  type MaterialListAttachment,
} from "../supabase/functions/client-material-list-ai/attachment-input"

function attachment(name: string, type: string | null, size: number | null = 1_000): MaterialListAttachment {
  return { file_name: name, file_path: `requests/${name}`, file_type: type, file_size: size }
}

test("keeps multiple compatible request attachments in their saved order", () => {
  const candidates = materialListAttachmentCandidates([
    attachment("page-1.pdf", "application/pdf"),
    attachment("site-photo.jpg", "image/jpeg"),
    attachment("notes.txt", "text/plain"),
    attachment("page-2.pdf", "application/pdf"),
  ])

  expect(candidates.map((candidate) => candidate.file_name)).toEqual([
    "page-1.pdf",
    "site-photo.jpg",
    "page-2.pdf",
  ])
})

test("infers supported media types when older attachment rows have no MIME type", () => {
  expect(attachmentMimeType(attachment("LIST.PDF", null))).toBe("application/pdf")
  expect(attachmentMimeType(attachment("photo.jpeg", null))).toBe("image/jpeg")
  expect(attachmentMimeType(attachment("drawing.svg", null))).toBe("")
})

test("bounds candidate scanning, per-file bytes, total payload bytes, and included files", () => {
  const many = Array.from({ length: MAX_ATTACHMENT_SCAN_COUNT + 5 }, (_, index) => attachment(`page-${index}.pdf`, "application/pdf"))
  expect(materialListAttachmentCandidates(many)).toHaveLength(MAX_ATTACHMENT_SCAN_COUNT)
  expect(materialListAttachmentCandidates([
    attachment("too-large.pdf", "application/pdf", MAX_ATTACHMENT_BYTES + 1),
    attachment("valid.pdf", "application/pdf", MAX_ATTACHMENT_BYTES),
  ]).map((candidate) => candidate.file_name)).toEqual(["valid.pdf"])

  expect(canAddMaterialListAttachment(0, 0, MAX_ATTACHMENT_BYTES)).toBe(true)
  expect(canAddMaterialListAttachment(MAX_ATTACHMENT_COUNT, 0, 1)).toBe(false)
  expect(canAddMaterialListAttachment(0, MAX_TOTAL_ATTACHMENT_BYTES - 10, 11)).toBe(false)
  expect(canAddMaterialListAttachment(0, 0, MAX_ATTACHMENT_BYTES + 1)).toBe(false)
})

test("organizer combines every accepted attachment while preserving manual-row replacement behavior", async () => {
  const source = await readFile(path.join(process.cwd(), "supabase/functions/client-material-list-ai/index.ts"), "utf8")

  expect(source).toContain("for (const attachment of candidates)")
  expect(source).not.toMatch(/attachments\s*\?\?\s*\[\]\)\.find/)
  expect(source).toContain("All attached files belong to the same customer request")
  expect(source).toContain('metadata?.ai_organized !== true')
  expect(source).toContain('metadata?.ai_organized === true')
  expect(source).toContain("source_item_id: matchedSource?.id || source.id")
})
