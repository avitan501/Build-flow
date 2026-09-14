import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"

test("request directory keeps links and filters without destructive or generic card clutter", async () => {
  const source = await readFile("app/admin/users/page.tsx", "utf8")
  const card = source.slice(source.indexOf("function requestCard("), source.indexOf("  return (\n    <main"))
  expect(card).not.toContain("DeleteManagerRecordButton")
  expect(card).not.toContain("Direct material request")
  expect(card).not.toContain("Manual material list")
  expect(card).toContain('request.status !== "submitted"')
  expect(card).toContain("/owner/materials/requests/${request.id}")
  expect(card).toContain("request.projects?.address")
  expect(card).toContain("ArchivedRequestRestoreButton")
  expect(source).toContain('status !== "all" && request.status !== status')
})

test("detail keeps deletion collapsed, confirmed, and gated with safe return", async () => {
  const detail = await readFile("app/owner/materials/requests/[requestId]/page.tsx", "utf8")
  expect(detail).toContain('data-testid="request-actions"')
  expect(detail).toContain('Request actions ···</summary>')
  expect(detail).toContain('["draft", "submitted", "in_review", "quoted"].includes(request.status)')
  expect(detail).toContain("returnToRequests />")
  const button = await readFile("components/buildflow/delete-manager-record-button.tsx", "utf8")
  expect(button).toContain("if (!confirmDeletion()) return")
  expect(button).toContain('kind === "request" && returnToRequests')
  expect(button).toContain('router.replace("/admin/users?view=requests")')
  expect(button.indexOf('if (!result.ok)')).toBeLessThan(button.indexOf('router.replace('))
  const actions = await readFile("app/admin/users/actions.ts", "utf8")
  const deletion = actions.slice(actions.indexOf("export async function deleteOpenRequestAction"), actions.indexOf("export async function deleteProjectAction"))
  expect(deletion).toContain("if (!permanentDeletionIsEnabled())")
  expect(deletion).toContain('requireStaffProfile("customers")')
  expect(deletion).toContain('supabase.rpc("staff_delete_customer_quote_request"')
})
