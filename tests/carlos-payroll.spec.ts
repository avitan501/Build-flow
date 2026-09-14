import {expect,test} from '@playwright/test'
import ts from 'typescript'
import {readFileSync,readdirSync} from 'node:fs'
import {createRequire} from 'node:module'
import {resolve} from 'node:path'
import {payrollTotalCents} from '../lib/carlos-payroll'
import {readFile} from 'node:fs/promises'

test('payroll rounds once after summing actual worked milliseconds',()=>{
 expect(payrollTotalCents([{workedMs:3600000},{workedMs:1800000}])).toBe(750)
 expect(payrollTotalCents([{workedMs:1800},{workedMs:1800}])).toBe(1)
 expect(payrollTotalCents([])).toBe(0)
})
test('DB authority is exact owner identity; payroll writes cannot be direct staff DML',async()=>{
 const sql=await readFile('supabase/migrations/20260914185259_carlos_payroll_authority.sql','utf8')
 expect(sql).toContain("lower(btrim(u.email))='avitanneto@gmail.com'")
 expect(sql).toContain("private.carlos_payroll_actor() is distinct from 'owner'")
 expect(sql).toContain("current_user in ('authenticated','anon')")
 expect(sql).toContain("pg_advisory_xact_lock(7140914)")
 expect(sql).toContain("prior.requested_by<>auth.uid() or prior.dates<>dates")
 expect(sql).toContain("coalesce(v,0)<>p_version")
})
for(const width of [390,1440]) for(const role of ['carlos','owner']) test(`${role} payroll controls and request flow ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:850})
 page.on('pageerror',error=>console.log('Fixture error:',error.message))
 const fixture=[{date:'2026-09-12',workedMs:3600000,paidAt:null,requestedAt:null,version:0},{date:'2026-09-11',workedMs:1800000,paidAt:null,requestedAt:'2026-09-12',version:1},{date:'2026-09-10',workedMs:7200000,paidAt:'2026-09-12',requestedAt:null,version:2}]
 const modules:Record<string,string>={};const seen=new Map<string,string>()
 const stub=(value:string)=>{const id=String(Object.keys(modules).length);modules[id]=value;return id}
 const routerStub=stub('exports.useRouter=()=>({refresh(){}})')
 const actionsStub=stub('exports.requestCarlosPayAction=async(dates,id)=>{window.capture={dates,id};return{ok:true,totalCents:500}};exports.setCarlosPaidAction=async(date,paid,version)=>{window.capture={date,paid,version};return{ok:true}}')
 function bundle(file:string):string {
  if(seen.has(file))return seen.get(file)!
  const id=stub('');seen.set(file,id)
  let code=readFileSync(file,'utf8')
  if(/\.tsx?$/.test(file))code=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText
  const resolver=createRequire(file)
  code=code.replace(/require\(["']([^"']+)["']\)/g,(_all,name:string)=>{
   if(name==='next/navigation')return 'require('+JSON.stringify(routerStub)+')'
   if(name.endsWith('/payroll-actions'))return 'require('+JSON.stringify(actionsStub)+')'
   const resolved=name.startsWith('@/')?resolve(process.cwd(),name.slice(2))+'.ts':resolver.resolve(name)
   return 'require('+JSON.stringify(bundle(resolved))+')'
  })
  modules[id]=code;return id
 }
 const react=bundle(require.resolve('react')),dom=bundle(require.resolve('react-dom/client')),component=bundle(resolve('components/buildflow/carlos-payroll.tsx'))
 const script='(()=>{const process={env:{NODE_ENV:"production"}},cache={},modules={'+Object.entries(modules).map(([id,code])=>JSON.stringify(id)+':function(module,exports,require){'+code+'}').join(',')+'};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}require('+JSON.stringify(dom)+').createRoot(document.getElementById("root")).render(require('+JSON.stringify(react)+').createElement(require('+JSON.stringify(component)+').CarlosPayroll,'+JSON.stringify({days:fixture,canRequest:role==='carlos',canMarkPaid:role==='owner'})+'));})()'
 await page.route('http://127.0.0.1:3117/payroll-fixture',route=>route.fulfill({contentType:'text/html',body:'<main style="max-width:800px;margin:auto;padding:16px"><div id="root"></div></main>'}))
 await page.goto('http://127.0.0.1:3117/payroll-fixture')
 for(const file of readdirSync('.next/static/css').filter(file=>file.endsWith('.css')))await page.addStyleTag({content:readFileSync('.next/static/css/'+file,'utf8')})
 await page.addScriptTag({content:script})
 await expect(page.getByRole('heading',{name:'Pay',exact:true})).toBeVisible()
 if(role==='carlos'){
  await expect(page.getByRole('button',{name:'Mark paid',exact:true})).toHaveCount(0)
  await expect(page.getByRole('checkbox',{name:'Request pay for 2026-09-11'})).toBeDisabled()
  await page.getByRole('checkbox',{name:'Request pay for 2026-09-12'}).check()
  await page.getByRole('button',{name:'Request $5.00',exact:true}).click()
  await expect(page.getByRole('status')).toContainText('Not marked paid')
 }else{
  await expect(page.getByRole('checkbox')).toHaveCount(0)
  await page.getByRole('button',{name:'Mark unpaid',exact:true}).click()
  await expect(page.getByRole('status')).toHaveText('Payment status updated.')
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:`/tmp/payroll-${role}-${width}.png`,fullPage:true})
})
