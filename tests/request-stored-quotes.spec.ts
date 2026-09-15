import { test, expect } from "@playwright/test"
import { requestStoredQuoteCount } from "../lib/request-stored-quote-count"
import { readFile } from "node:fs/promises"

test("stored quote is visible before it becomes a bid", () => {
  expect(requestStoredQuoteCount([{ bids: [], documents: [{}] }])).toBe(1)
  expect(requestStoredQuoteCount([{ bids: [{ sourceQuoteId: "one" }], documents: [{ id: "one" }] }])).toBe(1)
  expect(requestStoredQuoteCount([{ bids: [{}], documents: [{ id: "one" }] }])).toBe(2)
  expect(requestStoredQuoteCount([{ bids: [], documents: [{},{},{}] }])).toBe(3)
})

test("existing source intake checks permissions, ownership and prior storage before reading", async () => {
  const source = await readFile("app/admin/supplier-quotes/actions.ts", "utf8")
  const intake = source.slice(source.indexOf('const requestAttachmentId ='), source.indexOf('if (!(file instanceof File)'))
  expect(intake).toContain('requireStaffProfile("customers")')
  expect(intake).toContain('attachment.owner_id !== sourceRequest.owner_id')
  expect(intake).toContain('attachment.source_party !== "supplier"')
  expect(intake).toContain('.eq("request_id", requestedId)')
  expect(intake.indexOf('if (existing) return')).toBeLessThan(intake.indexOf('.download(attachment.file_path)'))
  expect(intake).not.toContain('.delete(')
  const panel = await readFile("components/buildflow/request-management-panel.tsx", "utf8")
  expect(panel).toContain('ReceivedSupplierQuoteTable quotes=')
  expect(panel).toContain('requestStoredQuoteCount(comparisons)')
  const upload = source.slice(source.indexOf('export async function uploadSupplierQuoteAction'), source.indexOf('export async function saveSupplierQuoteAction'))
  expect(upload).toContain('synchronizeExistingItems: false')
  const table = await readFile("components/buildflow/received-supplier-quote-table.tsx", "utf8")
  expect(table).toContain('aria-label="Received supplier quotes"')
  expect(table).toContain('Unreviewed prices are not verified matches.')
  expect(table).not.toContain('routeSupplierQuoteAction')
})
