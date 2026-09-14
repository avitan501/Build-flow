import { expect, test } from "@playwright/test"
import { sourceFileChangeNotice } from "../lib/request-source-file-change"
import { canonicalItemValue, itemEditSnapshot } from "../lib/request-item-continuity"
const before = { id: "one", name: "Plywood", quantity: 60, unit: "sheets", department: "Framing", metadata: { thickness: "5/8" } }
test("file metadata changes exact edit snapshot without changing known details", () => {
  const after = { ...before, metadata: { ...before.metadata, source_file_change: { revision: "new", event: "insert", file_name: "updated-plan.pdf" } } }
  expect(canonicalItemValue(itemEditSnapshot(after))).not.toBe(canonicalItemValue(itemEditSnapshot(before)))
  expect(sourceFileChangeNotice(before, after)).toContain("Request file added: updated-plan.pdf")
  expect(sourceFileChangeNotice(before, after)).toContain("not been re-extracted")
  expect(sourceFileChangeNotice(after, after)).toBeNull()
  expect(after.metadata.thickness).toBe("5/8")
})
test("notice never renders storage directories or unlimited document content", () => {
  const after = { ...before, metadata: { source_file_change: { revision: "new", event: "delete", file_name: "private/path/plan\n.pdf" } } }
  expect(sourceFileChangeNotice(before, after)).toContain("removed: plan.pdf")
  expect(sourceFileChangeNotice(before, after)).not.toContain("private")
  expect(sourceFileChangeNotice(before, before)).toBeNull()
})
