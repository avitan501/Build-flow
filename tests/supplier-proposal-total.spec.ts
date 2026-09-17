import {test,expect} from '@playwright/test'
import {supplierProposalTotal} from '../lib/supplier-proposal-total'
import {receivedPriceSummary} from '../lib/received-price-summary'
const lines=[{line_number:1,description:'Lumber',specification:'2x6 10 ft',quantity:600,unit:'each',unit_price:10,line_total:6000}]
test('Midwood MERCHANDISE is the original material subtotal, never tax-inclusive TOTAL',()=>{
 const source=[{...lines[0],line_total:49038.51}]
 for(const text of ['MERCHANDISE 49038.51\nOTHER 0.00\nTAX 4352.17\nFREIGHT 0.00\nTOTAL 53390.68','MERCHANDISE\n49,038.51\nOTHER\n0.00\nTOTAL\n53,390.68','MERCHANDISE\nOTHER\nTAX\nMERCHANDISE 49038.51']){
  expect(supplierProposalTotal(text,source)).toEqual({amount:49038.51,basis:'document-subtotal',discrepancy:false})
 }
 expect(supplierProposalTotal('MERCHANDISE 49038.51\nMERCHANDISE 100.00',source).basis).toBe('source-lines')
 expect(supplierProposalTotal('MERCHANDISE PLYWOOD 49038.51',[]).amount).toBeNull()
})
test('original proposal total never shrinks to requested quantities or match approval',()=>{
 expect(supplierProposalTotal('Subtotal 6000.00\nTax 500.00\nTotal 6500.00',lines)).toEqual({amount:6000,basis:'document-subtotal',discrepancy:false})
 expect(supplierProposalTotal('',lines).amount).toBe(6000)
 expect(supplierProposalTotal('Subtotal 2000.00\nSubtotal 4000.00',lines).amount).toBe(6000)
 expect(supplierProposalTotal('Subtotal 6000.00\nSubtotal 6000.00',lines).amount).toBe(6000)
})
test('removes explicitly reconciled delivery, never tax total or invented zero',()=>{
 expect(supplierProposalTotal('Subtotal 6100.00\nDelivery 100.00\nTotal 6600.00',lines).amount).toBe(6000)
 expect(supplierProposalTotal('Total 6600.00',[]).amount).toBeNull()
 expect(supplierProposalTotal('',[{...lines[0],line_total:null as unknown as number}]).amount).toBeNull()
 expect(supplierProposalTotal('Subtotal 5900.00',lines)).toEqual({amount:5900,basis:'document-subtotal',discrepancy:true})
})
test('same original total despite missing request items and quantities; missing and differences kept separate',()=>{
 const items=[{id:'lumber',description:'Lumber',specification:'2x6 10 ft',quantity:250,unit:'each'},{id:'adhesive',description:'Construction adhesive',specification:'PL',quantity:2,unit:'box'}] as Parameters<typeof receivedPriceSummary>[0]
 const totals=receivedPriceSummary(items,[{id:'q',fileName:'quote.pdf',sourceItems:lines,proposalTotal:supplierProposalTotal('Subtotal 6000.00',lines)}],[])
 // JSX nodes are serialized by Playwright's TS transform; test arithmetic and
 // component source-independent result directly rather than changing quantities.
 expect(totals.suppliers[0].quote.proposalTotal?.amount).toBe(6000)
 expect(totals.suppliers[0].indicativeTotal).toBe(2500)
 expect(totals.suppliers[0].missingCount).toBe(1)
})
