import {test,expect} from '@playwright/test'
import {measurementNumber,normalizeMeasurementText} from '../lib/material-measurement-text'
import {comparisonIndicators,receivedProductPriceRows} from '../lib/received-product-prices'
import {receivedPriceSummary} from '../lib/received-price-summary'
import {quoteWordingDifferences} from '../lib/quote-wording-differences'
import {quoteLineMatchStatus,type QuoteComparisonItemRecord} from '../lib/quote-comparison'
const item={id:'lvl',description:'LVL beam',specification:'1-3/4 in · 11.25 in · 24 ft · Ceiling joists',quantity:4,unit:'pieces'} as QuoteComparisonItemRecord
const source=(description:string)=>({line_number:37,description,specification:description,quantity:4,unit:'each',unit_price:151,line_total:604})
test('equivalent fractions, unicode, decimals and unit wording normalize without changing identifiers',()=>{
 for(const value of ['11 1/4','11-1/4','11¼','11.25'])expect(measurementNumber(value)).toBe(11.25)
 for(const value of ['11 1/4"','11-1/4 inches','11¼″','11.25 in'])expect(normalizeMeasurementText(value).replace(/\s+/g,' ').trim()).toBe('11.25 in')
 expect(normalizeMeasurementText('SKU AB11-1/4 model 230')).toBe('SKU AB11-1/4 model 230')
 expect(measurementNumber('1/0')).toBeNull()
 expect(normalizeMeasurementText('3/4" CDX 4 x 8')).toContain('0.75 in')
 expect(normalizeMeasurementText('4 x 8 3/4" CDX')).not.toContain('8.75')
})
test('real LVL example has matching depth and length, omitted thickness is missing not different',()=>{
 for(const notation of ['11 1/4','11-1/4','11¼','11.25']){
  const line=source(`LVL ${notation}" x 24'`),before=JSON.stringify(line)
  const indicators=comparisonIndicators(item,[line],[])
  expect(indicators.some(i=>i.kind==='measurement')).toBe(false)
  expect(indicators.flatMap(i=>i.notes).join(' ')).toContain('Measurement missing: requested 1.75 in')
  const summary=receivedPriceSummary([item],[{id:'q',fileName:'quote.pdf',sourceItems:[line]}],[])
  expect(summary.cells[0][0].problem).toBe(true)
  expect(summary.cells[0][0].requestedTotal).toBe(604)
  expect(JSON.stringify(line)).toBe(before)
 }
})
test('full equivalent dimensions recover source candidates but do not approve products; real differences stay red',()=>{
 const line=source('LVL beam 1¾ in · 11¼ in · 24 feet · Ceiling joists')
 const rows=receivedProductPriceRows([item],[{id:'q',fileName:'q',sourceItems:[line]}])
 expect(rows[0].cells[0].lines).toHaveLength(1)
 expect(comparisonIndicators(item,[line],[]).some(i=>i.kind==='measurement'||i.notes.some(n=>n.startsWith('Measurement missing:')))).toBe(false)
 expect(quoteLineMatchStatus(item,line.description)).not.toBe('exact')
 expect(comparisonIndicators(item,[source('LVL 1¾ in · 9½ in · 24 feet')],[]).some(i=>i.kind==='measurement')).toBe(true)
 expect(comparisonIndicators(item,[source('LVL 1¾ in · 11¼ in · 20 feet')],[]).some(i=>i.kind==='measurement')).toBe(true)
})
test('red wording highlights actual unicode fraction differences, not equivalent notation',()=>{
 expect(quoteWordingDifferences('LVL 11¼"', ['Measurement differs: requested 11.25 in; quoted 11.25 in. Verify the source dimensions.']).some(p=>p.different)).toBe(false)
 expect(quoteWordingDifferences('LVL 9½"', ['Measurement differs: requested 11.25 in; quoted 9.5 in. Verify the source dimensions.']).filter(p=>p.different).map(p=>p.text)).toEqual(['9½'])
})
