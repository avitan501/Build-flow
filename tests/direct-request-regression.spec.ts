import { access, readFile } from "node:fs/promises"
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
  expect(ownerDetail).toContain("Review client list")
  expect(ownerDetail).toContain("request_details")
  expect(ownerDetail).toContain("answer_display_snapshot")
  expect(ownerDetail).toContain('const { supabase } = await requireStaffProfile("customers")')
  expect(ownerDetail).not.toContain("createAdminClient")
})

test("manager can create, assign, and archive a structured request on behalf of a client", async () => {
  const [component, actions, apiRoute, requestMigration, customerPage, inboxPage, clientFunction, requestActions, statusControl, assigneeControl, assigneeMigration, catalogAdmin] = await Promise.all([
    readFile(path.join(root, "components/buildflow/manager-create-client-request.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/users/actions.ts"), "utf8"),
    readFile(path.join(root, "app/api/admin/client-requests/route.ts"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260814024500_create_client_request_atomically.sql"), "utf8"),
    readFile(path.join(root, "app/admin/users/page.tsx"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/page.tsx"), "utf8"),
    readFile(path.join(root, "supabase/functions/create-manager-client/index.ts"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/actions.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/material-request-status-control.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/material-request-assignee-control.tsx"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260826220722_add_material_request_assignee.sql"), "utf8"),
    readFile(path.join(root, "components/buildflow/owner-materials-admin-shell.tsx"), "utf8"),
  ])

  expect(component).toContain("Create request for a client")
  expect(component).toContain("+ Add new client")
  expect(component).not.toContain("Existing client")
  expect(component).not.toContain("clientMode")
  expect(component).toContain('value="new"')
  expect(component).toContain("No department")
  expect(component).toContain('fetch("/api/admin/client-requests"')
  expect(component).toContain('/owner/materials/requests/${encodeURIComponent(result.requestId)}')
  expect(component).not.toContain('/owner/materials/requests?created=')
  expect(component).toContain("window.location.assign")
  expect(component).toContain("Add item")
  expect(component).toContain("Paste list")
  expect(component).toContain("Create and organize")
  expect(component).toContain("Email or phone — enter at least one.")
  expect(component).toContain("!newClient.email.trim() && !newClient.phone?.trim()")
  expect(component).toContain("freeText")
  expect(component).toContain("grid place-items-center")
  expect(actions).toContain("createRequestForClientAction")
  expect(actions).toContain("normalizeClientContact")
  expect(actions).toContain("phoneLoginEmailForPhone")
  expect(actions).toContain('requireStaffProfile("customers")')
  expect(actions).toContain('supabase.rpc("staff_create_client_request"')
  expect(actions).toContain('supabase.functions.invoke("client-material-list-ai"')
  expect(actions).toContain('name: "Free-text material list"')
  expect(actions).toContain('const storedDepartment = department || "Unassigned"')
  expect(actions).toContain('supabase.functions.invoke<{')
  expect(actions).toContain('>("create-manager-client"')
  expect(actions).not.toContain("Add the new client from the customer directory first")
  expect(clientFunction).toContain("admin.auth.admin.createUser")
  expect(clientFunction).toContain('password: `${crypto.randomUUID()}Aa1!`')
  expect(clientFunction).not.toContain('`${crypto.randomUUID()}${crypto.randomUUID()}Aa1!`')
  expect(clientFunction).toContain("can_manage_customers")
  expect(clientFunction).toContain("admin.auth.getUser(token)")
  expect(clientFunction).toContain('return json({ ok: true, customerId }, 201)')
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
  expect(inboxPage).toContain("Client request created successfully")
  expect(inboxPage).toContain("MaterialRequestStatusControl")
  expect(inboxPage).toContain("Archived requests")
  expect(inboxPage).not.toContain("/admin/settings/material-order-questions")
  expect(catalogAdmin).not.toContain("/admin/settings/material-order-questions")
  expect(requestActions).toContain("updateMaterialRequestStatusAction")
  expect(requestActions).toContain('manager_action: "request_status"')
  expect(requestActions).toContain('.update({ status }).eq("id", requestId).select("id")')
  expect(statusControl).toContain("Archive this material request?")
  expect(statusControl).toContain("Restore")
  expect(statusControl).not.toContain(">Close<")
  expect(statusControl).toContain("Quote sent")
  expect(assigneeControl).toContain('label: "Carlos"')
  expect(assigneeControl).toContain('label: "David"')
  expect(requestActions).toContain("updateMaterialRequestAssigneeAction")
  expect(assigneeMigration).toContain("manager_assignee text not null default 'carlos'")
  expect(assigneeMigration).toContain("manager_assignee in ('carlos', 'david')")
  await expect(access(path.join(root, "app/admin/settings/material-order-questions/page.tsx"))).rejects.toThrow()
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
  const [panel, actions, email, edgeFunction, workflowStep] = await Promise.all([
    readFile(path.join(root, "components/buildflow/request-management-panel.tsx"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/actions.ts"), "utf8"),
    readFile(path.join(root, "lib/cart-submission-email.ts"), "utf8"),
    readFile(path.join(root, "supabase/functions/send-supplier-quote/index.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/request-workflow-step-header.tsx"), "utf8"),
  ])

  expect(panel).toContain("REPLY_BLOCKS")
  expect(panel).toContain("Ask for missing details")
  expect(panel).toContain("To finish pricing, please confirm:")
  expect(panel).toContain("step={4}")
  expect(panel).toContain('open={currentStage === "approval" || currentStage === "delivery"}')
  expect(panel).not.toContain("lg:grid-cols-2")
  expect(panel).toContain("Good morning")
  expect(panel).toContain(">Greeting<select")
  expect(panel).toContain(">Follow-up<select")
  expect(panel).toContain("Preview message")
  expect(panel).not.toContain("toggleReplyBlock")
  expect(panel).toContain("Attach quote, order, photo, or file")
  expect(panel).toContain("Open Q U O with file")
  expect(panel).toContain("sendAuraMessageAction")
  expect(panel).toContain("prepareQuoAttachmentMessageAction")
  expect(panel).not.toContain("Attachments can only be sent by email")
  expect(actions).toContain('formData.get("attachment")')
  expect(actions).toContain("10 * 1024 * 1024")
  expect(actions).toContain('client_action: "email_reply"')
  expect(actions).toContain('requireStaffProfile("customers")')
  expect(actions).toContain('action: "send_client_reply"')
  expect(actions).toContain('supabase.functions.invoke')
  expect(panel).toContain("Create and send estimate")
  expect(panel).toContain("Download PDF")
  expect(panel).toContain("Text estimate")
  expect(panel).toContain("Send WhatsApp")
  expect(panel).toContain("Call client")
  expect(workflowStep).toContain("RequestWorkflowStepToggle")
  expect(actions).toContain("sendRequestClientQuoteAction")
  expect(actions).toContain("previewRequestClientQuoteAction")
  expect(email).toContain("attachments: input.attachment ? [input.attachment] : undefined")
  expect(edgeFunction).toContain('action === "send_client_reply"')
  expect(edgeFunction).toContain("can_manage_customers")
})

test("manager can review and send one request to multiple suppliers", async () => {
  const [panel, page, draft, actions] = await Promise.all([
    readFile(path.join(root, "components/buildflow/request-management-panel.tsx"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/[requestId]/supplier-request/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/supplier-request-draft.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/vendors/actions.ts"), "utf8"),
  ])

  expect(panel).toContain('type="checkbox"')
  expect(panel).toContain("Find Supplier")
  expect(panel).toContain("Recommended suppliers")
  expect(panel).toContain("Contact {supplierIds.length")
  expect(panel).toContain("saveRequestSupplierPlanAction")
  expect(panel).toContain("supplier-request?")
  expect(panel).not.toContain("Save supplier routing")
  expect(page).toContain("quote_request_items")
  expect(page).toContain("supplierIds.includes")
  expect(page).toContain('requireStaffProfile("suppliers")')
  expect(draft).toContain("Shipping or job address")
  expect(draft).toContain("Email subject")
  expect(draft).toContain("Items and request details")
  expect(draft).toContain('type DeliveryChannel = "email" | "sms" | "whatsapp"')
  expect(draft).toContain("Exact message preview")
  expect(draft).toContain("sendAuraMessageAction")
  expect(actions).toContain("for (const supplierId of supplierIds)")
  expect(actions).toContain('body: { requestId }')
})

test("supplier directory opens a compact profile dialog above the list", async () => {
  const manager = await readFile(path.join(root, "components/buildflow/supplier-routing-manager.tsx"), "utf8")
  expect(manager).toContain("supplierProfileOpen")
  expect(manager).toContain('role="dialog"')
  expect(manager).toContain('aria-labelledby="supplier-profile-title"')
  expect(manager).toContain("max-h-[94dvh]")
  expect(manager).toContain("Automatic service routing ·")
})
