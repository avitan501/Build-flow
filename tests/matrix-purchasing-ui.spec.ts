import {test,expect} from '@playwright/test'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {readFile,readdir} from 'node:fs/promises'
import {ReceivedProductPriceMatrix} from '../components/buildflow/received-product-price-matrix'
import type {QuoteComparisonItemRecord} from '../lib/quote-comparison'
const item={id:'item',description:'Dimensional lumber',specification:'2 x 6 in · 10 ft',quantity:10,unit:'pieces'} as QuoteComparisonItemRecord
const quote=(id:string,price:number)=>({id,supplierName:id,fileName:id+'.pdf',sourceItems:[{line_number:1,description:'2x6 lumber 10 ft',specification:'',quantity:10,unit:'each',unit_price:price,line_total:price*10}]})
function restore(value:unknown):React.ReactNode {
 if(Array.isArray(value))return value.map((c,i)=>React.createElement(React.Fragment,{key:i},restore(c)))
 if(value&&typeof value==='object'&&'__pw_type' in value&&'type' in value){const n=value as unknown as {type:React.ElementType;props:Record<string,unknown>;key?:string};const {children,...props}=n.props;const type=typeof n.type==='function'?function RestoredComponent(p:Record<string,unknown>){return restore((n.type as (p:Record<string,unknown>)=>unknown)(p))}:n.type;return React.createElement((typeof type==='object'?React.Fragment:type) as React.ElementType,{...props,key:n.key},restore(children))}
 return value as React.ReactNode
}
test('rightmost savings header, real source choices, extra cost and full requested-line arithmetic render on desktop and phone',async({page})=>{
 Object.assign(globalThis,{React})
 const files=await readdir('.next/static/css'),css=(await Promise.all(files.filter(f=>f.endsWith('.css')).map(f=>readFile('.next/static/css/'+f,'utf8')))).join('\n')
 for(const width of [1440,390])for(const [chosen,expected] of [['cheap','$200.00 savings'],['expensive','+$100.00 extra'],['baseline','$0.00 savings']]){
  const html=renderToStaticMarkup(restore(ReceivedProductPriceMatrix({items:[item],quotes:[quote('cheap',100),quote('baseline',120),quote('expensive',130)],bids:[],baselineQuoteId:'baseline',draftSelections:{item:chosen},onDraftChoose:()=>{},onBaselineChange:()=>{}})))
  await page.setViewportSize({width,height:900});await page.setContent(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><main style="padding:12px">${html}</main>`)
  await expect(page.getByTestId('product-price-matrix').locator('thead th').last()).toContainText('Savings')
  await expect(page.getByTestId('product-price-matrix').locator('thead th').last().getByLabel('Compare savings against')).toHaveValue('baseline')
  await expect(page.getByLabel('Select supplier for item 1')).toHaveValue(chosen)
  await expect(page.getByLabel('Select supplier for item 1').locator('option')).toHaveCount(4)
  await expect(page.getByTestId('item-savings')).toContainText(expected)
  await expect(page.getByTestId('item-savings')).toContainText('$1,200.00')
  await expect(page.getByTestId('lowest-comparable-price')).toHaveCount(1)
  expect(await page.getByTestId('product-price-matrix').locator('tbody th').first().evaluate(el=>getComputedStyle(el).position)).toBe(width<640?'static':'sticky')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)).toBe(false)
 }
})
