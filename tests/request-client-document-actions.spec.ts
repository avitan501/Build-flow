import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

const root = process.cwd()

test("saved client documents expose real Open, Edit, and confirmed Delete actions", async () => {
  const panel = await readFile(path.join(root, "components/buildflow/request-management-panel.tsx"), "utf8")
  expect(panel).toContain('aria-label="Saved client documents"')
  expect(panel).toContain('target="_blank"')
  expect(panel).toContain("openDocument(saved.documentType, saved)")
  expect(panel).toContain("deleteClientDocument(saved)")
  expect(panel).toContain("window.confirm(`Delete ${label}")
  expect(panel).toContain("Its live client link will stop working. This cannot be undone.")
  expect(panel).toContain("deleteRequestClientDocumentAction")
  expect(panel).toContain('deletingDocument === deletionKey ? "Deleting…" : "Delete"')
  expect(panel).toContain("setDeletedDocumentTokens((current)")
  expect(panel).toContain("The document could not be deleted. Check the connection and try again.")
})

test("editing an existing document prefills the composer from its selected saved version", async () => {
  const panel = await readFile(path.join(root, "components/buildflow/request-management-panel.tsx"), "utf8")
  expect(panel).toContain("selectedDocument?: RequestClientDocumentSnapshot")
  expect(panel).toContain("selectedDocument ?? clientDocuments.find")
  expect(panel).toContain("setQuoteNumber(saved?.documentNumber")
  expect(panel).toContain("setQuoteLines(saved?.documentData.lines?.length")
  expect(panel).toContain("setQuoteTerms(includeRequiredProposalTerms(saved?.documentData.terms")
  expect(panel).toContain("saveRequestClientDocumentAction(quoteInput())")
})

test("delete action verifies the exact version, protects accepted documents, and records activity", async () => {
  const actions = await readFile(path.join(root, "app/owner/materials/requests/actions.ts"), "utf8")
  expect(actions).toContain('requireStaffProfile("customers")')
  expect(actions).toContain('rpc("get_request_current_client_document_acceptances"')
  expect(actions).toContain("saved.version !== version")
  expect(actions).toContain("admin = createAdminClient()")
  expect(actions).toContain('admin.from("request_client_documents")')
  expect(actions).toContain('.eq("public_token", publicToken)')
  expect(actions).toContain('.eq("version", version)')
  expect(actions).toContain('deleteError?.code === "23503"')
  expect(actions).toContain("has a recorded client acceptance and cannot be deleted")
  expect(actions).toContain('client_action: "client_document_deleted"')
  expect(actions).toContain("revalidatePath(`/client-document/${publicToken}`)")
})
