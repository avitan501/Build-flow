import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()

test("catalog uses the approved short action labels", async () => {
  const source = await readFile(path.join(root, "components/buildflow/material-catalog-workspace.tsx"), "utf8")

  for (const label of [
    "Online Prices",
    "All Prices",
    "Import",
    "Ask AI",
    "Complete",
    "Send for Approval",
    "Ready",
    "Review",
    "Published",
    "Documents",
  ]) {
    expect(source).toContain(label)
  }

  expect(source).not.toContain(">Check ZIP price<")
  expect(source).not.toContain(">Manage all supplier prices<")
  expect(source).not.toContain(">Needs review<")
})

test("catalog list expands until an item opens the closable details panel", async () => {
  const source = await readFile(path.join(root, "components/buildflow/material-catalog-workspace.tsx"), "utf8")

  expect(source).toContain('selectedItem ? "lg:grid-cols-[minmax(0,1fr)_22rem]" : "grid-cols-1"')
  expect(source).toContain("setSelectedItemId(item.id)")
  expect(source).toContain("setSelectedItemId(null)")
  expect(source).toContain('aria-label="Close details"')
  expect(source).toContain('className="flex min-w-0 items-center gap-1.5 overflow-x-auto"')
})

test("supplier prices stay compact and only the best three are shown", async () => {
  const source = await readFile(path.join(root, "components/buildflow/material-catalog-workspace.tsx"), "utf8")

  expect(source).toContain(".slice(0, 3)")
  expect(source).toContain('className="flex w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-left"')
  expect(source).toContain('text-[10px] font-semibold')
})
