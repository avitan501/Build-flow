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
  const [component, actions, customerPage, inboxPage] = await Promise.all([
    readFile(path.join(root, "components/buildflow/manager-create-client-request.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/users/actions.ts"), "utf8"),
    readFile(path.join(root, "app/admin/users/page.tsx"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/page.tsx"), "utf8"),
  ])

  expect(component).toContain("Create request for a client")
  expect(component).toContain("Add item")
  expect(component).toContain("grid place-items-center")
  expect(actions).toContain("createRequestForClientAction")
  expect(actions).toContain('requireStaffProfile("customers")')
  expect(actions).toContain('created_by_manager: true')
  expect(actions).toContain('status: "submitted"')
  expect(customerPage).toContain("ManagerCreateClientRequest")
  expect(inboxPage).toContain("ManagerCreateClientRequest")
})
