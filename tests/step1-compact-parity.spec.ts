import { expect, test, type Page } from "@playwright/test"
import ts from "typescript"
import { existsSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"

// Actual React components, local synthetic data. Nested controls and server writes
// are stubs; this tests UI state/visibility, not database persistence.
async function fixture(page: Page, kind: "source" | "review") {
  const modules: Record<string, string> = {}, seen = new Map<string, string>()
  const stub = (code: string) => { const id = String(Object.keys(modules).length); modules[id] = code; return id }
  const empty = stub("module.exports=new Proxy({},{get:()=>()=>null})")
  const router = stub("exports.useRouter=()=>({refresh(){}})")
  const action = stub(`exports.saveReviewedRequestItemAction=async(input)=>{window.calls.push(input);const p=window.props.products[0];return {ok:true,item:p.item,source:null,revision:input.undoReceiptId?'undone':'saved',receiptId:input.undoReceiptId?null:'receipt'}}`)
  function bundle(file: string): string {
    if (seen.has(file)) return seen.get(file)!
    const id = stub(""); seen.set(file, id)
    let code = readFileSync(file, "utf8")
    if (/\.tsx?$/.test(file)) code = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
    const resolver = createRequire(file)
    modules[id] = code.replace(/require\(["']([^"']+)["']\)/g, (_all, name: string) => {
      if (name === "next/navigation") return `require('${router}')`
      if (name.endsWith("/item-edit-actions")) return `require('${action}')`
      if (name.startsWith("@/components/") || name.startsWith("@/app/") || name === "next/image" || name === "lucide-react") return `require('${empty}')`
      const base = name.startsWith("@/") ? resolve(process.cwd(), name.slice(2)) : ""
      const target = base ? [base + ".ts", base + ".tsx"].find(existsSync)! : resolver.resolve(name)
      return `require('${bundle(target)}')`
    })
    return id
  }
  const react = bundle(require.resolve("react")), dom = bundle(require.resolve("react-dom/client"))
  const component = bundle(resolve(`components/buildflow/${kind === "source" ? "request-material-worktable" : "request-item-review-list"}.tsx`))
  const item = { id: "product", name: "CDX plywood", quantity: 60, unit: "sheets", department: "Framing", metadata: { ai_organized: true, source_item_id: "source", review_status: "missing", review_reasons: ["Plywood sheet dimensions are missing"], thickness: "5/8 in" } }
  const props = kind === "source" ? { requestId: "fixture", actorId: "fixture", originalItems: [{ id: "source", name: "Free-text material list", quantity: 1, unit: "list", department: "Framing", metadata: { request_details: "Original evidence 60 plywood sheets", ai_organization_status: "organized", input_mode: "free_text" } }], organizedItems: [item], organizationStatus: "organized", currentSubstep: "received", supplierComparisons: [], suppliers: [], attachments: [{ id: "file", file_name: "original.pdf", url: "https://example.invalid/original.pdf" }], reviewProducts: [] } : { requestId: "fixture", actorId: "fixture", products: [{ item, source: null, revision: "initial" }] }
  await page.route("https://fixture.invalid/**", route => route.fulfill({ contentType: "text/html", body: '<div id="root"></div>' }))
  await page.goto("https://fixture.invalid/")
  await page.addScriptTag({ content: `(()=>{const process={env:{NODE_ENV:'production'}},cache={},modules={${Object.entries(modules).map(([id, code]) => `${JSON.stringify(id)}:function(module,exports,require){${code}}`).join(",")}};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}window.calls=[];window.props=${JSON.stringify(props)};const root=require('${dom}').createRoot(document.getElementById('root'));window.redraw=()=>root.render(require('${react}').createElement(require('${component}').${kind === "source" ? "RequestMaterialWorktable" : "RequestItemReviewList"},window.props));window.redraw();})()` })
}

test("only successful unchanged source collapses; native disclosure keeps evidence", async ({ page }) => {
  await fixture(page, "source")
  const source = page.getByTestId("original-request-draft")
  await expect(source.locator("summary")).toHaveText("Original request · 1 file")
  await expect(source.getByText("Original evidence 60 plywood sheets")).toBeHidden()
  await source.locator("summary").focus(); await page.keyboard.press("Enter")
  await expect(source.getByText("Original evidence 60 plywood sheets")).toBeVisible()
  await expect(source.getByRole("link", { name: "original.pdf" })).toBeVisible()
  for (const status of ["failed", "queued", "processing", "retrying", "draft_changed", "needs_review", ""]) {
    await page.evaluate(status => { const w = window as unknown as {props: {organizationStatus: string}, redraw: () => void}; w.props.organizationStatus = status; w.redraw() }, status)
    await expect(source.locator("summary")).toHaveCount(0)
    await expect(source.getByText("Original evidence 60 plywood sheets")).toBeVisible()
  }
  await page.evaluate(() => { const w = window as unknown as {props: {organizationStatus: string, originalItems: {metadata: {ai_organization_status: string}}[]}, redraw: () => void}; w.props.organizationStatus = "organized"; w.props.originalItems[0].metadata.ai_organization_status = "draft_changed"; w.redraw() })
  await expect(source.locator("summary")).toHaveCount(0)
})

test("single navigation preserves quick-answer Undo and exposes changed-source review", async ({ page }) => {
  await fixture(page, "review")
  await expect(page.getByRole("button", { name: "Next item needing details" })).toHaveCount(1)
  await page.getByRole("combobox", { name: "Sheet size" }).selectOption({ index: 1 })
  await expect(page.getByRole("button", { name: "Undo edit" })).toBeVisible()
  await page.getByRole("button", { name: "Undo edit" }).click()
  await expect(page.getByRole("status")).toHaveText("Edit undone")
  await page.evaluate(() => { const w = window as unknown as {props: {products: {revision: string}[]}, redraw: () => void}; w.props.products = w.props.products.map(p => ({ ...p, revision: "coworker" })); w.redraw() })
  await expect(page.getByRole("button", { name: "Review latest version" })).toBeVisible()
  await expect(page.getByRole("combobox", { name: "Sheet size" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Next item needing details" })).toHaveCount(1)
  expect(await page.evaluate(() => (window as unknown as {calls: unknown[]}).calls.length)).toBe(2)
})

test("navigation survives missing selected product; no unresolved items shows no completion claim", async ({ page }) => {
  await fixture(page, "review")
  await expect(page.getByRole("combobox", { name: "Sheet size" })).toBeVisible()
  await page.evaluate(() => { const w = window as unknown as {props: {products: {item: {id: string}, revision: string}[]}, redraw: () => void}; w.props.products = w.props.products.map(p => ({ ...p, item: { ...p.item, id: "replacement" }, revision: "new" })); w.redraw() })
  // Reviewed context may stay visible; navigation still reaches a current product.
  await page.getByRole("button", { name: "Next item needing details" }).click()
  await expect(page.getByRole("combobox", { name: "Sheet size" })).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("avantia:step1-position:v1:fixture:fixture") || "{}").itemId)).toBe("replacement")
  await page.evaluate(() => { const w = window as unknown as {props: {products: unknown[]}, redraw: () => void}; w.props.products = []; w.redraw() })
  await expect(page.getByText("No missing details flagged in this list.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Next item needing details" })).toHaveCount(0)
  expect(await page.evaluate(() => (window as unknown as {calls: unknown[]}).calls.length)).toBe(0)
})
