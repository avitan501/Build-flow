import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

const root = process.cwd()

test("saved client documents expose compact Open, Edit, and confirmed Delete actions", async () => {
  const panel = await readFile(path.join(root, "components/buildflow/request-management-panel.tsx"), "utf8")
  expect(panel).toContain('aria-label="Saved client documents"')
  expect(panel).toContain('group/document-actions relative')
  expect(panel).toContain('>Actions<ChevronDown')
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
  expect(panel).toContain("setQuoteTerms(proposalTermsForEditor(saved?.documentData.terms")
  expect(panel).toContain("runDocumentActionWithApprovalWarning(saveRequestClientDocumentAction)")
})

test("resending unchanged documents keeps the current version and approval", async () => {
  const actions = await readFile(path.join(root, "app/owner/materials/requests/actions.ts"), "utf8")
  const panel = await readFile(path.join(root, "components/buildflow/request-management-panel.tsx"), "utf8")
  const migration = await readFile(path.join(root, "supabase/migrations/20260906172708_only_version_changed_client_documents.sql"), "utf8")

  expect(actions).toContain("requestClientDocumentContentMatches(existing.document_data, prepared.pdfInput)")
  expect(actions).toContain("documentChanged: false")
  expect(actions).toContain('rpc("get_request_current_client_document_acceptances"')
  expect(actions).toContain("requiresAcceptedChangeConfirmation: true")
  expect(actions).toContain("input.confirmAcceptedChange === true")
  expect(panel).toContain("runDocumentActionWithApprovalWarning")
  expect(panel).toContain("the client must approve it again")
  expect(panel).toContain("The existing client approval remains valid")
  expect(migration).toContain("new.document_data is distinct from old.document_data")
  expect(migration).toContain("new.version := old.version")
  expect(migration).toContain("new.version := old.version + 1")
})

test("text activity does not claim delivery before provider confirmation", async () => {
  const actions = await readFile(path.join(root, "app/owner/materials/requests/actions.ts"), "utf8")
  expect(actions).toContain("Delivery is confirmed only when the messaging provider reports it.")
  expect(actions).not.toContain("The client received the live document link.")
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
