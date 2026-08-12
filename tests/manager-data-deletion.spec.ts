import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

const root = process.cwd()

test("manager deletion functions target one record and protect privileged accounts", async () => {
  const [sql, sharedUploadGuard] = await Promise.all([
    readFile(path.join(root, "supabase/migrations/20260812210000_add_manager_data_deletion.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260812213000_avoid_shared_upload_deletion.sql"), "utf8"),
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
  expect(sql).not.toMatch(/delete from public\.quote_requests\s*;/i)
  expect(sql).not.toMatch(/delete from public\.projects\s*;/i)
  expect(sql).not.toMatch(/delete from auth\.users\s*;/i)
})

test("customer manager exposes separate customer project and request deletion controls", async () => {
  const [page, actions, button] = await Promise.all([
    readFile(path.join(root, "app/admin/users/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/users/actions.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/delete-manager-record-button.tsx"), "utf8"),
  ])

  expect(page).toContain('/admin/users?view=projects')
  expect(page).toContain('kind="customer"')
  expect(page).toContain('kind="project"')
  expect(page).toContain('kind="request"')
  expect(actions).toContain('supabase.rpc("staff_delete_customer_quote_request"')
  expect(actions).toContain('supabase.rpc("staff_delete_customer_project"')
  expect(actions).toContain('supabase.rpc("staff_delete_customer_account"')
  expect(actions).toContain("stillReferenced")
  expect(actions).toContain('.maybeSingle<{ id: string }>()')
  expect(button).toContain("Type DELETE to confirm")
  expect(button).toContain("router.refresh()")
})
