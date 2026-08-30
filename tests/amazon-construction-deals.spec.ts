import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()

test("manager tools exposes an owner-only Amazon construction deals desk backed by the verified affiliate record", async () => {
  const [tools, page] = await Promise.all([
    readFile(path.join(root, "app/admin/ai-tools/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/construction-amazon-deals/page.tsx"), "utf8"),
  ])

  expect(tools).toContain('href: "/admin/ai-tools/construction-amazon-deals"')
  expect(tools).toContain('title: "Amazon Construction Deals"')
  expect(page).toContain('if (!access.aiTools || !access.owner) redirect("/")')
  expect(page).toContain('.from("affiliate_programs")')
  expect(page).toContain('.eq("supplier_name", "Amazon Associates")')
  expect(page).toContain('.from("affiliate_program_checklist")')
  expect(page).toContain("{completedChecklist} of {checklist.length} complete")
  expect(page).toContain("recordAmazonAffiliateLinkAction")
  expect(page).toContain("Sync verified setup")
  expect(page).toContain("needsVerifiedSync")
  expect(page).toContain("No automatic deal feed is connected.")
  expect(page).toContain("not proof of a deal")
  expect(page).toContain('rel="noopener noreferrer sponsored"')
  expect(page).not.toMatch(/\$\d|sale price|percent off/i)
})
