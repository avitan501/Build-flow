import {test,expect} from '@playwright/test'
import {parseMatrixChoiceDraft,matrixChoiceFingerprint,matrixChoiceScopeError,restoreMatrixChoices} from '../lib/matrix-choice-draft'
import {parseProductChoiceDraft} from '../lib/product-choice-draft'
import {comparisonSavings,purchasingDraftCosts} from '../lib/comparison-savings'
import {receivedPriceSummary} from '../lib/received-price-summary'
import type {QuoteComparisonItemRecord} from '../lib/quote-comparison'
const item={id:'item',description:'Dimensional lumber',specification:'2 x 6 in · 10 ft',quantity:10,unit:'pieces'} as QuoteComparisonItemRecord
const quote=(id:string,price:number)=>({id,supplierName:id,fileName:id+'.pdf',sourceItems:[{line_number:1,description:'2x6 lumber 10 ft',specification:'',quantity:10,unit:'each',unit_price:price,line_total:price*10,comparison_item_id:null}]})
test('selected supplier, not cheapest suggestion, drives savings; zero and extra are supported',()=>{
 const summary=receivedPriceSummary([item],[quote('cheap',100),quote('baseline',120),quote('expensive',130)],[])
 expect(comparisonSavings(summary,'baseline',{}).rows[0].savings).toBeNull()
 expect(comparisonSavings(summary,'baseline',{item:'cheap'}).rows[0].savings).toBe(200)
 const costly=comparisonSavings(summary,'baseline',{item:'expensive'})
 expect(costly.rows[0].savings).toBe(-100);expect(costly.rows[0].selected?.quoteId).toBe('expensive')
 expect(costly.selectedTotal).toBe(1300);expect(costly.selectedComplete).toBe(true)
 expect(comparisonSavings(summary,'baseline',{item:'baseline'}).rows[0].savings).toBe(0)
})
test('unverified purchasing draft is allowed without match approval; conflicts cannot produce savings',()=>{
 const conflicting=quote('wrong',1);conflicting.sourceItems[0].quantity=2
 const summary=receivedPriceSummary([item],[quote('baseline',120),conflicting],[])
 const result=comparisonSavings(summary,'baseline',{item:'wrong'})
 expect(result.selectedCount).toBe(1);expect(result.selectedComplete).toBe(false);expect(result.rows[0].savings).toBeNull()
 expect(summary.cells[0].every(c=>!c.verified)).toBe(true)
 expect(purchasingDraftCosts(summary,[],{item:'baseline'}).suppliers[0]).toMatchObject({materials:1200,delivery:null,tax:null,total:null})
})
test('source draft saves and restores baseline and per-item intentions without filling reviewed bid choices',async()=>{
 const quotes=[quote('q',100)],fingerprint=await matrixChoiceFingerprint([item],quotes)
 const matrix={baselineQuoteId:'q',selections:{item:'q'},sourceFingerprint:fingerprint}
 const snapshot={version:1,selections:{},matrix}
 expect(parseProductChoiceDraft(snapshot)).toEqual(snapshot)
 expect(restoreMatrixChoices(snapshot,fingerprint)).toMatchObject({baselineQuoteId:'q',selections:{item:'q'},warning:''})
 expect(restoreMatrixChoices(snapshot,'changed')).toMatchObject({baselineQuoteId:'',selections:{}})
 expect(matrixChoiceScopeError(matrix,[item],quotes)).toBeNull()
 expect(matrixChoiceScopeError({...matrix,baselineQuoteId:'foreign'},[item],quotes)).not.toBeNull()
 expect(matrixChoiceScopeError({...matrix,selections:{other:'q'}},[item],quotes)).not.toBeNull()
 expect(matrixChoiceScopeError({...matrix,selections:{item:'foreign'}},[item],quotes)).not.toBeNull()
})
test('malformed matrix fields and stale source quantities/prices are rejected',async()=>{
 const quotes=[quote('q',100)],fingerprint=await matrixChoiceFingerprint([item],quotes),matrix={baselineQuoteId:'q',selections:{item:'q'},sourceFingerprint:fingerprint}
 expect(parseMatrixChoiceDraft({...matrix,selections:[]})).toBeNull()
 expect(parseProductChoiceDraft({version:1,selections:{},matrix:{}})).toBeNull()
 expect(await matrixChoiceFingerprint([{...item,quantity:11}],quotes)).not.toBe(fingerprint)
 expect(await matrixChoiceFingerprint([item],[quote('q',101)])).not.toBe(fingerprint)
 expect(await matrixChoiceFingerprint([item],quotes)).toBe(fingerprint)
})
test('partial selected request cannot be called full request cost; no price is not zero',()=>{
 const second={...item,id:'second',description:'LVL beam',specification:'9.5 in · 24 ft'}
 const summary=receivedPriceSummary([item,second],[quote('q',100)],[])
 const result=comparisonSavings(summary,'q',{item:'q'})
 expect(result.selectedTotal).toBe(1000);expect(result.selectedComplete).toBe(false);expect(result.selectedCount).toBe(1)
 expect(result.rows[1].missing).toBe(true);expect(result.rows[1].savings).toBeNull()
})
