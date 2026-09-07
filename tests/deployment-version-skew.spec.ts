import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

const read = (file: string) => readFile(path.join(process.cwd(), file), "utf8")

test("production assets and Server Actions use the Vercel commit as deployment ID", async () => {
  const config = await read("next.config.ts")

  expect(config).toContain("deploymentId:")
  expect(config).toContain("process.env.VERCEL_GIT_COMMIT_SHA")
  expect(config).toContain("process.env.NEXT_DEPLOYMENT_ID")
})

test("staff activity reporting never leaves a rejected Server Action unhandled", async () => {
  const reporter = await read("components/buildflow/employee-activity-reporter.tsx")

  expect(reporter).toContain("recordEmployeeActivityAction(")
  expect(reporter).toContain(").catch(() => undefined)")
})
