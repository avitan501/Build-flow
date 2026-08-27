import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

const root = process.cwd()

test("material requests stay draft until the customer sends them", async () => {
  const [button, actions] = await Promise.all([
    readFile(path.join(root, "components/buildflow/add-to-project-button.tsx"), "utf8"),
    readFile(path.join(root, "app/projects/quote-request-actions.ts"), "utf8"),
  ])

  expect(button).toContain('deferSubmit = true')
  expect(button).toContain('searchParams.get("request")')
  expect(button).toContain("Add to this same request")
  expect(button).toContain("Review request")
  expect(button).toContain("submitMaterialRequestDraftAction")
  expect(actions).toContain("input.complete && !input.deferSubmit")
  expect(actions).toContain("submitMaterialRequestDraftAction")
  expect(actions).toContain('.eq("status", "draft")')
})

test("framing uses one compact upload and an explicit regular lumber option", async () => {
  const [category, wizard] = await Promise.all([
    readFile(path.join(root, "components/buildflow/shop-tool-category-page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/material-questionnaire-wizard.tsx"), "utf8"),
  ])

  expect(category).toContain("Upload plan or material list")
  expect(category).not.toContain("Upload framer list")
  expect(category).not.toContain("Upload blueprint\"")
  expect(wizard).toContain('role="radiogroup"')
  expect(wizard).toContain("Regular lumber")
  expect(wizard).toContain('scrollIntoView({ behavior: "smooth", block: "center" })')
})
