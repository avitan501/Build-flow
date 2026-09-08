import fs from "node:fs"
import path from "node:path"
import { test, expect } from "@playwright/test"

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")

test("request, client, lead, and item names expose direct edit actions", () => {
  const page = read("app/owner/materials/requests/[requestId]/page.tsx")
  const editor = read("components/buildflow/request-inline-name-editor.tsx")
  const actions = read("app/owner/materials/requests/actions.ts")
  const projectEventsMigration = read("supabase/migrations/010_create_project_events.sql")
  const leads = read("components/buildflow/client-target-outreach.tsx")
  const items = read("components/buildflow/request-material-worktable.tsx")
  expect(page).toContain('kind="request"')
  expect(page).toContain('kind="client"')
  expect(editor).toContain("updateMaterialRequestTitleAction")
  expect(editor).toContain("updateMaterialRequestClientNameAction")
  expect(projectEventsMigration).toContain("'note_added'")
  expect(actions).not.toContain('event_type: "request_updated"')
  for (const actionName of ["updateMaterialRequestTitleAction", "updateMaterialRequestClientNameAction"]) {
    const actionStart = actions.indexOf(`export async function ${actionName}`)
    const actionEnd = actions.indexOf("export async function", actionStart + 1)
    expect(actionStart).toBeGreaterThan(-1)
    expect(actions.slice(actionStart, actionEnd)).toContain('event_type: "note_added"')
  }
  expect(leads).toContain("<EditOutreachLead lead={lead}>{lead.full_name}</EditOutreachLead>")
  expect(items).toContain('trigger="content"')
})

test("estimate tax location offers current service-area presets and keeps manual editing", () => {
  const panel = read("components/buildflow/request-management-panel.tsx")
  const location = read("lib/location-search.ts")
  expect(panel).toContain('label: "NY · Nassau County", rate: 8.625')
  expect(panel).toContain('label: "NY · Suffolk County", rate: 8.75')
  expect(panel).toContain('label: "NY · New York City", rate: 8.875')
  expect(panel).toContain('label: "New Jersey", rate: 6.625')
  expect(panel).toContain("setTaxLocationPreset(\"custom\")")
  expect(location).toContain('normalizedCounty.includes("suffolk")')
  expect(location).toContain('jurisdiction: "New York City"')
})
