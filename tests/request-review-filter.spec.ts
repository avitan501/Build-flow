import { expect, test, type Page } from "@playwright/test"
import ts from "typescript"
import { readFileSync, existsSync, readdirSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"

async function fixture(page: Page, mode: "normal" | "conflict" | "ready" = "normal") {
  const modules: Record<string, string> = {}, seen = new Map<string, string>()
  const stub = (code: string) => { const id=String(Object.keys(modules).length);modules[id]=code;return id }
  const router=stub("exports.useRouter=()=>({refresh(){if(!window.holdRefresh)window.renderProducts(window.serverProducts)}})")
  const actions=stub(`exports.saveReviewedRequestItemAction=async(input)=>{window.calls.push(input);const initial=window.initial.find(p=>p.item.id===input.itemId);const changed={...initial,item:{...initial.item,metadata:{...initial.item.metadata,review_status:'ready',review_reasons:[],dimensions:'4 x 8 ft.'}},revision:'saved-'+window.calls.length};if('${mode}'==='conflict')return {ok:false,conflict:true,...changed,error:'Concurrent source change; review first.'};const result=input.undoReceiptId?{...initial,revision:'undo-'+window.calls.length}:changed;window.serverProducts=window.serverProducts.map(p=>p.item.id===input.itemId?result:p);return {ok:true,...result,receiptId:input.undoReceiptId?null:'receipt-'+window.calls.length}};exports.moveRequestItemDepartmentAction=async()=>{throw Error('Out of scope')}`)
  const editor=stub("exports.OriginalRequestItemEditor=()=>null")
  const price=stub("exports.MaterialPriceCheck=()=>null")
  function bundle(file: string): string {
    if(seen.has(file))return seen.get(file)!
    const id=stub("");seen.set(file,id)
    let code=readFileSync(file,"utf8")
    if(/\.[cm]?[jt]sx?$/.test(file))code=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText
    const resolver=createRequire(file)
    modules[id]=code.replace(/require\(["']([^"']+)["']\)/g,(_all,name:string)=>{
      if(name==='next/navigation')return `require(${JSON.stringify(router)})`
      if(name.endsWith('/requests/item-edit-actions')||name.endsWith('/requests/actions'))return `require(${JSON.stringify(actions)})`
      if(name.endsWith('/original-request-item-editor'))return `require(${JSON.stringify(editor)})`
      if(name.endsWith('/material-price-check'))return `require(${JSON.stringify(price)})`
      const base=name.startsWith('@/')?resolve(process.cwd(),name.slice(2)):''
      return `require(${JSON.stringify(bundle(base?[base+'.ts',base+'.tsx'].find(existsSync)!:resolver.resolve(name)))})`
    });return id
  }
  const react=bundle(require.resolve('react')),dom=bundle(require.resolve('react-dom/client')),component=bundle(resolve('components/buildflow/request-item-review-list.tsx'))
  const initial=['a','b','c'].map((id,index)=>({item:{id,name:`CDX plywood ${id.toUpperCase()}`,department:'Framing',quantity:2,unit:'sheets',metadata:{ai_organized:true,thickness:'5/8 in',review_status:index<2&&mode!=='ready'?'missing':'ready',review_reasons:index<2&&mode!=='ready'?['Plywood sheet dimensions are missing']:[]}},source:null,revision:'initial-'+id}))
  const cssRoot=process.env.PLAYWRIGHT_FIXTURE_CSS_ROOT||'.next/static/css'
  const css=readdirSync(cssRoot).filter(name=>name.endsWith('.css')).map(name=>readFileSync(resolve(cssRoot,name),'utf8')).join('\n')
  const script=`(()=>{window.initial=${JSON.stringify(initial)};window.serverProducts=window.initial;window.calls=[];window.holdRefresh=false;const process={env:{NODE_ENV:'production'}},cache={},modules={${Object.entries(modules).map(([id,code])=>`${JSON.stringify(id)}:function(module,exports,require){${code}}`).join(',')}};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}const R=require(${JSON.stringify(react)}),C=require(${JSON.stringify(component)}),root=require(${JSON.stringify(dom)}).createRoot(document.getElementById('root'));window.renderProducts=products=>root.render(R.createElement(C.RequestItemReviewList,{requestId:'filter-fixture',actorId:'filter-actor',products}));window.renderProducts(window.initial)})()`
  await page.route('http://127.0.0.1:3197/filter-fixture',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><main style="max-width:1100px;margin:auto"><div id="root"></div></main><script>${script}</script>`}))
  await page.goto('http://127.0.0.1:3197/filter-fixture')
}
const rows=(page:Page)=>page.getByLabel('Request products',{exact:true}).getByRole('button')
const needs=(page:Page)=>page.getByRole('group',{name:'Filter products'}).getByRole('button',{name:/Needs details/})
const all=(page:Page)=>page.getByRole('group',{name:'Filter products'}).getByRole('button',{name:/All/})

for(const width of[390,1440])test(`filter keeps newly resolved selected row and Undo until explicit navigation at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:900});await fixture(page)
  await expect(rows(page)).toHaveCount(3);await expect(page.getByLabel('Current product review')).toContainText('CDX plywood A')
  await needs(page).click();await expect(needs(page)).toHaveAttribute('aria-pressed','true');await expect(rows(page)).toHaveCount(2)
  // Acknowledgment arrives before refreshed props: count still updates promptly.
  await page.evaluate(()=>{(window as unknown as {holdRefresh:boolean}).holdRefresh=true})
  await page.getByRole('combobox',{name:'Sheet size',exact:true}).selectOption('4 x 8 ft.')
  await expect(needs(page)).toHaveText('Needs details1');await expect(rows(page)).toHaveCount(2)
  await expect(rows(page).filter({hasText:'CDX plywood A'})).toContainText('Current item')
  const undo=page.getByRole('button',{name:'Undo edit',exact:true});await expect(undo).toBeVisible()
  await all(page).click();await needs(page).click();await expect(undo).toBeVisible();await undo.click()
  await expect(needs(page)).toHaveText('Needs details2');await expect(page.getByRole('combobox',{name:'Sheet size'})).toBeVisible()
  await page.evaluate(()=>{(window as unknown as {holdRefresh:boolean}).holdRefresh=false})
  await page.getByRole('combobox',{name:'Sheet size'}).selectOption('4 x 8 ft.');await expect(needs(page)).toHaveText('Needs details1')
  await page.getByRole('button',{name:'Next item needing details',exact:true}).click()
  await expect(rows(page)).toHaveCount(1);await expect(rows(page).first()).toContainText('CDX plywood B')
  await expect(page.getByRole('button',{name:'Undo edit',exact:true})).toHaveCount(0)
  await page.getByRole('combobox',{name:'Sheet size'}).selectOption('4 x 8 ft.')
  await expect(needs(page)).toHaveText('Needs details0');await expect(rows(page)).toHaveCount(1)
  await expect(page.getByText('No items need details. Your current item stays open.',{exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Undo edit',exact:true}).click();await expect(needs(page)).toHaveText('Needs details1')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:`/tmp/avantia-step1-filter-${width}-${test.info().project.name}.png`,fullPage:true})
  await page.reload();await expect(page.getByLabel('Current product review')).toContainText('CDX plywood B')
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('avantia:step1-position:v1:filter-actor:filter-fixture')||'{}'));expect(stored.itemId).toBe('b');expect(Object.keys(stored).sort()).toEqual(['field','itemId'])
})

test('zero missing details shows honest empty state and retains current ready item',async({page})=>{
  await fixture(page,'ready');await needs(page).click();await expect(rows(page)).toHaveCount(0)
  await expect(page.getByText('No items need details. Choose All to see the full list.',{exact:true})).toBeVisible()
  await all(page).click();await rows(page).first().click();await needs(page).click();await expect(rows(page)).toHaveCount(1)
  await expect(page.getByText('No items need details. Your current item stays open.',{exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'Next item needing details',exact:true})).toHaveCount(0)
})

test('filter toggles preserve incoming conflict and never resubmit',async({page})=>{
  await fixture(page,'conflict');await needs(page).click();await page.getByRole('combobox',{name:'Sheet size'}).selectOption('4 x 8 ft.')
  await expect(page.getByRole('alert')).toContainText('This product or its original source changed.')
  await all(page).click();await needs(page).click();await expect(page.getByRole('alert')).toBeVisible();await expect(rows(page).filter({hasText:'CDX plywood A'})).toBeVisible()
  expect(await page.evaluate(()=>(window as unknown as {calls:unknown[]}).calls.length)).toBe(1)
  await expect(page.getByRole('button',{name:'Undo edit',exact:true})).toHaveCount(0)
})
