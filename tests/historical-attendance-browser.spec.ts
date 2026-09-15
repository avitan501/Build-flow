import { test, expect } from "@playwright/test"
import { createRequire } from "node:module"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import ts from "typescript"

let bundle = ""
test.beforeAll(() => {
  const modules: string[] = [], seen = new Map<string,number>()
  const stub=(code:string)=>{modules.push(code);return modules.length-1}
  const empty=stub('module.exports=new Proxy({},{get:()=>()=>null})')
  const navigation=stub('exports.useRouter=()=>({refresh(){}})')
  const actions=stub('module.exports=new Proxy({},{get:()=>()=>{throw Error("No actions")}})')
  function add(file:string):number {
    if(seen.has(file))return seen.get(file)!
    const id=stub('');seen.set(file,id)
    let code=readFileSync(file,'utf8')
    if(/\.tsx?$/.test(file))code=ts.transpileModule(code,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText
    const resolver=createRequire(file)
    modules[id]=code.replace(/require\(["']([^"']+)["']\)/g,(_,name:string)=>{
      if(name==='next/navigation')return `require(${navigation})`
      if(name.endsWith('/daily-summary/actions'))return `require(${actions})`
      if(['lucide-react','@/lib/analytics/posthog-client'].includes(name))return `require(${empty})`
      const base=name.startsWith('@/')?resolve(name.slice(2)):''
      return `require(${add(base?[base+'.ts',base+'.tsx'].find(existsSync)!:resolver.resolve(name))})`
    });return id
  }
  const resolver=createRequire(`${process.cwd()}/package.json`)
  const react=add(resolver.resolve('react')),dom=add(resolver.resolve('react-dom/client')),component=add(resolve('components/buildflow/daily-work-summary.tsx'))
  bundle=`(()=>{const process={env:{NODE_ENV:'production'}},modules=[${modules.map(code=>`function(module,exports,require){${code}}`).join(',')}],cache={};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}
    const row={id:'old',date:'2026-09-11',completed:'Reviewed work',open:'',problems:'',checkInAt:'2026-09-11T13:29:58.412Z',checkOutAt:null,pauseStartedAt:'2026-09-11T15:00:00Z',pausedMilliseconds:0,problemAttachments:[],paidAt:null};
    require(${dom}).createRoot(document.getElementById('root')).render(require(${react}).createElement(require(${component}).DailyWorkSummaryForm,{summaries:[row],canMarkPaid:false}));})()`
})
test("historical list and selected details show review, not elapsed work", async({page})=>{
 await page.clock.install({time:new Date('2026-09-15T03:00:00Z')})
 await page.setContent('<div id="root"></div>');await page.addScriptTag({content:bundle})
 const historical=page.getByRole('button',{name:/Sep 11, 2026/})
 await expect(historical).toContainText('Missing checkout · excluded from pay')
 await expect(page.getByText('Needs review',{exact:true})).toBeVisible()
 await historical.click()
 await expect(page.getByText('Missing checkout · needs review.',{exact:false})).toBeVisible()
 await expect(page.getByRole('button',{name:'Check out',exact:true})).toBeDisabled()
 await expect(page.locator('body')).not.toContainText('85 hr')
 await expect(page.locator('body')).not.toContainText('Working')
 await expect(page.locator('body')).not.toContainText('Paused — break time is not being counted')
})
