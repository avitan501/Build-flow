import { expect, test, type Page } from "@playwright/test"
import ts from "typescript"
import { readFileSync, existsSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"

async function fixture(page: Page, mode: "conflict" | "network" | "recovered" = "conflict") {
  const modules: Record<string, string> = {}, seen = new Map<string, string>()
  const stub = (code: string) => { const id = String(Object.keys(modules).length); modules[id] = code; return id }
  const router = stub("exports.useRouter=()=>({refresh(){}})")
  const actions = stub(`exports.updateRequestWorkflowStepDetailsAction=async(input)=>{window.calls.push(input);if(window.calls.length===1&&'${mode}'!=='recovered')return '${mode}'==='network'?{ok:false,error:'Not saved. Retry when connected.'}:{ok:false,error:'Another person updated this step.',current:{...window.initial[0],note:'David concurrent note',assignee:'david',revision:2}};return{ok:true,record:{...window.initial[0],...input.patch,revision:input.revision+1}}}`)
  function bundle(file: string): string {
    if (seen.has(file)) return seen.get(file)!
    const id = stub(""); seen.set(file, id)
    let code = readFileSync(file, "utf8")
    if (/\.tsx?$/.test(file)) code = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
    const resolver = createRequire(file)
    code = code.replace(/require\(["']([^"']+)["']\)/g, (_all, name: string) => {
      if (name === "next/navigation") return `require(${JSON.stringify(router)})`
      if (name.endsWith("/requests/actions")) return `require(${JSON.stringify(actions)})`
      const base = name.startsWith("@/") ? resolve(process.cwd(), name.slice(2)) : ""
      return `require(${JSON.stringify(bundle(base ? [base + ".ts", base + ".tsx"].find(existsSync)! : resolver.resolve(name)))})`
    })
    modules[id] = code; return id
  }
  const react = bundle(require.resolve("react")), dom = bundle(require.resolve("react-dom/client")), component = bundle(resolve("components/buildflow/request-step-workspace.tsx"))
  const script = `(()=>{window.calls=[];window.initial=[1,2,3].map(step=>({request_id:'fixture-request',step,assignee:'carlos',note:'Baseline note',completed_override:false,revision:1,completed:false,eligible:true}));${mode === "recovered" ? `sessionStorage.setItem('avantia-step-drafts:fixture-actor:fixture-request',JSON.stringify([{step:1,patch:{note:'Recovered draft'}}]));` : ""}const process={env:{NODE_ENV:'production'}},cache={},modules={${Object.entries(modules).map(([id, code]) => `${JSON.stringify(id)}:function(module,exports,require){${code}}`).join(",")}};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}const R=require(${JSON.stringify(react)}),C=require(${JSON.stringify(component)});require(${JSON.stringify(dom)}).createRoot(document.getElementById('root')).render(R.createElement(C.RequestStepWorkspace,{initial:window.initial,actorId:'fixture-actor',available:true},R.createElement(C.RequestStepStatusPopover,{step:1})));})()`
  await page.route("http://127.0.0.1:3197/step-fixture", route => route.fulfill({ contentType: "text/html", body: '<div id="root"></div>' }))
  await page.goto("http://127.0.0.1:3197/step-fixture")
  await page.addScriptTag({ content: script })
  await page.getByRole("button", { name: /Step 1:/ }).click()
}
const calls = (page: Page) => page.evaluate(() => (window as unknown as {calls: Array<{revision:number;patch:{note?:string}}>}).calls)

test("conflict preserves typing without automatic rebase, then explicit resolution uses shown revision", async ({ page }) => {
  await fixture(page)
  await page.getByLabel("Internal note").fill("My first draft")
  await expect(page.getByLabel("Review saved step")).toContainText("David concurrent note")
  await page.getByLabel("Internal note").fill("My updated draft")
  await page.getByLabel("Responsible person").selectOption("david")
  await page.waitForTimeout(800)
  expect(await calls(page)).toHaveLength(1)
  await expect(page.getByRole("button", {name:"Retry changes"})).toHaveCount(0)
  await page.getByRole("button", {name:"Use my changes on this version"}).click()
  await expect.poll(async () => (await calls(page)).length).toBe(2)
  expect((await calls(page))[1]).toMatchObject({revision:2,patch:{note:"My updated draft",assignee:"david"}})
})

test("keeping concurrent saved version discards local patch without another write", async ({page}) => {
  await fixture(page)
  await page.getByLabel("Internal note").fill("My draft")
  await page.getByRole("button", {name:"Keep saved version"}).click()
  await expect(page.getByLabel("Internal note")).toHaveValue("David concurrent note")
  await page.waitForTimeout(800)
  expect(await calls(page)).toHaveLength(1)
})

test("legacy recovered draft without baseline requires explicit review even after more typing", async ({page}) => {
  await fixture(page,"recovered")
  await expect(page.getByLabel("Internal note")).toHaveValue("Recovered draft")
  await expect(page.getByLabel("Review saved step")).toContainText("Baseline note")
  await page.getByLabel("Internal note").fill("Recovered plus changes")
  await page.waitForTimeout(800)
  expect(await calls(page)).toHaveLength(0)
  await page.getByRole("button", {name:"Use my changes on this version"}).click()
  await expect.poll(async () => (await calls(page)).length).toBe(1)
  expect((await calls(page))[0].revision).toBe(1)
})

test("network failure preserves newest text until ordinary explicit Retry", async ({page}) => {
  await fixture(page,"network")
  await page.getByLabel("Internal note").fill("First")
  await expect(page.getByRole("button",{name:"Retry changes"})).toBeVisible()
  await page.getByLabel("Internal note").fill("Newest")
  await page.waitForTimeout(800)
  expect(await calls(page)).toHaveLength(1)
  await page.getByRole("button",{name:"Retry changes"}).click()
  await expect.poll(async () => (await calls(page)).length).toBe(2)
  expect((await calls(page))[1]).toMatchObject({revision:1,patch:{note:"Newest"}})
})
