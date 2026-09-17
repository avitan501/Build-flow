import {test,expect} from '@playwright/test'
import {matrixAcceptanceCost,matrixAcceptancesError,parseMatrixAcceptances,type MatrixAcceptance} from '../lib/matrix-match-acceptance'
import {receivedPriceSummary} from '../lib/received-price-summary'
import {comparisonSavings,purchasingDraftCosts} from '../lib/comparison-savings'
import {matrixChoiceFingerprint,restoreMatrixChoices} from '../lib/matrix-choice-draft'
import type {QuoteComparisonItemRecord} from '../lib/quote-comparison'
const item={id:'one',description:'Construction adhesive',specification:'PL 28 oz',quantity:2,unit:'box'} as QuoteComparisonItemRecord
const quote={id:'supplier',fileName:'quote.pdf',sourceItems:[{line_number:1,description:'Construction adhesive PL 28 oz',specification:'',quantity:24,unit:'each',unit_price:5,line_total:120}]}
const acceptance:MatrixAcceptance={itemId:'one',quoteId:'supplier',lineNumber:1,basis:'quoted-line'}
test('accepted packaging uses full source total, no guessed package contents or zero',()=>{
 expect(matrixAcceptanceCost(acceptance,[item],[quote])).toBe(120)
 expect(matrixAcceptanceCost({...acceptance,basis:'requested-quantity'},[item],[quote])).toBeNull()
 const original=receivedPriceSummary([item],[quote],[])
 expect(original.cells[0][0].requestedTotal).toBeNull()
 const accepted=receivedPriceSummary([item],[quote],[],[acceptance])
 expect(accepted.cells[0][0]).toMatchObject({requestedTotal:120,problem:false,indicative:true})
 expect(comparisonSavings(accepted,'supplier').selectedComplete).toBe(true)
 expect(purchasingDraftCosts(accepted,[],{one:'supplier'}).materials).toBe(120)
 expect(receivedPriceSummary([item],[quote],[]).cells[0][0].problem).toBe(true)
})
test('quantity approval costs requested250 not supplier600',()=>{
 const lumber={...item,description:'Dimensional lumber',specification:'2x4 in 10 ft',quantity:250,unit:'pieces'}
 const q={...quote,sourceItems:[{...quote.sourceItems[0],description:'2x4 lumber 10 ft',quantity:600,unit_price:6.99,line_total:4194}]}
 const a={...acceptance,basis:'requested-quantity' as const}
 expect(matrixAcceptanceCost(a,[lumber],[q])).toBe(1747.50)
 expect(receivedPriceSummary([lumber],[q],[],[a]).cells[0][0]).toMatchObject({problem:false,requestedTotal:1747.50})
})
test('accepted source cannot enter two item totals; untouched source remains unresolved',()=>{
 const second={...item,id:'two'}
 expect(matrixAcceptancesError([acceptance,{...acceptance,itemId:'two'}],[item,second],[quote])).toMatch(/already accepted/)
 const summary=receivedPriceSummary([item,second],[quote],[],[acceptance])
 expect(summary.cells[0][0].indicative).toBe(true)
 expect(summary.cells[1][0]).toMatchObject({problem:true,indicative:false,allocatedElsewhere:true})
 expect(summary.suppliers[0].indicativeTotal).toBe(120)
 expect(comparisonSavings(summary,'supplier').selectedComplete).toBe(false)
})
test('changed quote invalidates acceptance; reload retains unchanged acceptance and actor',async()=>{
 const fingerprint=await matrixChoiceFingerprint([item],[quote])
 const a={...acceptance,actorId:'staff',acceptedAt:'2026-09-17T21:00:00Z'}
 const draft={matrix:{baselineQuoteId:'supplier',selections:{one:'supplier'},sourceFingerprint:fingerprint,acceptances:[a]}}
 expect(restoreMatrixChoices(draft,fingerprint).acceptances).toEqual([a])
 const changed=await matrixChoiceFingerprint([item],[{...quote,sourceItems:[{...quote.sourceItems[0],line_total:130}]}])
 expect(restoreMatrixChoices(draft,changed).acceptances).toEqual([])
 expect(parseMatrixAcceptances([{...a,lineNumber:NaN}])).toBeNull()
 expect(matrixAcceptanceCost({...a,lineNumber:999},[item],[quote])).toBeNull()
})
