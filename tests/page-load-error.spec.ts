import { expect, test } from "@playwright/test"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { renderToStaticMarkup } from "react-dom/server"
import ts from "typescript"

const localRequire = createRequire(`${process.cwd()}/package.json`)
const source = readFileSync("components/buildflow/page-load-error.tsx", "utf8")
const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText

test("error recovery is readable, hides internal details and only retries on explicit click", () => {
  let retries = 0
  const captured: unknown[] = []
  const exports: Record<string, (props: unknown) => ReturnType<typeof localRequire>> = {}
  new Function("exports", "require", compiled)(exports, (id: string) => {
    if (id === "react") return { useEffect: (effect: () => void) => effect() }
    if (id === "@sentry/nextjs") return { captureException: (error: unknown) => captured.push(error) }
    return localRequire(id)
  })
  const error = new Error("internal database detail")
  const element = exports.PageLoadError({ error, retry: () => { retries++ } })
  const html = renderToStaticMarkup(element)
  expect(html).toContain("Couldn’t load this page")
  expect(html).toContain("Reload page")
  expect(html).not.toContain(error.message)
  expect(html).toContain("background:#fff")
  expect(retries).toBe(0)
  expect(captured).toEqual([error])
  const button = element.props.children.props.children.find((child: { type: string }) => child.type === "button")
  expect(button.props.type).toBe("button")
  button.props.onClick()
  expect(retries).toBe(1)
})

test("route and global boundaries use refresh-capable retry and request loading is accessible", () => {
  expect(readFileSync("app/error.tsx", "utf8")).toContain("PageLoadError as default")
  const global = readFileSync("app/global-error.tsx", "utf8")
  expect(global).toContain("retry={retry}")
  expect(global).toContain('background: "#fff"')
  const loading = readFileSync("app/owner/materials/requests/[requestId]/loading.tsx", "utf8")
  expect(loading).toContain('role="status"')
  expect(loading).toContain("Loading request…")
  expect(source).not.toMatch(/setInterval|setTimeout|fetch\(/)
})
