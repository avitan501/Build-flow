import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

const root = process.cwd()

test("direct checkout removes project selection and preserves manager request details", async () => {
  const [button, actions, ownerDetail] = await Promise.all([
    readFile(path.join(root, "components/buildflow/add-to-project-button.tsx"), "utf8"),
    readFile(path.join(root, "app/projects/quote-request-actions.ts"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/[requestId]/page.tsx"), "utf8"),
  ])

  expect(button).not.toContain("Choose a project")
  expect(button).not.toContain("Create a project first")
  expect(button).toContain("Sign in to send your request")
  expect(button).toContain("grid place-items-center")
  expect(actions).toContain("ensureDirectRequestProject")
  expect(actions).toContain('DIRECT_REQUEST_PROJECT_NAME = "Material Requests"')
  expect(ownerDetail).toContain('answers,metadata')
  expect(ownerDetail).toContain("Request breakdown")
  expect(ownerDetail).toContain("request_details")
  expect(ownerDetail).toContain("answer_display_snapshot")
})

test("manager can create a structured request on behalf of a client", async () => {
  const [component, actions, apiRoute, requestMigration, customerPage, inboxPage] = await Promise.all([
    readFile(path.join(root, "components/buildflow/manager-create-client-request.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/users/actions.ts"), "utf8"),
    readFile(path.join(root, "app/api/admin/client-requests/route.ts"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260814024500_create_client_request_atomically.sql"), "utf8"),
    readFile(path.join(root, "app/admin/users/page.tsx"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/page.tsx"), "utf8"),
  ])

  expect(component).toContain("Create request for a client")
  expect(component).toContain("+ Add new client")
  expect(component).not.toContain("Existing client")
  expect(component).not.toContain("clientMode")
  expect(component).toContain('value="new"')
  expect(component).toContain("No department")
  expect(component).toContain('fetch("/api/admin/client-requests"')
  expect(component).toContain("window.location.assign")
  expect(component).toContain("Add item")
  expect(component).toContain("grid place-items-center")
  expect(actions).toContain("createRequestForClientAction")
  expect(actions).toContain('requireStaffProfile("customers")')
  expect(actions).toContain('supabase.rpc("staff_create_client_request"')
  expect(actions).toContain('const storedDepartment = department || "Unassigned"')
  expect(actions).toContain("admin.auth.admin.createUser")
  expect(requestMigration).toContain("create or replace function public.staff_create_client_request")
  expect(requestMigration).toContain("jsonb_array_length(p_lines) > 50")
  expect(requestMigration).toContain("'created_by_manager', true")
  expect(requestMigration).toContain("'submitted', now()")
  expect(requestMigration).toContain("private.has_staff_capability('customers')")
  expect(requestMigration).toContain("revoke all on function public.staff_create_client_request")
  expect(apiRoute).toContain("createRequestForClientAction")
  expect(apiRoute).toContain("sameOrigin")
  expect(apiRoute).toContain("No order was submitted")
  expect(customerPage.match(/<ManagerCreateClientRequest/g)).toHaveLength(1)
  expect(inboxPage).toContain("ManagerCreateClientRequest")
})

test("manager request endpoint rejects unsafe or invalid submissions before database access", async ({ request }) => {
  const crossSite = await request.post("/api/admin/client-requests", {
    headers: { origin: "https://malicious.example", "content-type": "application/json" },
    data: {},
  })
  expect(crossSite.status()).toBe(403)
  expect(await crossSite.json()).toEqual({ ok: false, error: "This request was blocked for security." })

  const invalidFormat = await request.post("/api/admin/client-requests", {
    headers: { "content-type": "text/plain" },
    data: "invalid",
  })
  expect(invalidFormat.status()).toBe(415)
  expect(await invalidFormat.json()).toEqual({ ok: false, error: "The request format was not accepted." })
})

test("manager reply composer supports templates attachments email and text", async () => {
  const [panel, actions, email] = await Promise.all([
    readFile(path.join(root, "components/buildflow/request-management-panel.tsx"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/actions.ts"), "utf8"),
    readFile(path.join(root, "lib/cart-submission-email.ts"), "utf8"),
  ])

  expect(panel).toContain("REPLY_BLOCKS")
  expect(panel).toContain("Good morning")
  expect(panel).toContain("Attach quote or order")
  expect(panel).toContain("Open text message")
  expect(panel).toContain("sms:")
  expect(actions).toContain('formData.get("attachment")')
  expect(actions).toContain("10 * 1024 * 1024")
  expect(actions).toContain('client_action: "email_reply"')
  expect(email).toContain("attachments: input.attachment ? [input.attachment] : undefined")
})
