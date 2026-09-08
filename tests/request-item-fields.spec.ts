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
  expect(editor).toContain("Edit original request")
  expect(editor).toContain("Save draft")
  expect(editor).toContain("Save & organize")
  expect(editor).toContain("maxLength={20_000}")
  expect(editor).toContain("organizeClientMaterialRequestAction")
  expect(editor).toContain("requestItemFields")
  expect(editor).not.toContain("useSequencedAutosave")
  expect(actions).toContain("requestItemFieldsMetadata")
  expect(actions).toContain("fields?: RequestItemField[]")
  expect(actions).toContain('ai_organization_status: "draft_changed"')
  expect(actions).toContain("slice(0, 20_000)")
})

test("request draft offers the construction fields needed before AI organization", async () => {
  const root = process.cwd()
  const fields = await readFile(path.join(root, "lib/request-item-fields.ts"), "utf8")
  for (const label of ["Color", "Brand", "Packaging", "Shipping / delivery", "Delivery address", "Price requirements"]) {
    expect(fields).toContain(`label: "${label}"`)
  }
})

test("AI reads manager fields, grounds photo details, and stores structured attributes", async () => {
  const root = process.cwd()
  const organizer = await readFile(path.join(root, "supabase/functions/client-material-list-ai/index.ts"), "utf8")

  expect(organizer).toContain("User-confirmed fields")
  expect(organizer).toContain('Use key custom and preserve the manager\'s label')
  expect(organizer).toContain("visibly legible in an attached photo or document")
  expect(organizer).toContain("never guess a brand or color from appearance alone")
  expect(organizer).toContain("Common sense is allowed only")
  expect(organizer).toContain('Never create an attribute whose value is the word "Missing"')
  expect(organizer).toContain("2 pallets, 72 boxes in each pallet, 23.21 square feet per box")
  expect(organizer).toContain("quantity 144 boxes")
  expect(organizer).toContain("request_item_fields: requestItemFields")
  expect(organizer).toContain("request_item_field_evidence: requestItemFieldEvidence")
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
