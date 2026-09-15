import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import ts from "typescript"

async function mount(page: import("@playwright/test").Page) {
  const modules: string[] = [], seen = new Map<string, number>()
  function bundle(file: string): number {
    if (seen.has(file)) return seen.get(file)!
    const id = modules.length; seen.set(file, id); modules.push("")
    let code = readFileSync(file, "utf8")
    if (/\.tsx?$/.test(file)) code = ts.transpileModule(code, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
    const resolver = createRequire(file)
    modules[id] = code.replace(/require\(["']([^"']+)["']\)/g, (_, name) => `require(${bundle(resolver.resolve(name))})`)
    return id
  }
  const react = bundle(require.resolve("react")), dom = bundle(require.resolve("react-dom/client")), hook = bundle(resolve("components/buildflow/use-communication-draft.ts"))
  await page.addScriptTag({ content: `(()=>{const process={env:{NODE_ENV:'production'}},modules=[${modules.map(code => `function(module,exports,require){${code}}`).join(",")}],cache={};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}
    const R=require(${react}),h=R.createElement,useDraft=require(${hook}).useCommunicationDraft;
    function App(){const[scope,S]=R.useState('actor-a'),[thread,T]=R.useState('email:a@example.test');
      const[subject,setSubject,failed,clearSubject]=useDraft(scope,thread,'Re: Original','subject');
      const[body,setBody,,clearBody]=useDraft(scope,thread,'');
      return h('main',null,h('input',{'aria-label':'Subject',value:subject,onChange:e=>setSubject(e.target.value)}),h('input',{'aria-label':'Body',value:body,onChange:e=>setBody(e.target.value)}),
       h('output',null,failed?'Storage unavailable':'Saved'),
       ...['email:a@example.test','email:b@example.test','sms:a@example.test'].map(v=>h('button',{key:v,onClick:()=>T(v)},v)),
       ...['actor-a','actor-b'].map(v=>h('button',{key:v,onClick:()=>S(v)},v)),
       h('button',{onClick:()=>{const s=subject,b=body;window.finishMockSend=ok=>{if(ok){clearSubject(s);clearBody(b)}}}},'Start mock send'),
       h('button',{onClick:()=>window.finishMockSend(false)},'Fail mock send'),h('button',{onClick:()=>window.finishMockSend(true)},'Complete mock send'))}
    require(${dom}).createRoot(document.getElementById('root')).render(h(App));})()` })
}

test.beforeEach(async ({ page }) => {
  await page.route("https://draft.example.test/**", route => route.fulfill({ contentType: "text/html", body: '<main id="root"></main>' }))
  await page.goto("https://draft.example.test/")
  await mount(page)
})

test("subject and body survive thread changes and browser reload without crossing actor or channel", async ({ page }) => {
  await page.getByLabel("Subject").fill("Checked products")
  await page.getByLabel("Body").fill("Please review")
  for (const target of ["email:b@example.test", "sms:a@example.test"]) {
    await page.getByRole("button", { name: target, exact: true }).click()
    await expect(page.getByLabel("Subject")).toHaveValue("Re: Original")
    await expect(page.getByLabel("Body")).toHaveValue("")
    await page.getByLabel("Subject").fill("Separate draft")
  }
  await page.getByRole("button", { name: "email:a@example.test", exact: true }).click()
  await page.getByRole("button", { name: "actor-b", exact: true }).click()
  await expect(page.getByLabel("Subject")).toHaveValue("Re: Original")
  await page.getByRole("button", { name: "actor-a", exact: true }).click()
  await expect(page.getByLabel("Subject")).toHaveValue("Checked products")
  await page.reload(); await mount(page)
  await expect(page.getByLabel("Subject")).toHaveValue("Checked products")
  await expect(page.getByLabel("Body")).toHaveValue("Please review")
})

test("failed sends retain drafts and confirmed success clears both after reload", async ({ page }) => {
  await page.getByLabel("Subject").fill("  Exact raw subject  ")
  await page.getByLabel("Body").fill("Details")
  await page.getByRole("button", { name: "Start mock send" }).click()
  await page.getByRole("button", { name: "Fail mock send" }).click()
  await expect(page.getByLabel("Subject")).toHaveValue("  Exact raw subject  ")
  await page.reload(); await mount(page)
  await expect(page.getByLabel("Subject")).toHaveValue("  Exact raw subject  ")
  await page.getByRole("button", { name: "Start mock send" }).click()
  await page.getByRole("button", { name: "Complete mock send" }).click()
  await page.reload(); await mount(page)
  await expect(page.getByLabel("Subject")).toHaveValue("")
  await expect(page.getByLabel("Body")).toHaveValue("")
})

test("successful delayed send preserves newer edits and cannot clear another thread", async ({ page }) => {
  await page.getByLabel("Subject").fill("Sent version")
  await page.getByRole("button", { name: "Start mock send" }).click()
  await page.getByLabel("Subject").fill("New unsent version")
  await page.getByRole("button", { name: "email:b@example.test", exact: true }).click()
  await page.getByLabel("Subject").fill("Other recipient")
  await page.getByRole("button", { name: "Complete mock send" }).click()
  await expect(page.getByLabel("Subject")).toHaveValue("Other recipient")
  await page.getByRole("button", { name: "email:a@example.test", exact: true }).click()
  await expect(page.getByLabel("Subject")).toHaveValue("New unsent version")
})

test("storage denied keeps draft in memory and reports it honestly", async ({ page }) => {
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error("denied") } })
  await page.getByLabel("Subject").fill("Recoverable in this page")
  await expect(page.getByText("Storage unavailable")).toBeVisible()
  await page.getByRole("button", { name: "email:b@example.test", exact: true }).click()
  await page.getByRole("button", { name: "email:a@example.test", exact: true }).click()
  await expect(page.getByLabel("Subject")).toHaveValue("Recoverable in this page")
})

test("inbox wires subject draft without resetting persisted values on navigation or failure", () => {
  const source = readFileSync(resolve("components/buildflow/unified-communication-inbox.tsx"), "utf8")
  expect(source).toContain("[subject, setSubject, subjectStorageFailed, clearSentSubject] = useCommunicationDraft(")
  expect(source.match(/setSubject\(/g)).toHaveLength(1) // User input only.
  expect(source).toContain('if (messageChannel === "email") clearSentSubject(sentDraftSubject)')
  expect(source.indexOf("clearSentSubject(sentDraftSubject)")).toBeGreaterThan(source.indexOf("const optimistic: AuraCommunicationRow"))
})
