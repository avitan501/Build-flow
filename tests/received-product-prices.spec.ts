import { test, expect } from "@playwright/test"
import { receivedProductPriceRows,sourceComparisonReasons,expandPrintedCuts,comparisonIndicators } from "../lib/received-product-prices"
import type { QuoteComparisonItemRecord } from "../lib/quote-comparison"
import { readFile, readdir } from "node:fs/promises"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { ReceivedProductPriceMatrix } from "../components/buildflow/received-product-price-matrix"
const item=(id:string,description:string,specification:string,quantity=10)=>({id,description,specification,quantity,unit:"pieces"} as QuoteComparisonItemRecord)
const line=(line_number:number,description:string,specification:string,quantity=10)=>({line_number,description,specification,quantity,unit:"pieces",unit_price:12,line_total:120})
test('sheet dimensions accept equivalent notation and keep size, thickness and material conflicts visible',()=>{
 const target=item('sheet','CDX plywood','4 x 8 ft · 3/4 in',77)
 for(const dimensions of ['4\' x 8\'','4 ft × 8 ft','8 x 4 ft','4×8']){
  const source=line(1,'CDX plywood',`${dimensions} · 3/4"`,77)
  const cell=receivedProductPriceRows([target],[{id:'q',fileName:'q',sourceItems:[source]}])[0].cells[0]
  expect(cell.lines).toHaveLength(1)
  expect(comparisonIndicators(target,cell.lines,cell.reasons).some(i=>i.kind==='measurement')).toBe(false)
 }
 for(const spec of ['4 ft x 10 ft · 3/4"','4 x 8 ft · 5/8"']){
  const source=line(1,'CDX plywood',spec,77)
  expect(comparisonIndicators(target,[source],sourceComparisonReasons(target,source)).some(i=>i.kind==='measurement')).toBe(true)
 }
 const osb=line(1,'OSB','4 x 8 ft · 3/4"',77)
 expect(comparisonIndicators(target,[osb],sourceComparisonReasons(target,osb)).some(i=>i.kind==='alternative')).toBe(true)
 const wrong=line(1,'CDX plywood','4 ft x 10 ft · 3/4"',77),correct=line(2,'CDX plywood','4\' x 8\' · 3/4"',77)
 expect(receivedProductPriceRows([target],[{id:'q',fileName:'q',sourceItems:[wrong,correct]}])[0].cells[0].lines.map(l=>l.line_number)).toEqual([2])
})
test('supplier abbreviations and sheet dimensions recover candidates without approving them',()=>{
 for(const [target,supplier] of [
  [item('a','Deck plywood','Size: 4 x 8 ft · Thickness: 3/4 in',77),line(1,'4 x 8 3/4" CDX','4\' x 8 3/4" CDX',77)],
  [item('b','Face-mount joist hanger','For 10 in TJI',170),line(1,'Simpson HU310 heavy duty','HU310',170)],
  [item('c','Wood saw blade','9 in',25),line(1,'RECIP BLD','9IN',25)],
  [item('d','Construction adhesive','28 oz',24),line(1,'PL400 ADHES','28oz',24)],
 ] as const){const cell=receivedProductPriceRows([target],[{id:'q',fileName:'q',sourceItems:[supplier]}])[0].cells[0];expect(cell.lines).toHaveLength(1);expect(comparisonIndicators(target,cell.lines,cell.reasons).some(i=>i.kind==='unverified')).toBe(true)}
 expect(sourceComparisonReasons(item('a','Face-mount joist hanger','For TJI 230',170),line(1,'HU310 hanger','',170)).join(' ')).not.toContain('Different joist')
})
test('quantity, measurements and substitutions remain separate and simultaneous',()=>{
 const target=item('a','LVL beam','10 in · 20 ft',10),quoted=line(1,'LVL beam','9-1/2" · 20 ft',8)
 const indicators=comparisonIndicators(target,[quoted],sourceComparisonReasons(target,quoted))
 expect(indicators.map(i=>i.kind)).toEqual(['quantity','measurement','unverified'])
 const joist=item('j','TJI 230 I-joist','10 in · 20 ft',35),alternative=line(1,'NI-60 I-joist','9-1/2" · 20 ft',30)
 expect(comparisonIndicators(joist,[alternative],sourceComparisonReasons(joist,alternative)).map(i=>i.kind)).toEqual(['quantity','alternative','unverified'])
 const packageTarget={...target,unit:'box',quantity:2},packageQuote={...quoted,quantity:24,unit:'each'}
 const packageIndicators=comparisonIndicators(packageTarget,[packageQuote],sourceComparisonReasons(packageTarget,packageQuote))
 expect(packageIndicators.some(i=>i.kind==='quantity')).toBe(false)
 expect(packageIndicators.find(i=>i.kind==='unverified')?.notes.join(' ')).toContain('selling unit')
})
test('colored comparison guide uses separate dots with expandable notes and review links',async({page})=>{
 const target=item('a','LVL beam','10 in · 20 ft',10),quoted=line(1,'LVL beam','9-1/2" · 20 ft',8)
 const restore=(value:unknown):React.ReactNode=>{
  if(Array.isArray(value))return value.map((child,index)=>React.createElement(React.Fragment,{key:index},restore(child)))
  if(value&&typeof value==='object'&&'__pw_type' in value&&'type' in value){const node=value as unknown as {type:React.ElementType;props:Record<string,unknown>;key?:string};const{children,...props}=node.props;return React.createElement(typeof node.type==='object'?React.Fragment:node.type,{...props,key:node.key},restore(children))}
  return value as React.ReactNode
 }
 await page.setContent(renderToStaticMarkup(restore(ReceivedProductPriceMatrix({items:[target],quotes:[{id:'q',fileName:'Supplier',sourceItems:[quoted]}],bids:[]}))))
 await expect(page.getByTestId('comparison-status-guide').locator('details')).toHaveCount(5)
 const quantity=page.locator('[data-kind="quantity"]')
 await expect(quantity.locator('summary span.bg-rose-600')).toHaveCount(2)
 await expect(page.locator('[data-kind="measurement"] summary span.bg-red-600')).toHaveCount(1)
 await expect(page.locator('[data-kind="unverified"] summary span.bg-yellow-400')).toHaveCount(1)
 await expect(quantity.locator('div')).not.toBeVisible()
 await quantity.locator('summary').click()
 await expect(quantity.locator('div')).toBeVisible()
 await expect(quantity.getByRole('link')).toHaveAttribute('href','/admin/supplier-quotes/q')
 await expect(page.getByTestId('verified-price-indicator')).toHaveCount(0)
})
test('private current six quotes recover known sheet, hanger and abbreviation lines',async()=>{
 let raw:string
 try {raw=await readFile('/tmp/avantia-six-supplier-lines-20260917.json','utf8')} catch {test.skip(true,'Private production readonly source unavailable');return}
 const quotes=JSON.parse(raw) as Array<{id:string;supplier_name:string;lines:Parameters<typeof expandPrintedCuts>[0][]}>
 expect(quotes).toHaveLength(6)
 const us=quotes.find(q=>q.supplier_name.startsWith('U.S.'))!,bfs=quotes.find(q=>q.supplier_name==='Builders FirstSource')!
 const targets=[item('a','Deck plywood','4 x 8 ft · 3/4 in',77),item('b','CDX plywood','4 x 8 ft · 5/8 in',60),item('c','Face-mount hanger','For 10 in TJI',170),item('d','Construction adhesive','28 oz',24),item('e','Coil framing nails','3 in',10)]
 const rows=receivedProductPriceRows(targets,[{id:us.id,fileName:'us',sourceItems:us.lines},{id:bfs.id,fileName:'bfs',sourceItems:bfs.lines}])
 expect(rows[0].cells[0].lines.map(l=>l.line_number)).toEqual([6])
 expect(rows[1].cells[0].lines.map(l=>l.line_number)).toEqual([17])
 expect(rows[2].cells[0].lines.map(l=>l.line_number)).toEqual([12,34])
 expect(rows[3].cells[0].lines.map(l=>l.line_number)).toEqual([11])
 expect(rows[4].cells[0].lines.map(l=>l.line_number)).toEqual([32])
})
test('ordinal floor notation and encoded lumber lengths prevent wrong lower-row matches',()=>{
 const rows=receivedProductPriceRows([item('a','2x12 lumber','24 ft · Section: First floor',40)],[{id:'q',fileName:'q',sourceItems:[line(1,'2X12X16 DF WOOD','Section: 1ST FLOOR',40),line(2,'2x12-24 Lumber','Section: 2ND FLOOR',40),line(3,'2X12X24 DF WOOD','Section: 1ST FLOOR',40)]}])
 expect(rows[0].cells[0].lines.map(l=>l.line_number)).toEqual([3])
 expect(rows[0].cells[0].reasons).toEqual([])
})
test('balanced printed LF cut schedule produces distinct piece candidates without false source reuse',()=>{
 const bulk={...line(1,'NI-60 I-JOIST','LFT NI-60 2-1/2 x 9-1/2 I-JOIST; sizes listed: 35/20 30/26 22/16 26/10',2092),unit:'lin. ft.',unit_price:3.44,line_total:7196.48}
 expect(expandPrintedCuts(bulk)).toHaveLength(4)
 const rows=receivedProductPriceRows([item('a','TJI 230 I-joist','20 ft',35),item('b','TJI 230 I-joist','26 ft',30)],[{id:'q',fileName:'q',sourceItems:[bulk]}])
 for(const row of rows){expect(row.cells[0].lines).toHaveLength(1);expect(row.cells[0].sharedSource).toBe(false);expect(row.cells[0].reasons).toEqual(['Different joist manufacturer/series; keep as an alternative until approved.'])}
 expect(rows[0].cells[0].lines[0].unit_price).toBeCloseTo(68.8)
 expect(rows[1].cells[0].lines[0].unit_price).toBeCloseTo(89.44)
 expect(bulk.quantity).toBe(2092);expect(bulk.unit).toBe('lin. ft.')
})
test('unbalanced, duplicate, missing and inconsistent LF schedules cannot invent piece prices',()=>{
 for(const specification of ['sizes listed: 35/20 30/26','sizes listed: 35/20 35/20','LVL beam']){
 const bulk={...line(1,'LVL Beam',specification,2092),unit:'lin. ft.',unit_price:3.44,line_total:7196.48}
 expect(expandPrintedCuts(bulk)).toEqual([bulk])
 expect(receivedProductPriceRows([item('a','LVL Beam','20 ft',35)],[{id:'q',fileName:'q',sourceItems:[bulk]}])[0].cells[0].lines).toHaveLength(0)
 }
 const bad={...line(1,'NI-60 I-JOIST','sizes listed: 35/20',700),unit:'lin. ft.',unit_price:3.44,line_total:1}
 expect(expandPrintedCuts(bad)).toEqual([bad])
})
test('current four-quote private fixture reconciles KSJ printed cuts and preserves its originals',async()=>{
 let raw:string
 try {raw=await readFile('/tmp/avantia-current-supplier-lines.json','utf8')} catch {test.skip(true,'Private read-only production fixture unavailable');return}
 const quotes=JSON.parse(raw) as Array<{supplier_name:string;lines:Parameters<typeof expandPrintedCuts>[0][]}>
 expect(quotes).toHaveLength(4)
 const ksj=quotes.find(q=>q.supplier_name==='KSJ KASLANDER LUMBER LLC')!
 const before=JSON.stringify(ksj)
 for(const n of [1,15,16,28]){
  const source=ksj.lines.find(l=>l.line_number===n)!
  const cuts=expandPrintedCuts(source)
  expect(cuts).toHaveLength(n===28?1:4)
  expect(cuts.every(c=>c.unit==='each'&&Boolean(c.allocationKey))).toBe(true)
  expect(cuts.reduce((sum,c)=>sum+Number(c.line_total),0)).toBeCloseTo(Number(source.line_total),2)
 }
 const missing=ksj.lines.find(l=>l.line_number===2)!
 expect(expandPrintedCuts(missing)).toEqual([missing])
 expect(JSON.stringify(ksj)).toBe(before)
})
test('no generic problem note is invented when a candidate has no detected difference',()=>{
 expect(sourceComparisonReasons(item('a','2x6 lumber','16 ft'),line(1,'2x6 lumber','16 ft'))).toEqual([])
 expect(sourceComparisonReasons(item('a','Face-mount hanger','10 in'),line(1,'Face-mount hanger','10 in'))).toEqual([])
 const actual=sourceComparisonReasons(item('a','TJI 230 I-joist','10 in · 20 ft',35),{...line(1,'NI-40 I-joist','10 in · 20 ft',30),unit:'lin. ft.'})
 expect(actual.join(' ')).toContain('Quantity:');expect(actual.join(' ')).toContain('selling unit');expect(actual.join(' ')).toContain('Different joist')
})
test("one supplier source cannot imply coverage for two request rows",()=>{
 const rows=receivedProductPriceRows([item("a","2x6 lumber","16 ft"),item("b","2x6 lumber","16 ft")],[{id:"q",fileName:"one",sourceItems:[line(1,"2x6 lumber","16 ft")]}])
 for(const row of rows){expect(row.cells[0].sharedSource).toBe(true);expect(row.cells[0].suggested).toBe(false);expect(row.cells[0].reasons.join(' ')).toContain('assign it once')}
})
test("quantity and material differences are explicit, not generic review labels",()=>{
 const rows=receivedProductPriceRows([item("a","plywood","3/4 4x8",77)],[{id:"q",fileName:"one",sourceItems:[line(1,"OSB","3/4 4x8",70)]}])
 expect(rows[0].cells[0].reasons.join(' ')).toContain('requested 77')
 expect(rows[0].cells[0].reasons.join(' ')).toContain('OSB')
})
test("all received quotes are columns before approved bids exist",()=>{
 const rows=receivedProductPriceRows([item("a","Dimensional lumber","2 x 6 in · Length: 16 ft")],[{id:"q1",fileName:"one",sourceItems:[line(1,"2x6 lumber","16 ft")]},{id:"q2",fileName:"two",sourceItems:[line(1,"SPF lumber","2x6 · 16 ft")]},{id:"q3",fileName:"three",sourceItems:[]}])
 expect(rows[0].cells).toHaveLength(3);expect(rows[0].cells[0].lines).toHaveLength(1);expect(rows[0].cells[1].lines).toHaveLength(1);expect(rows[0].cells[2].lines).toHaveLength(0)
})
test("floor, length and lumber dimension conflicts do not become suggested matches",()=>{
 const q={id:"q",fileName:"one",sourceItems:[line(1,"2x4 lumber","Length: 16 ft · Section: First floor")]}
 for(const target of [item("a","2x6 lumber","Length: 16 ft · Section: First floor"),item("b","2x4 lumber","Length: 24 ft · Section: First floor"),item("c","2x4 lumber","Length: 16 ft · Section: Second floor")])expect(receivedProductPriceRows([target],[q])[0].cells[0].lines).toHaveLength(0)
})
test("ambiguous source rows remain visible and unapproved",()=>{
 const q={id:"q",fileName:"one",sourceItems:[line(1,"2x6 lumber","16 ft"),line(2,"2x6 lumber","16 ft")]}
 const rows=receivedProductPriceRows([item("a","Lumber","2x6 · 16 ft"),item("b","Lumber","2x6 · 16 ft")],[q])
 expect(rows[0].cells[0].lines).toHaveLength(2);expect(rows[0].cells[0].suggested).toBe(false)
})
test("price matrix has no approval writes and ranks only verified offers",async()=>{
 const source=await readFile("components/buildflow/received-product-price-matrix.tsx","utf8")
 expect(source).toContain('data-testid="product-price-matrix"');expect(source).toContain('offer?.eligible');expect(source).toContain('comparisonIndicators');expect(source).not.toContain('Action(')
})
test("actual Framing source data populates product prices",async()=>{
 test.skip(!process.env.PRICE_MATRIX_FIXTURE_FILE,"Private local source fixture only")
 const fixture=JSON.parse(await readFile(process.env.PRICE_MATRIX_FIXTURE_FILE!,"utf8"))
 const rows=receivedProductPriceRows(fixture.items,fixture.quotes)
 const counts=fixture.quotes.map((_:unknown,index:number)=>rows.filter(row=>row.cells[index].lines.length).length)
 expect(rows).toHaveLength(78);expect(counts).toHaveLength(3);for(const count of counts)expect(count).toBeGreaterThan(15)
 console.log(JSON.stringify({productRows:rows.length,pricedProductsBySupplier:counts}))
})
test("actual matrix renders prices and all supplier columns on desktop and phone",async({page})=>{
 test.skip(!process.env.PRICE_MATRIX_FIXTURE_FILE,"Private local source fixture only")
 const fixture=JSON.parse(await readFile(process.env.PRICE_MATRIX_FIXTURE_FILE!,"utf8"))
 Object.assign(globalThis,{React})
 const cssFiles=await readdir(".next/static/css")
 const css=(await Promise.all(cssFiles.filter(name=>name.endsWith(".css")).map(name=>readFile(`.next/static/css/${name}`,"utf8")))).join("\n")
 // Playwright serializes imported JSX; restore DOM elements for server rendering.
 const restore=(value:unknown):React.ReactNode=>{
  if(Array.isArray(value))return value.map((child,index)=>React.createElement(React.Fragment,{key:index},restore(child)))
  if(value&&typeof value==="object"&&"__pw_type" in value&&"type" in value){
   const node=value as unknown as {type:React.ElementType;props:Record<string,unknown>;key?:string}
   const {children,...props}=node.props
   return React.createElement(typeof node.type==="object"?React.Fragment:node.type,{...props,key:node.key},restore(children))
  }
  return value as React.ReactNode
 }
 const html=renderToStaticMarkup(restore(ReceivedProductPriceMatrix({...fixture,bids:fixture.bids||[]})))
 await page.setContent(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body style="padding:12px">${html}</body></html>`)
 const table=page.getByTestId("product-price-matrix")
 await expect(table.locator("thead th")).toHaveCount(4);await expect(table.locator("tbody tr")).toHaveCount(78)
 expect(await table.getByTestId("source-product-price").filter({hasText:"$"}).count()).toBeGreaterThan(100)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false)
 await expect(page.getByText("Lowest verified price")).toHaveCount(0)
 await page.screenshot({path:`/tmp/avantia-product-price-matrix-local-${page.viewportSize()?.width}.png`})
})
