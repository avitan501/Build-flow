import { test, expect } from "@playwright/test"
import { receivedProductPriceRows } from "../lib/received-product-prices"
import type { QuoteComparisonItemRecord } from "../lib/quote-comparison"
import { readFile, readdir } from "node:fs/promises"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { ReceivedProductPriceMatrix } from "../components/buildflow/received-product-price-matrix"
const item=(id:string,description:string,specification:string,quantity=10)=>({id,description,specification,quantity,unit:"pieces"} as QuoteComparisonItemRecord)
const line=(line_number:number,description:string,specification:string,quantity=10)=>({line_number,description,specification,quantity,unit:"pieces",unit_price:12,line_total:120})
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
 expect(source).toContain('data-testid="product-price-matrix"');expect(source).toContain('offer?.eligible');expect(source).toContain('Match / selling unit needs review');expect(source).not.toContain('Action(')
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
