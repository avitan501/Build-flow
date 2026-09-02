import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

const root = process.cwd()

test("manager deletion functions target one record and protect privileged accounts", async () => {
  const [sql, sharedUploadGuard, quotedRequestSupport] = await Promise.all([
    readFile(path.join(root, "supabase/migrations/20260812210000_add_manager_data_deletion.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260812213000_avoid_shared_upload_deletion.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260812214500_allow_quoted_request_deletion.sql"), "utf8"),
  ])

  expect(sql).toContain("delete from public.quote_requests where id = p_request_id")
  expect(sql).toContain("delete from public.projects where id = p_project_id")
  expect(sql).toContain("delete from auth.users where id = p_customer_id")
  expect(sql).toContain("target_request.status not in ('draft', 'submitted', 'in_review')")
  expect(sql).toContain("target_customer.role <> 'client'")
  expect(sql).toContain("p_customer_id = (select auth.uid())")
  expect(sql).toContain("manager_file_deletion_queue")
  expect(sharedUploadGuard).toContain("other_attachment.request_id <> p_request_id")
  expect(sharedUploadGuard).toContain("other_upload.project_id <> p_project_id")
  expect(quotedRequestSupport).toContain("('draft', 'submitted', 'in_review', 'quoted')")
  expect(sql).not.toMatch(/delete from public\.quote_requests\s*;/i)
  expect(sql).not.toMatch(/delete from public\.projects\s*;/i)
  expect(sql).not.toMatch(/delete from auth\.users\s*;/i)
})

test("customer manager hides project UI while retaining protected project deletion support", async () => {
  const [page, actions, button] = await Promise.all([
    readFile(path.join(root, "app/admin/users/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/users/actions.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/delete-manager-record-button.tsx"), "utf8"),
  ])

  expect(page).not.toContain('/admin/users?view=projects')
  expect(page).toContain('/admin/users?view=leads')
  expect(page).toContain('new Set(["draft", "submitted", "in_review", "quoted"])')
  expect(page).toContain('if (projectsResult.error) throw new Error("Failed to load customer projects.")')
  expect(page).toContain('kind="customer"')
  expect(page).not.toContain('kind="project"')
  expect(page).toContain('kind="request"')
  expect(actions).toContain('supabase.rpc("staff_delete_customer_quote_request"')
  expect(actions).toContain('supabase.rpc("staff_delete_customer_project"')
  expect(actions).toContain('supabase.rpc("staff_delete_customer_account"')
  expect(actions).not.toContain("let cleanupFailed = false")
  expect(actions).toContain("the customer account was not deleted")
  expect(actions).not.toContain("Nothing was lost")
  expect(actions).toContain("customer-file-cleanup-failed")
  expect(actions.indexOf("await cleanupQueuedFiles(\"customer\", normalizedId)")).toBeLessThan(
    actions.indexOf('supabase.rpc("staff_delete_customer_account"'),
  )
  expect(actions).toContain('message.includes("customer_files_must_be_removed_first")')
  expect(actions).toContain("stillReferenced")
  expect(actions).toContain('.maybeSingle<{ id: string }>()')
  expect(button).toContain("Are you sure you want to delete")
  expect(button).toContain("window.confirm")
  expect(button).not.toContain("window.prompt")
  expect(button).toContain("router.refresh()")
  expect(actions).toContain("const queuedFileCount")
  expect(actions).toContain("if (queuedFileCount > 0)")
  expect(actions).toContain('const { data: remaining, error: verifyError } = await supabase')
  expect(page).toContain("Owner-only account controls")
  expect(page).toContain("{isOwner ? <details")
  expect(actions).toContain("export async function changeUserRole")
  expect(actions).toContain('const { profile, supabase } = await requireAdminProfile()')
})

test("customer directory only lists clients and verifies contact updates", async () => {
  const [page, actions, form] = await Promise.all([
    readFile(path.join(root, "app/admin/users/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/users/actions.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/customer-contact-form.tsx"), "utf8"),
  ])

  expect(page).toContain('const clientCustomers = customers.filter((customer) => customer.role === "client")')
  expect(page).toContain("const filteredCustomers = clientCustomers.filter")
  expect(page).not.toContain('aria-label="Customer and request overview"')
  expect(page).toContain("clientCustomers.length")
  expect(page).toContain("CustomerContactForm")
  expect(page).toContain('aria-label="Directory order"')
  expect(page).toContain('<option value="alphabetical">A–Z</option>')
  expect(actions).toContain('select("full_name,company_name,phone,role")')
  expect(actions).toContain('saved.role !== "client"')
  expect(actions).toContain('message: "Contact saved."')
  expect(form).toContain("useActionState")
  expect(form).toContain('pending ? "Saving..." : "Save contact"')
  expect(form).toContain('role="status"')
})
