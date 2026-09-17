import {test,expect} from '@playwright/test'
import {comparisonIndicators,sourceComparisonReasons} from '../lib/received-product-prices'
import {receivedPriceSummary} from '../lib/received-price-summary'
import {comparisonSavings} from '../lib/comparison-savings'
import type {QuoteComparisonItemRecord} from '../lib/quote-comparison'
const item=(specification:string,description='Deck plywood')=>({id:'p',description,specification,quantity:77,unit:'pieces'}) as QuoteComparisonItemRecord
const line=(description:string,price=25)=>({line_number:1,description,specification:description,quantity:77,unit:'each',unit_price:price,line_total:77*price})
test('panel catalog pairs remove only naming differences; real thickness, exact constraints and substitutions remain',()=>{
 for(const [requested,quoted] of [['3/4','23/32'],['5/8','19/32']]){
  const target=item(`${requested} in · 4 ft · 8 ft`),source=line(`4x8 ${quoted}" CDX plywood`)
  expect(comparisonIndicators(target,[source],sourceComparisonReasons(target,source)).some(i=>i.kind==='measurement')).toBe(false)
  const exact=item(`actual ${requested} in · 4 ft · 8 ft`)
  expect(comparisonIndicators(exact,[source],[]).some(i=>i.kind==='measurement')).toBe(true)
 }
 const target=item('3/4 in · 4 ft · 8 ft'),source=line('23/32" 4x8 OSB')
 expect(comparisonIndicators(target,[source],sourceComparisonReasons(target,source)).some(i=>i.kind==='alternative')).toBe(true)
 expect(comparisonIndicators(target,[line('5/8" 4x8 CDX')],[]).some(i=>i.kind==='measurement')).toBe(true)
 expect(comparisonIndicators(target,[line('3/4" 4x10 CDX')],[]).some(i=>i.kind==='measurement')).toBe(true)
 expect(comparisonIndicators(target,[line('3/4" 48 in x 96 in CDX')],[]).some(i=>i.notes.some(n=>n.startsWith('Sheet dimensions differ:')))).toBe(false)
})
test('fraction normalization and true measurement checks apply outside LVL and plywood too',()=>{
 const target=item('1.5 in · 8 ft','Blade'),source=line('Blade 1½ inches 8 feet')
 expect(comparisonIndicators(target,[source],[]).some(i=>i.kind==='measurement')).toBe(false)
 expect(comparisonIndicators(target,[line('Blade 2 inches 8 ft')],[]).some(i=>i.kind==='measurement')).toBe(true)
 const hanger=item('For 10 in TJI · First floor','Face-mount hanger'),sourceHanger=line('IUS2.56/9-1/2" FACE MOUNT HANGER')
 expect(comparisonIndicators(hanger,[sourceHanger],sourceComparisonReasons(hanger,sourceHanger)).some(i=>i.kind==='measurement')).toBe(false)
 const compactHanger=line('MTK 2-1/2"X9-1/2" INV MNT HGR')
 expect(comparisonIndicators(hanger,[compactHanger],sourceComparisonReasons(hanger,compactHanger)).some(i=>i.kind==='measurement')).toBe(false)
 const joist={...item('10 in · 26 ft','TJI 230 I-joist'),quantity:30}
 const ni={...line('NI-40 2-1/2X9-1/2" · Length: 26 ft'),quantity:30}
 const checks=comparisonIndicators(joist,[ni],sourceComparisonReasons(joist,ni))
 expect(checks.some(i=>i.kind==='measurement'||i.kind==='quantity')).toBe(false)
 expect(checks.some(i=>i.kind==='alternative')).toBe(true)
 expect(comparisonIndicators(joist,[{...ni,description:'NI-40 2-1/2X11-7/8" · Length: 26 ft',specification:'NI-40 2-1/2X11-7/8" · Length: 26 ft'}],[]).some(i=>i.kind==='measurement')).toBe(true)
 expect(comparisonIndicators(item('actual width 10 in','Hanger'),[line('Hanger width 9.5 in')],[]).some(i=>i.kind==='measurement')).toBe(true)
})
test('lowest source price is visible separately from comparable suggestion without weakening duplicate allocation',()=>{
 const target=item('3/4 in · 4 ft · 8 ft'),other={...target,id:'other'}
 const quotes=[{id:'cheap',fileName:'cheap',sourceItems:[line('3/4" 4x8 plywood',20)]},{id:'safe',fileName:'safe',sourceItems:[{...line('3/4" 4x8 plywood',25),comparison_item_id:'p'}]}]
 const summary=receivedPriceSummary([target,other],quotes,[]),row=comparisonSavings(summary,'safe').rows[0]
 expect(row.lowestQuoted?.quoteId).toBe('cheap')
 expect(row.lowestQuoted?.problem).toBe(true)
 expect(row.cheapest?.quoteId).toBe('safe')
 expect(row.savings).toBe(0)
})
