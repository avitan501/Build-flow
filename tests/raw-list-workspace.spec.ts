import { readFile } from "node:fs/promises"
import { expect, test } from "@playwright/test"

test("raw intake placeholders cannot become selectable supplier products", async () => {
  const source = await readFile("components/buildflow/request-material-worktable.tsx", "utf8")
  expect(source).toContain(': originalItems.filter((item) => !isRawFreeTextContainer(item))')
  expect(source).toContain('!rawDraft || aiItems.length > 0 ? <RequestSubstepFunnel')
  expect(source).not.toContain("Edit first. AI organizes only after you choose it.")
  expect(source).toContain("Your original is safe. Splitting did not finish.")
  expect(source).toContain('mode="group"')
  expect(source).toContain('mode="batch"')
  expect(source).not.toContain("supplierRouteVersion(")
})

test("processing refresh repeats while status is unchanged and cleans up", async () => {
  const source = await readFile("components/buildflow/material-organization-status.tsx", "utf8")
  expect(source).toContain("window.setInterval")
  expect(source).toContain("window.clearInterval(timer)")
  expect(source).toContain('document.visibilityState === "visible"')
  expect(source).toContain("Delayed · retrying automatically")
  expect(source).toContain("if (!active) return")
})
