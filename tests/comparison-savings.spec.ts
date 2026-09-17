import { test,expect } from '@playwright/test'
import { comparisonSavings,selectedSupplierCosts } from '../lib/comparison-savings'
import { receivedPriceSummary } from '../lib/received-price-summary'
import {productMatchSnapshot,type QuoteComparisonItemRecord,type QuoteComparisonBidRecord} from '../lib/quote-comparison'
const item={id:'a',description:'Dimensional lumber',specification:'2 x 6 in · 10 ft',quantity:10,unit:'pieces'} as QuoteComparisonItemRecord
const quote=(id:string,price:number)=>({id,fileName:id,sourceItems:[{line_number:1,description:'2x6 lumber 10 ft',specification:'',quantity:10,unit:'each',unit_price:price,line_total:price*10}]})
test('chosen supplier versus cheapest: requested line costs, zero savings, and unchanged sources',()=>{
 const summary=receivedPriceSummary([item],[quote('cheap',100),quote('chosen',120)],[])
 expect(comparisonSavings(summary,'chosen').rows[0].savings).toBe(200)
 expect(comparisonSavings(summary,'chosen').baselineTotal).toBe(1200)
 expect(comparisonSavings(summary,'chosen').cheapestTotal).toBe(1000)
 expect(comparisonSavings(summary,'cheap').rows[0].savings).toBe(0)
 expect(comparisonSavings(summary,'').savingsTotal).toBeNull()
})
test('missing at one supplier is not missing across the request; no false savings for unavailable price',()=>{
 const summary=receivedPriceSummary([item],[quote('cheap',100),{id:'absent',fileName:'absent',sourceItems:[]}],[])
 const result=comparisonSavings(summary,'absent')
 expect(result.missingCount).toBe(0);expect(result.baselineTotal).toBeNull();expect(result.savingsTotal).toBeNull()
 expect(comparisonSavings(receivedPriceSummary([item],[],[]),'').missingCount).toBe(1)
})
test('quantity conflicts and ambiguous matches cannot become cheapest savings',()=>{
 const conflicting=quote('wrong',1);conflicting.sourceItems[0].quantity=2
 const result=comparisonSavings(receivedPriceSummary([item],[quote('good',100),conflicting],[]),'wrong')
 expect(result.rows[0].cheapest?.quoteId).toBe('good');expect(result.rows[0].savings).toBeNull()
})
test('selected costs preserve existing saved bid choices; unknown freight is not free',()=>{
 const bid={id:'bid',supplier_id:'supplier:quote',supplier_name_snapshot:'Supplier',source_supplier_quote_id:'q',trust_level_snapshot:'verified',status:'received',delivery_charge:100,tax_percent:10,quote_comparison_prices:[{item_id:'a',bid_id:'bid',unit_price:100,is_available:true,notes:'2 x 6 in · 10 ft dimensional lumber'}]} as QuoteComparisonBidRecord
 const price=bid.quote_comparison_prices![0]
 price.quote_product_match_confirmations=[{id:'review',actor_id:'actor',actor_label:'David',created_at:'2026-09-17',source_fingerprint:'a'.repeat(64),source_snapshot:productMatchSnapshot(item,bid,price),selling_unit:'pieces'}]
 const summary=receivedPriceSummary([item],[quote('q',100)],[bid])
 const selected=selectedSupplierCosts(summary,[bid],{a:'bid'})
 expect(selected.selectedCount).toBe(1);expect(selected.materials).toBe(1000)
 expect(selected.suppliers[0].delivery).toBe(100);expect(selected.suppliers[0].tax).toBe(110);expect(selected.total).toBe(1210)
 expect(selectedSupplierCosts(summary,[{...bid,delivery_charge:null as unknown as number}],{a:'bid'}).total).toBeNull()
 expect(selectedSupplierCosts(summary,[bid],{}).materials).toBeNull()
})
