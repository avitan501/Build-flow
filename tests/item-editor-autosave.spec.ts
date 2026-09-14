import { expect, test, type Page } from "@playwright/test"
import ts from "typescript"
import { readFileSync, existsSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"

async function fixture(page: Page, options: { conflict?: boolean; raw?: boolean; add?: boolean; organized?: boolean; missingUnit?: boolean } = {}) {
  const modules: Record<string, string> = {}, seen = new Map<string, string>()
  const stub = (code: string) => { const id = String(Object.keys(modules).length); modules[id] = code; return id }
  const router = stub("exports.useRouter=()=>({refresh(){}})")
  const actions = stub(`window.calls=[];window.events=[];
    exports.saveOriginalMaterialItemAction=async(input)=>{window.calls.push(input);window.events.push('save');await new Promise(r=>setTimeout(r,80));if(${!!options.conflict})return{ok:false,conflict:true,error:'Changed elsewhere'};return{ok:true,expectedItemSnapshot:{...input.expectedItemSnapshot,name:input.name,quantity:input.quantity,unit:input.unit,metadata:{...input.expectedItemSnapshot?.metadata,request_details:input.details}}}};
    exports.organizeClientMaterialRequestAction=async()=>{window.events.push('organize');return{ok:true}};
    exports.updateOrganizedMaterialItemAction=async()=>{throw Error('Unsafe fallback used')};`)
  const reviewed = stub(`exports.saveReviewedRequestItemAction=async(input)=>{window.calls.push(input);window.events.push('reviewed');await new Promise(r=>setTimeout(r,80));return{ok:true,revision:'revision-'+window.calls.length,item:{...window.fixtureItem,...input.edit},source:null,receiptId:'receipt'}}`)
  function bundle(file: string): string {
    if (seen.has(file)) return seen.get(file)!
    const id = stub(""); seen.set(file, id)
    let code = readFileSync(file, "utf8")
    if (/\.tsx?$/.test(file)) code = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
    const resolver = createRequire(file)
    code = code.replace(/require\(["']([^"']+)["']\)/g, (_all, name: string) => {
      if (name === "next/navigation") return `require(${JSON.stringify(router)})`
      if (name.endsWith("/requests/actions")) return `require(${JSON.stringify(actions)})`
      if (name.endsWith("/requests/item-edit-actions")) return `require(${JSON.stringify(reviewed)})`
      const base = name.startsWith("@/") ? resolve(process.cwd(), name.slice(2)) : ""
      const target = base ? [base + ".ts", base + ".tsx"].find(existsSync)! : resolver.resolve(name)
      return `require(${JSON.stringify(bundle(target))})`
    })
    modules[id] = code; return id
  }
  const react = bundle(require.resolve("react")), dom = bundle(require.resolve("react-dom/client")), component = bundle(resolve("components/buildflow/original-request-item-editor.tsx"))
  const item = { id: "22222222-2222-4222-8222-222222222222", name: options.raw ? "Free-text material list" : "Valve", department: "Plumbing", quantity: 1, unit: options.missingUnit ? null : "each", qualification_status: "not_required", metadata: { request_details: "Original notes", ai_organized: Boolean(options.organized) } }
  const props = { requestId: "11111111-1111-4111-8111-111111111111", actorId: "fixture-actor", ...(options.add ? { mode: "add" } : { item }), ...(options.organized ? { itemKind: "organized", revision: "revision-0" } : {}) }
  const script = `(()=>{window.fixtureItem=${JSON.stringify(item)};const process={env:{NODE_ENV:'production'}},cache={},modules={${Object.entries(modules).map(([id, code]) => `${JSON.stringify(id)}:function(module,exports,require){${code}}`).join(",")}};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}require(${JSON.stringify(dom)}).createRoot(document.getElementById('root')).render(require(${JSON.stringify(react)}).createElement(require(${JSON.stringify(component)}).OriginalRequestItemEditor,${JSON.stringify(props)}));})()`
  await page.route("http://127.0.0.1:3197/item-editor-fixture", route => route.fulfill({ contentType: "text/html", body: '<div id="root"></div>' }))
  await page.goto("http://127.0.0.1:3197/item-editor-fixture")
  await page.addScriptTag({ content: script })
  await page.getByRole("button", { name: options.add ? "Add item" : options.raw ? "Edit draft" : "Edit", exact: true }).click()
}

test("opening makes no write, incomplete stays local, successive saves advance original snapshot and close flushes", async ({ page }) => {
  await fixture(page)
  await expect(page.getByRole("button", { name: /Save changes|Save draft/ })).toHaveCount(0)
  await page.waitForTimeout(800); expect(await page.evaluate(() => (window as unknown as { calls: unknown[] }).calls.length)).toBe(0)
  await page.getByLabel("Quantity", { exact: true }).fill("")
  await page.waitForTimeout(800); expect(await page.evaluate(() => (window as unknown as { calls: unknown[] }).calls.length)).toBe(0)
  await page.getByRole("button", { name: "Done", exact: true }).click(); await expect(page.getByRole("dialog")).toBeVisible()
  await page.getByLabel("Quantity", { exact: true }).fill("2"); await expect(page.getByRole("status")).toHaveText("Saved automatically")
  await page.getByLabel("Quantity", { exact: true }).fill("3"); await expect.poll(() => page.evaluate(() => (window as unknown as { calls: unknown[] }).calls.length)).toBe(2)
  await expect(page.getByRole("status")).toHaveText("Saved automatically")
  expect(await page.evaluate(() => (window as unknown as { calls: { expectedItemSnapshot: { quantity: number } }[] }).calls.map(c => c.expectedItemSnapshot.quantity))).toEqual([1, 2])
  await page.getByLabel("Quantity", { exact: true }).fill("4"); await page.getByRole("button", { name: "Done", exact: true }).click(); await expect(page.getByRole("dialog")).toHaveCount(0)
  expect(await page.evaluate(() => (window as unknown as { calls: unknown[] }).calls.length)).toBe(3)
})

test("conflict preserves typed text, stops later typing and prevents close", async ({ page }) => {
  await fixture(page, { conflict: true }); await page.getByLabel("Quantity", { exact: true }).fill("2")
  await expect(page.getByText("Changed elsewhere")).toBeVisible()
  await page.getByLabel("Quantity", { exact: true }).fill("3"); await page.waitForTimeout(800)
  expect(await page.evaluate(() => (window as unknown as { calls: unknown[] }).calls.length)).toBe(1)
  expect(await page.evaluate(() => { const event = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented })).toBe(true)
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toHaveCount(0)
  await page.getByRole("button", { name: "Done", exact: true }).click(); await expect(page.getByRole("dialog")).toBeVisible(); await expect(page.getByLabel("Quantity", { exact: true })).toHaveValue("3")
  await page.evaluate(() => { const link = document.createElement("a"); link.href = "/other-page"; link.textContent = "Leave"; document.body.appendChild(link); link.click() })
  await page.waitForTimeout(150); expect(page.url()).toContain("item-editor-fixture")
  page.once("dialog", dialog => dialog.dismiss())
  await page.getByRole("button", { name: "Discard unsaved changes", exact: true }).click(); await expect(page.getByLabel("Quantity", { exact: true })).toHaveValue("3")
  page.once("dialog", dialog => dialog.accept())
  await page.getByRole("button", { name: "Discard unsaved changes", exact: true }).click(); await expect(page.getByRole("dialog")).toHaveCount(0)
})

test("AI remains explicit and runs only after acknowledged raw text save", async ({ page }) => {
  await fixture(page, { raw: true }); await page.getByLabel("Request text", { exact: false }).fill("First line\nSecond line")
  await page.getByRole("button", { name: "Organize with AI", exact: true }).click(); await expect(page.getByRole("dialog")).toHaveCount(0)
  expect(await page.evaluate(() => (window as unknown as { events: string[] }).events)).toEqual(["save", "organize"])
})

test("organized edit uses acknowledged revision for subsequent autosave", async ({ page }) => {
  await fixture(page, { organized: true }); await page.getByLabel("Quantity", { exact: true }).fill("2"); await expect(page.getByRole("status")).toHaveText("Saved automatically")
  await page.getByLabel("Quantity", { exact: true }).fill("3"); await expect.poll(() => page.evaluate(() => (window as unknown as { calls: unknown[] }).calls.length)).toBe(2)
  expect(await page.evaluate(() => (window as unknown as { calls: { revision: string }[] }).calls.map(c => c.revision))).toEqual(["revision-0", "revision-1"])
})

test("Add item stays explicit and is created once", async ({ page }) => {
  await fixture(page, { add: true }); await page.getByLabel("Item", { exact: true }).fill("New fixture valve")
  await page.waitForTimeout(800); expect(await page.evaluate(() => (window as unknown as { calls: unknown[] }).calls.length)).toBe(0)
  await page.getByRole("dialog").getByRole("button", { name: "Add item", exact: true }).click(); await expect(page.getByRole("dialog")).toHaveCount(0)
  expect(await page.evaluate(() => (window as unknown as { calls: unknown[] }).calls.length)).toBe(1)
})

test("an unknown existing unit stays blank and is not inferred on open or unrelated typing", async ({ page }) => {
  await fixture(page, { missingUnit: true })
  await expect(page.getByLabel("Unit", { exact: true })).toHaveValue("")
  await page.getByLabel("Item", { exact: true }).fill("Valve edited")
  await page.waitForTimeout(800)
  expect(await page.evaluate(() => (window as unknown as { calls: unknown[] }).calls.length)).toBe(0)
  await expect(page.getByRole("status")).toHaveText("Incomplete · not saved")
})

test("browser Back cannot drop an incomplete dialog draft", async ({ page }) => {
  await fixture(page)
  await page.getByLabel("Quantity", { exact: true }).fill("")
  await page.evaluate(() => history.back())
  await expect(page.getByRole("dialog")).toBeVisible()
  await expect(page.getByText("Complete the empty fields before leaving. Your draft is still here.")).toBeVisible()
  expect(page.url()).toContain("item-editor-fixture")
  await page.getByLabel("Quantity", { exact: true }).fill("5")
  await page.evaluate(() => history.back())
  await expect(page.getByRole("dialog")).toHaveCount(0)
  expect(await page.evaluate(() => (window as unknown as { calls: { quantity: number }[] }).calls.at(-1)?.quantity)).toBe(5)
})
