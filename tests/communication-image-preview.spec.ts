import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

test("communication images open in an in-app preview with an original-link fallback", async () => {
  const inbox = await readFile(
    path.join(process.cwd(), "components/buildflow/unified-communication-inbox.tsx"),
    "utf8",
  )

  expect(inbox).toContain("isImageAttachment(attachment)")
  expect(inbox).toContain("Open image ${attachmentLabel(attachment, index)}")
  expect(inbox).toContain('aria-labelledby="communication-image-preview-title"')
  expect(inbox).toContain("Open original")
  expect(inbox).toContain('aria-label="Close image preview"')
  expect(inbox).toContain('event.key === "Escape"')
  expect(inbox).toContain('loading="lazy"')
})

test("non-image attachments keep their external open behavior", async () => {
  const inbox = await readFile(
    path.join(process.cwd(), "components/buildflow/unified-communication-inbox.tsx"),
    "utf8",
  )

  expect(inbox).toContain('target="_blank" rel="noopener noreferrer"')
  expect(inbox).toContain("attachment.type?.toLowerCase().startsWith(\"image/\")")
  expect(inbox).toContain("avif|gif|jpe?g|png|webp")
})
