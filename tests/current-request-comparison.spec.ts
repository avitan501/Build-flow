import { test,expect } from '@playwright/test'
import { currentRequestComparison } from '../lib/current-request-comparison'
import type { ReviewableMaterialItem } from '../lib/client-material-review'
import type { QuoteComparisonItemRecord } from '../lib/quote-comparison'
import { receivedProductPriceRows } from '../lib/received-product-prices'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReceivedProductPriceMatrix } from '../components/buildflow/received-product-price-matrix'
import { readFile,readdir } from 'node:fs/promises'

const source=(id:string,metadata:Record<string,unknown>={}):ReviewableMaterialItem=>({id,name:'TJI 230 I-joist',quantity:22,unit:'pieces',department:'Framing',qualification_status:'not_required',metadata:{ai_organized:true,source_text:'22 pc 10 inch TJI 230 — 16 ft',request_item_fields:[{id:'dimensions',label:'Dimensions',value:'10 in × 16 ft'},{id:'length',label:'Length',value:'16 ft'},{id:'delivery-address',label:'Delivery address',value:'28 Woodmere S, Woodmere, NY'}],...metadata}})
const stored=(id:string,sourceId:string):QuoteComparisonItemRecord=>({id,source_request_item_id:sourceId,comparison_id:'comparison',description:'Old product',specification:'Old text with address',quantity:1,unit:'each',sort_order:0,markup_percent:12,client_unit_price:99,created_at:'old',updated_at:'old'})
test('comparison shows saved Step1 products only, keeps stable IDs and does not remove history',()=>{
  const request=[source('client'),source('historical',{excluded_from_client_request:true,request_item_origin:'supplier_attachment'})]
  const comparison=[stored('active','client'),stored('history','historical')]
  const before=JSON.stringify(comparison)
  const view=currentRequestComparison(request,comparison)
  expect(view.items).toHaveLength(1);expect(view.items[0].id).toBe('active')
  expect(view.items[0].quantity).toBe(22);expect(view.items[0].description).toBe(request[0].name)
  expect(view.items[0].client_unit_price).toBe(99);expect(view.items[0].markup_percent).toBe(12)
  expect(view.materialLines.active).toContain('22 pieces');expect(view.materialLines.active).toContain('10 in');expect(view.materialLines.active).not.toContain('Woodmere')
  expect(view.materialSpecifications.active).not.toContain('Woodmere')
  expect(JSON.stringify(comparison)).toBe(before);expect(comparison).toHaveLength(2)
})
test('fresh comparison matrix shows all supplier columns, clean requested text and no document overflow',async({page})=>{
  const sources=[source('client'),source('historical',{excluded_from_client_request:true})]
  const view=currentRequestComparison(sources,[stored('active','client'),stored('history','historical')])
  const quotes=['US','Certified','BFS','KSJ'].map((supplierName,index)=>({id:'q'+index,supplierName,fileName:'quote.pdf',sourceItems:[{line_number:1,description:'TJI 230 I-joist',specification:'10 in × 16 ft',quantity:22,unit:'pieces',unit_price:43.5+index,line_total:957+index}]}))
  Object.assign(globalThis,{React})
  const restore=(value:unknown):React.ReactNode=>{
    if(Array.isArray(value))return value.map((child,index)=>React.createElement(React.Fragment,{key:index},restore(child)))
    if(value&&typeof value==='object'&&'__pw_type' in value&&'type' in value){const node=value as unknown as {type:React.ElementType;props:Record<string,unknown>;key?:string};const{children,...props}=node.props;return React.createElement(typeof node.type==='object'?React.Fragment:node.type,{...props,key:node.key},restore(children))}
    return value as React.ReactNode
  }
  const html=renderToStaticMarkup(restore(ReceivedProductPriceMatrix({items:view.items,quotes,bids:[],requestedMaterialLines:view.materialLines})))
  const cssNames=await readdir('.next/static/css');const css=(await Promise.all(cssNames.filter(name=>name.endsWith('.css')).map(name=>readFile('.next/static/css/'+name,'utf8')))).join('\n')
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});await page.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><main style="padding:12px">${html}</main>`)
    await expect(page.getByTestId('product-price-matrix').locator('tbody tr')).toHaveCount(1)
    await expect(page.getByTestId('product-price-matrix').locator('thead th')).toHaveCount(5)
    await expect(page.getByTestId('requested-material-line')).toHaveText(view.materialLines.active)
    await expect(page.getByTestId('requested-material-line')).not.toContainText('Woodmere')
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)).toBe(false)
  }
})
test('fresh saved edits replace stale display values without silently recognizing again',()=>{
  const row=source('client',{recognition_text:'23 pc TJI 230 24 ft',request_item_fields:[{id:'depth',label:'Depth',value:'9.5 in'},{id:'length',label:'Length',value:'24 ft'}]});row.quantity=23
  const view=currentRequestComparison([row],[stored('active','client')])
  expect(view.items[0].quantity).toBe(23);expect(view.items[0].specification).toContain('24 ft')
  expect(view.materialLines.active).toContain('9.5 in');expect(view.materialLines.active).not.toContain('16 ft')
})
test('missing saved rows are reported rather than invented or associated by a similar name',()=>{
  const view=currentRequestComparison([source('new')],[stored('unrelated','old')])
  expect(view.items).toEqual([]);expect(view.missingSourceIds).toEqual(['new'])
})
test('historical duplicates no longer cause a supplier line reuse warning in the active matrix',()=>{
  const row=source('client');const historical=source('historical',{excluded_from_client_request:true})
  const all=[{...stored('active','client'),description:row.name,specification:'10 in × 16 ft',quantity:22},{...stored('history','historical'),description:row.name,specification:'10 in × 16 ft',quantity:22}]
  const quote={id:'q',fileName:'quote.pdf',sourceItems:[{line_number:1,description:'TJI 230 I-joist',specification:'10 in × 16 ft',quantity:22,unit:'pieces',unit_price:43.5,line_total:957}]}
  expect(receivedProductPriceRows(all,[quote])[0].cells[0].sharedSource).toBe(true)
  const active=currentRequestComparison([row,historical],all)
  expect(receivedProductPriceRows(active.items,[quote])[0].cells[0].sharedSource).toBe(false)
})
