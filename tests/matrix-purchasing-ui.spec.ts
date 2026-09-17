import {test,expect} from '@playwright/test'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {readFile,readdir} from 'node:fs/promises'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {resolve} from 'node:path'
import ts from 'typescript'
import {ReceivedProductPriceMatrix} from '../components/buildflow/received-product-price-matrix'
import type {QuoteComparisonItemRecord} from '../lib/quote-comparison'
const item={id:'item',description:'Dimensional lumber',specification:'2 x 6 in · 10 ft',quantity:10,unit:'pieces'} as QuoteComparisonItemRecord
const quote=(id:string,price:number)=>({id,supplierName:id,fileName:id+'.pdf',sourceItems:[{line_number:1,description:'2x6 lumber 10 ft',specification:'',quantity:10,unit:'each',unit_price:price,line_total:price*10}]})
function restore(value:unknown):React.ReactNode {
 if(Array.isArray(value))return value.map((c,i)=>React.createElement(React.Fragment,{key:i},restore(c)))
 if(value&&typeof value==='object'&&'__pw_type' in value&&'type' in value){const n=value as unknown as {type:React.ElementType;props:Record<string,unknown>;key?:string};const {children,...props}=n.props;const type=typeof n.type==='function'?function RestoredComponent(p:Record<string,unknown>){return restore((n.type as (p:Record<string,unknown>)=>unknown)(p))}:n.type;return React.createElement((typeof type==='object'?React.Fragment:type) as React.ElementType,{...props,key:n.key},restore(children))}
 return value as React.ReactNode
}
test('baseline supplies unchanged basket rows without requiring a choice on each line',async({page})=>{
 Object.assign(globalThis,{React})
 const html=renderToStaticMarkup(restore(ReceivedProductPriceMatrix({items:[item],quotes:[quote('cheap',100),quote('baseline',120)],bids:[],baselineQuoteId:'baseline',draftSelections:{},onDraftChoose:()=>{},initialSavingsMode:'selected'})))
 await page.setContent(html)
 await expect(page.getByLabel('Select supplier for item 1')).toHaveValue('baseline')
 await expect(page.getByTestId('item-savings')).toContainText('$0.00 savings')
 await expect(page.getByTestId('savings-mode-total')).toContainText('$1,200.00')
 await expect(page.getByTestId('basket-supplier-breakdown')).toContainText('baseline')
 await expect(page.getByTestId('basket-supplier-breakdown')).toContainText('$1,200.00')
});
test('rightmost savings header, real source choices, extra cost and full requested-line arithmetic render on desktop and phone',async({page})=>{
 Object.assign(globalThis,{React})
 const files=await readdir('.next/static/css'),css=(await Promise.all(files.filter(f=>f.endsWith('.css')).map(f=>readFile('.next/static/css/'+f,'utf8')))).join('\n')
 for(const width of [1440,390])for(const [chosen,expected] of [['cheap','$200.00 savings'],['expensive','+$100.00 extra'],['baseline','$0.00 savings']]){
  const html=renderToStaticMarkup(restore(ReceivedProductPriceMatrix({items:[item],quotes:[quote('cheap',100),quote('baseline',120),quote('expensive',130)],bids:[],baselineQuoteId:'baseline',draftSelections:{item:chosen},onDraftChoose:()=>{},onBaselineChange:()=>{},initialSavingsMode:'selected'})))
  await page.setViewportSize({width,height:900});await page.setContent(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><main style="padding:12px">${html}</main>`)
  await expect(page.getByTestId('product-price-matrix').locator('thead th').last()).toContainText('Savings')
  await expect(page.getByTestId('product-price-matrix').locator('thead th').last().getByLabel('Compare savings against')).toHaveValue('baseline')
  await expect(page.getByLabel('Select supplier for item 1')).toHaveValue(chosen)
  await expect(page.getByLabel('Select supplier for item 1').locator('option')).toHaveCount(4)
  await expect(page.getByTestId('item-savings')).toContainText(expected)
  await expect(page.getByTestId('item-savings')).toContainText('$1,200.00')
  await expect(page.getByTestId('lowest-comparable-price')).toHaveCount(1)
  await expect(page.getByLabel('Savings calculation mode')).toHaveValue('selected')
  await expect(page.getByTestId('supplier-material-total')).toHaveCount(3)
  await expect(page.getByTestId('supplier-material-total').nth(0)).toContainText('$1,000.00')
  await expect(page.getByTestId('supplier-material-total').nth(1)).toContainText('$1,200.00')
  await expect(page.getByTestId('supplier-material-total').nth(2)).toContainText('$1,300.00')
  await expect(page.getByTestId('savings-mode-total')).toContainText('Before tax')
  await expect(page.getByTestId('item-savings').getByLabel('Select supplier for item 1')).toHaveValue(chosen)
  await expect(page.getByTestId('product-price-matrix').locator('tbody th select')).toHaveCount(0)
  expect(await page.getByTestId('product-price-matrix').locator('tbody th').first().evaluate(el=>getComputedStyle(el).position)).toBe('static')
  expect(await page.getByTestId('item-savings').evaluate(el=>getComputedStyle(el).position)).toBe('sticky')
  for(const scroll of [0,10000]){
   await page.getByTestId('product-price-matrix').evaluate((el,left)=>{el.parentElement!.scrollLeft=left},scroll)
   expect(await page.getByTestId('item-savings').evaluate(el=>{const r=el.getBoundingClientRect(),c=el.closest('table')!.parentElement!.getBoundingClientRect();return r.left>=c.left&&r.right<=c.right+2})).toBe(true)
  }
  for(let index=1;index<=3;index++){
   const supplier=page.getByTestId('product-price-matrix').locator('thead th').nth(index)
   await supplier.evaluate(el=>{const c=el.closest('table')!.parentElement!;c.scrollLeft+=el.getBoundingClientRect().left-c.getBoundingClientRect().left-1})
   expect(await supplier.evaluate(el=>{const r=el.getBoundingClientRect(),c=el.closest('table')!.parentElement!.getBoundingClientRect(),s=el.closest('table')!.querySelector('[data-testid=item-savings]')!.getBoundingClientRect();return r.left>=c.left-2&&r.right<=s.left+2})).toBe(true)
  }
  await expect(page.getByTestId('source-price-details')).toHaveCount(3)
  await expect(page.getByTestId('source-price-details').first()).not.toHaveAttribute('open','')
  await page.getByTestId('product-price-matrix').evaluate(el=>{el.parentElement!.scrollLeft=el.parentElement!.scrollWidth})
  const visible=await page.getByTestId('item-savings').evaluate(el=>{const r=el.getBoundingClientRect(),c=el.closest('table')!.parentElement!.getBoundingClientRect();return r.left>=c.left&&r.right<=c.right+2})
  expect(visible).toBe(true)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)).toBe(false)
 }
})

test('five supplier columns fit together on desktop and mixed totals exclude unavailable lines',async({page})=>{
 Object.assign(globalThis,{React})
 const files=await readdir('.next/static/css'),css=(await Promise.all(files.filter(f=>f.endsWith('.css')).map(f=>readFile('.next/static/css/'+f,'utf8')))).join('\n')
 const quotes=[quote('cheap',100),quote('baseline',120),quote('third',130),quote('fourth',140),{id:'absent',supplierName:'Absent supplier',fileName:'absent.pdf',sourceItems:[]}]
 const html=renderToStaticMarkup(restore(ReceivedProductPriceMatrix({items:[item],quotes,bids:[],baselineQuoteId:'baseline',draftSelections:{item:'third'},onDraftChoose:()=>{},initialSavingsMode:'mixed'})))
 for(const width of [1440,1170]){
  await page.setViewportSize({width,height:900});await page.setContent(`<style>${css}</style><main style="width:calc(100% - 300px);margin-left:260px">${html}</main>`)
  expect(await page.getByTestId('product-price-matrix').evaluate(el=>{const c=el.parentElement!;return c.scrollWidth<=c.clientWidth+2})).toBe(true)
  await expect(page.getByLabel('Savings calculation mode')).toHaveValue('mixed')
  await expect(page.getByTestId('item-savings')).toContainText('$200.00 savings')
  await expect(page.getByTestId('item-savings')).toContainText('Cheapest mix · line cost')
  await expect(page.getByTestId('savings-mode-total')).toContainText('$1,000.00')
  await expect(page.getByTestId('supplier-material-total').last()).toContainText('Partial · 1 not included')
  await expect(page.getByTestId('supplier-material-total').last()).toContainText('1 not available')
  await expect(page.getByLabel('Select supplier for item 1')).toHaveCount(0)
 }
})

test('an excluded priced source is not mislabeled missing; known mixed totals are partial not unavailable',async({page})=>{
 Object.assign(globalThis,{React})
 const second={...item,id:'second'}
 const html=renderToStaticMarkup(restore(ReceivedProductPriceMatrix({items:[item,second],quotes:[quote('reused',100)],bids:[],initialSavingsMode:'mixed',baselineQuoteId:'reused'})))
 await page.setContent(html)
 await expect(page.getByTestId('supplier-material-total')).toContainText('2 source matches need review before totaling')
 await expect(page.getByTestId('supplier-material-total')).not.toContainText('not available')
 const conflict=quote('conflict',100);conflict.sourceItems[0].quantity=2
 const partial=renderToStaticMarkup(restore(ReceivedProductPriceMatrix({items:[item],quotes:[conflict],bids:[],baselineQuoteId:'conflict'})))
 await page.setContent(partial)
 await expect(page.getByTestId('baseline-material-total')).toHaveText('Partial')
 await expect(page.getByTestId('supplier-material-total')).toContainText('$1,000.00')
})

test('default comparison needs no purchasing choice and distinguishes lower unallocated source prices',async({page})=>{
 Object.assign(globalThis,{React})
 const second={...item,id:'second'}
 const safe=quote('safe',120);Object.assign(safe.sourceItems[0],{comparison_item_id:'item'})
 const html=renderToStaticMarkup(restore(ReceivedProductPriceMatrix({items:[item,second],quotes:[quote('lower',100),safe],bids:[],baselineQuoteId:'safe',onDraftChoose:()=>{}})))
 await page.setContent(html)
 await expect(page.getByLabel('Savings calculation mode')).toHaveValue('mixed')
 await expect(page.locator('[data-testid=item-savings] select')).toHaveCount(0)
 await expect(page.getByTestId('requested-line-total')).toHaveCount(3)
 await expect(page.getByTestId('lowest-quoted-price')).toHaveCount(2)
 await expect(page.getByTestId('lowest-quoted-price').first()).toHaveText('Lowest quoted price · needs review')
 await expect(page.getByTestId('lowest-comparable-price')).toHaveCount(1)
 await expect(page.getByTestId('excluded-supplier-items').first()).toContainText('Review 2 excluded items')
 await expect(page.getByTestId('excluded-supplier-items').first()).toContainText('Allocate its quantity once')
})

test('native mode switching calculates the cheapest mix without writing supplier choices',async({page})=>{
 const modules:string[]=[],seen=new Map<string,number>()
 function bundle(file:string):number{
  if(seen.has(file))return seen.get(file)!
  const id=modules.length;seen.set(file,id);modules.push('')
  let code=readFileSync(file,'utf8')
  if(/\.tsx?$/.test(file))code=ts.transpileModule(code,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
  const resolver=createRequire(file)
  modules[id]=code.replace(/require\(["']([^"']+)["']\)/g,(_,name)=>{let path:string;if(name.startsWith('@/')){const base=resolve(name.slice(2));try{path=resolver.resolve(base)}catch{try{path=resolver.resolve(base+'.ts')}catch{path=resolver.resolve(base+'.tsx')}}}else path=resolver.resolve(name);return `require(${bundle(path)})`})
  return id
 }
 const react=bundle(require.resolve('react')),dom=bundle(require.resolve('react-dom/client')),component=bundle(resolve('components/buildflow/received-product-price-matrix.tsx'))
 await page.setContent('<div id="root"></div>')
 await page.addScriptTag({content:`(()=>{const process={env:{NODE_ENV:'production'}},modules=[${modules.map(code=>`function(module,exports,require){${code}}`).join(',')}],cache={};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}const R=require(${react}),C=require(${component});window.choiceCalls=[];require(${dom}).createRoot(document.getElementById('root')).render(R.createElement(C.ReceivedProductPriceMatrix,{items:${JSON.stringify([item])},quotes:${JSON.stringify([quote('cheap',100),quote('baseline',120),quote('expensive',130)])},bids:[],renderMatchApproval:()=>R.createElement('p',{'data-testid':'approval-form-fixture'},'Review approval controls'),requestedMaterialLines:{item:'10 pieces · Dimensional lumber · 2 in · 6 in · 10 ft'},originalRequestLines:{item:'10 pc 2x6 by 10 ft'},draftSelections:{item:'expensive'},baselineQuoteId:'baseline',initialSavingsMode:'selected',onDraftChoose:(...args)=>window.choiceCalls.push(args)}))})()`})
 await expect(page.getByTestId('item-savings')).toContainText('+$100.00 extra')
 await expect(page.getByTestId('unverified-price-indicator')).toHaveCount(0)
 await page.getByTestId('toggle-unverified-dots').click()
 await expect(page.getByTestId('unverified-price-indicator')).toHaveCount(3)
 await page.getByTestId('toggle-unverified-dots').click()
 await expect(page.getByTestId('unverified-price-indicator')).toHaveCount(0)
 await page.getByRole('button',{name:'Review match',exact:true}).first().click()
 await expect(page.getByRole('dialog').filter({has:page.getByTestId('review-original-request')})).toBeVisible()
 await expect(page.getByTestId('review-original-request')).toHaveText('10 pc 2x6 by 10 ft')
 await expect(page.getByTestId('review-organized-request')).toContainText('10 pieces')
 await expect(page.getByTestId('approval-form-fixture')).toHaveText('Review approval controls')
 await page.getByRole('button',{name:'Close',exact:true}).click()
 await page.getByLabel('Savings calculation mode').selectOption('mixed')
 await expect(page.getByTestId('item-savings')).toContainText('$200.00 savings')
 await expect(page.getByTestId('savings-mode-total')).toContainText('$1,000.00')
 await expect(page.getByLabel('Select supplier for item 1')).toHaveCount(0)
 expect(await page.evaluate(()=>(window as unknown as {choiceCalls:unknown[]}).choiceCalls)).toEqual([])
 await page.getByLabel('Savings calculation mode').selectOption('selected')
 await expect(page.getByTestId('item-savings')).toContainText('+$100.00 extra')
 await expect(page.getByTestId('savings-mode-total')).toContainText('$1,300.00')
})
