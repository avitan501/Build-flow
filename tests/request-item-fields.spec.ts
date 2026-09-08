import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import { normalizeRequestItemFields, requestItemFieldSummary, requestItemFieldsFromMetadata, requestItemFieldsMetadata } from "../lib/request-item-fields"

test("normalizes common and custom request fields without inventing values", () => {
  expect(normalizeRequestItemFields([
    { id: "color", label: "Wrong label", value: "  Natural  " },
    { id: "custom-1", label: "  Installation area ", value: " Kitchen  " },
    { id: "shipping", label: "Shipping", value: "" },
  ])).toEqual([
    { id: "color", label: "Color", value: "Natural" },
    { id: "custom-1", label: "Installation area", value: "Kitchen" },
  ])
})

test("loads legacy details and stores common plus custom fields in existing metadata", () => {
  const fields = requestItemFieldsFromMetadata({ dimensions: "7 in. x 48 in.", thickness: "5 mm", shipping: "Jobsite delivery" })
  expect(fields).toEqual(expect.arrayContaining([
    { id: "dimensions", label: "Size / dimensions", value: "7 in. x 48 in." },
    { id: "thickness", label: "Thickness", value: "5 mm" },
    { id: "shipping", label: "Shipping / delivery", value: "Jobsite delivery" },
  ]))

  const metadata = requestItemFieldsMetadata([...fields, { id: "custom-1", label: "Room", value: "Living room" }])
  expect(metadata.dimensions).toBe("7 in. x 48 in.")
  expect(metadata.shipping).toBe("Jobsite delivery")
  expect(metadata.request_item_fields).toContainEqual({ id: "custom-1", label: "Room", value: "Living room" })
  expect(requestItemFieldSummary(metadata)).toContain("Room: Living room")
})

test("editor is a mobile portal with explicit save, common dropdown values, and custom fields", async () => {
  const root = process.cwd()
  const [editor, actions] = await Promise.all([
    readFile(path.join(root, "components/buildflow/original-request-item-editor.tsx"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/actions.ts"), "utf8"),
  ])

  expect(editor).toContain("createPortal")
  expect(editor).toContain("max-h-[92dvh]")
  expect(editor).toContain('aria-label="Add item detail"')
  expect(editor).toContain("New custom field")
  expect(editor).toContain("Save changes")
  expect(editor).toContain("requestItemFields")
  expect(editor).not.toContain("useSequencedAutosave")
  expect(actions).toContain("requestItemFieldsMetadata")
  expect(actions).toContain("fields?: RequestItemField[]")
})

test("saved item details reach supplier requests, search, charts, and workspace summaries", async () => {
  const root = process.cwd()
  const paths = [
    "components/buildflow/request-material-worktable.tsx",
    "components/buildflow/organized-material-list.tsx",
    "lib/client-material-review.ts",
    "lib/supplier-quote-routing.ts",
    "lib/request-material-chart.ts",
    "app/owner/materials/requests/[requestId]/supplier-request/page.tsx",
  ]
  const sources = await Promise.all(paths.map((file) => readFile(path.join(root, file), "utf8")))
  for (const source of sources) expect(source).toContain("requestItemFieldSummary")
})
