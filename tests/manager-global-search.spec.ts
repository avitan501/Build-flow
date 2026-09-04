import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

import { managerPageSearchResults, safeManagerDatabaseSearchTerm, type ManagerSearchAccess } from "@/lib/manager-global-search"

const root = process.cwd()
const fullAccess: ManagerSearchAccess = { owner: true, customers: true, communications: true, quotes: true, suppliers: true, aiTools: true, traffic: true, managerSettings: true }

test("global manager search finds pages through business synonyms", () => {
  expect(managerPageSearchResults("client", fullAccess).map((item) => item.title)).toContain("Customers")
  expect(managerPageSearchResults("vendor", fullAccess).map((item) => item.title)).toContain("Supplier Directory")
  expect(managerPageSearchResults("profit", fullAccess).map((item) => item.title)).toContain("Quote Comparison")
  expect(managerPageSearchResults("Carlos", fullAccess).map((item) => item.title)).toContain("Employee Work Browser")
})

test("owner-only pages stay hidden from employee search", () => {
  const employee = { ...fullAccess, owner: false }
  expect(managerPageSearchResults("payment", employee).map((item) => item.title)).not.toContain("Payments")
  expect(managerPageSearchResults("employee", employee).map((item) => item.title)).not.toContain("Employee Work Browser")
})

test("database query removes PostgREST filter control characters", () => {
  expect(safeManagerDatabaseSearchTerm("  Avi%,_()* Test  ")).toBe("Avi Test")
  expect(safeManagerDatabaseSearchTerm("משה קרמר")).toBe("משה קרמר")
})

test("admin shell exposes global search on desktop and phone", async () => {
  const [shell, route] = await Promise.all([
    readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8"),
    readFile(path.join(root, "app/api/admin/global-search/route.ts"), "utf8"),
  ])
  expect(shell).toContain("ManagerGlobalSearch access={access}")
  expect(shell).toContain("ManagerGlobalSearch access={access} mobile")
  expect(route).toContain("requireManagerPortalProfile")
  expect(route).toContain('Cache-Control": "private, no-store')
})
