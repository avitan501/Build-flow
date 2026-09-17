import {test,expect} from '@playwright/test'
import {receivedPriceSummary,requestedSourceTotal} from '../lib/received-price-summary'
import type {QuoteComparisonItemRecord,QuoteComparisonBidRecord} from '../lib/quote-comparison'
import {productMatchSnapshot} from '../lib/quote-comparison'
const item=(id:string,quantity=12,unit='pieces')=>({id,description:'Dimensional lumber',specification:'2 x 12 in · 28 ft',quantity,unit} as QuoteComparisonItemRecord)
const line=(price=176,quantity=28,unit='each')=>({line_number:1,description:'2x12 lumber 28\'',specification:'',quantity,unit,unit_price:price,line_total:price*quantity})
test('requested line arithmetic uses requested quantity, not the quoted quantity or line amount',()=>{
 expect(requestedSourceTotal(item('a'),line())).toBe(2112)
 expect(requestedSourceTotal(item('a'),line(37.1936))).toBe(446.32)
 expect(requestedSourceTotal(item('a'),line(0))).toBe(0)
 for(const source of [line(-1),line(NaN),line(176,2,'box')])expect(requestedSourceTotal(item('a'),source)).toBeNull()
 expect(requestedSourceTotal(item('a',0),line())).toBeNull()
})
test('source prices remain indicative and unequal partial subtotals never select a winning supplier',()=>{
 const inputs=[item('a'),{...item('b'),description:'LVL beam',specification:'9.5 in · 24 ft'}]
 const quotes=[{id:'full',fileName:'full',sourceItems:[line(),{...line(100,12),line_number:2,description:'LVL beam',specification:'9.5 in · 24 ft'}]},{id:'partial',fileName:'partial',sourceItems:[line(1)]}]
 const before=JSON.stringify({inputs,quotes}),result=receivedPriceSummary(inputs,quotes,[])
 expect(result.suppliers[0].pricedCount).toBe(2);expect(result.suppliers[1].pricedCount).toBe(1)
 expect(result.suppliers[1].missingCount).toBe(1);expect(result.commonCount).toBe(0)
 expect(result.suppliers.every(s=>s.verifiedTotal===null)).toBe(true)
 expect(JSON.stringify({inputs,quotes})).toBe(before)
})
test('ambiguous, packaging and reused-source candidates cannot inflate indicative totals',()=>{
 const target=item('a'),source=line(12,12)
 expect(receivedPriceSummary([target],[{id:'q',fileName:'q',sourceItems:[source,{...source,line_number:2}]}],[]).suppliers[0].indicativeTotal).toBeNull()
 expect(receivedPriceSummary([item('a',2,'box')],[{id:'q',fileName:'q',sourceItems:[source]}],[]).suppliers[0].indicativeTotal).toBeNull()
 const reused=receivedPriceSummary([target,{...target,id:'b'}],[{id:'q',fileName:'q',sourceItems:[source]}],[])
 expect(reused.suppliers[0].pricedCount).toBe(0);expect(reused.suppliers[0].indicativeTotal).toBeNull()
})
test('LF requested totals are computed once and source rate/footage remain unchanged',()=>{
 const target={...item('a',6),description:'LVL beam',specification:'9.5 in · 20 ft'},source={...line(5.2,380,'lf'),description:'LVL beam',specification:'9.5 in'}
 const result=receivedPriceSummary([target],[{id:'q',fileName:'q',sourceItems:[source]}],[])
 expect(result.cells[0][0].requestedTotal).toBe(624);expect(result.suppliers[0].indicativeTotal).toBe(624)
 expect(source.unit_price).toBe(5.2);expect(source.quantity).toBe(380)
})
test('exact wording without a saved manual confirmation is not a verified summary',()=>{
 const target=item('a'),bid={id:'bid',source_supplier_quote_id:'q',supplier_id:'s',trust_level_snapshot:'verified',status:'received',quote_comparison_prices:[{item_id:'a',unit_price:100,is_available:true,notes:'Dimensional lumber 2 x 12 in 28 ft'}]} as QuoteComparisonBidRecord
 const result=receivedPriceSummary([target],[{id:'q',fileName:'q',sourceItems:[line()]}],[bid])
 expect(result.suppliers[0].verifiedCount).toBe(0);expect(result.commonCount).toBe(0)
})
test('saved reviews enable same-row cost comparisons; changed quantity invalidates the review',()=>{
 const target=item('a'),quotes=['q1','q2'].map(id=>({id,fileName:id,sourceItems:[line(176,12)]}))
 const bids=quotes.map((quote,index)=>{
  const bid={id:quote.id,source_supplier_quote_id:quote.id,supplier_id:quote.id,trust_level_snapshot:'verified',status:'received',quote_comparison_prices:[{bid_id:quote.id,item_id:target.id,unit_price:100+index,is_available:true,notes:'Dimensional lumber 2 x 12 in 28 ft'}]} as QuoteComparisonBidRecord
  const price=bid.quote_comparison_prices![0]
  price.quote_product_match_confirmations=[{id:'review',actor_id:'actor',actor_label:'Carlos',created_at:'2026-09-17',source_fingerprint:'a'.repeat(64),source_snapshot:productMatchSnapshot(target,bid,price),selling_unit:'pieces'}]
  return bid
 })
 const result=receivedPriceSummary([target],quotes,bids)
 expect(result.commonCount).toBe(1);expect(result.commonTotals.map(s=>s.total)).toEqual([1200,1212])
 expect(result.suppliers.map(s=>s.verifiedCount)).toEqual([1,1])
 expect(receivedPriceSummary([{...target,quantity:13}],quotes,bids).commonCount).toBe(0)
})
