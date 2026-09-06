import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

const root = process.cwd()
const read = (file: string) => readFile(path.join(root, file), "utf8")

test("Manager Tools keeps one route per tool and uses compact, consistent cards", async () => {
  const [page, meet] = await Promise.all([
    read("app/admin/ai-tools/page.tsx"),
    read("components/buildflow/google-meet-launcher.tsx"),
  ])

  expect(page.match(/href: "\/admin\/ai-tools\/internal-library"/g) ?? []).toHaveLength(1)
  expect(page).toContain('min-h-[4.75rem]')
  expect(page).toContain("transition-[border-color,box-shadow]")
  expect(page).not.toContain('>Open</span>')
  expect(meet).toContain('min-h-[4.75rem]')
  expect(meet).toContain("inline-flex min-h-11")
})

test("standalone AI tools have compact headings, back navigation, and 44px actions", async () => {
  const [material, estimate, order, media, defects, knowledge, smsLab] = await Promise.all([
    read("app/admin/ai-tools/material-list/page.tsx"),
    read("app/admin/ai-tools/estimate-converter/page.tsx"),
    read("app/admin/ai-tools/order-test/page.tsx"),
    read("components/buildflow/media-messages-library.tsx"),
    read("components/buildflow/website-defect-inbox.tsx"),
    read("app/admin/ai-tools/construction-knowledge/page.tsx"),
    read("app/admin/ai-tools/sms-replies/SmsReplyLab.tsx"),
  ])

  for (const page of [material, estimate, order]) {
    expect(page).toContain('href="/admin/ai-tools"')
    expect(page).toContain("min-h-11")
    expect(page).not.toContain('text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">AI Tools')
  }
  expect(media).not.toContain("sm:text-6xl")
  expect(media).not.toContain("min-h-10")
  expect(defects).toContain("Upload up to 6 recordings or screenshots for one problem.")
  expect(defects).toContain('min-h-11 w-full')
  expect(knowledge).not.toMatch(/className="h-(?:9|10) [^"]*"/)
  expect(smsLab).toContain("min-h-11")
})
