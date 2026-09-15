import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import ts from "typescript"

for (const denied of [false, true]) test(`approval link clipboard ${denied ? "failure exposes manual copy" : "success does not approve or send"}`, async ({ page }) => {
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
  const react = bundle(require.resolve("react")), dom = bundle(require.resolve("react-dom/client")), component = bundle(resolve("components/buildflow/request-approval-link.tsx"))
  await page.setContent('<main id="root"></main>')
  let writes = 0
  page.on("request", request => { if (request.method() !== "GET") writes++ })
  await page.addScriptTag({ content: `(()=>{const process={env:{NODE_ENV:'production'}},modules=[${modules.map(code => `function(module,exports,require){${code}}`).join(",")}],cache={};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text)=>{${denied ? "throw Error('denied')" : "window.copiedLink=text"}}}});require(${dom}).createRoot(document.getElementById('root')).render(require(${react}).createElement(require(${component}).RequestApprovalLink,{href:'https://example.test/client-document/fixture',className:''}));})()` })
  await page.getByRole("button", { name: "Copy approval link" }).click()
  if (denied) {
    await expect(page.getByLabel("Approval link", { exact: true })).toHaveValue("https://example.test/client-document/fixture")
    await expect(page.getByRole("button", { name: "Link copied" })).toHaveCount(0)
  } else {
    await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible()
    expect(await page.evaluate(() => (window as unknown as { copiedLink: string }).copiedLink)).toBe("https://example.test/client-document/fixture")
  }
  expect(writes).toBe(0)
})
