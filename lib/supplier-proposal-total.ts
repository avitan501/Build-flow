import {parseSupplierQuoteMetadata} from './supplier-quote-parser'
import type {ReceivedSupplierQuoteLine} from '@/components/buildflow/received-supplier-quote-table'

/** Original document arithmetic, independent of request matches and approvals. */
export function supplierProposalTotal(rawText:string,lines:ReceivedSupplierQuoteLine[]){
 rawText=rawText||''
 const metadata=parseSupplierQuoteMetadata(rawText||'')
 const complete=lines.length>0&&lines.every(l=>l.line_total!==null&&l.line_total!==undefined&&Number.isFinite(Number(l.line_total))&&Number(l.line_total)>=0)
 const sourceSum=complete?Math.round(lines.reduce((n,l)=>n+Math.round(Number(l.line_total)*100),0))/100:null
 const printedSubtotals=[...rawText.matchAll(/^\s*(?:materials?\s+)?sub[ \t]*total[ \t]*:?[ \t]+\$?([0-9][0-9,]*(?:\.[0-9]{1,4})?)/gim)].map(m=>Number(m[1].replace(/,/g,'')))
 const distinct=[...new Set(printedSubtotals)]
 const combined=distinct.length>1&&sourceSum!==null&&Math.abs(distinct.reduce((n,v)=>n+v,0)-sourceSum)<=0.01
 // Midwood prints MERCHANDISE instead of SUBTOTAL, with its amount either
 // alongside the label or on the next PDF text-layer line. Blank page footers
 // and multiple conflicting merchandise totals are not confirmed subtotals.
 const merchandise=[...new Set([...rawText.matchAll(/\bMERCHANDISE[ \t]*:?[ \t]*(?:\n[ \t]*)?\$?([0-9][0-9,]*\.[0-9]{2})[ \t]*$/gim)].map(m=>Number(m[1].replace(/,/g,''))))]
 // Midwood's PDF text layer can emit the five footer labels before their
 // values, with timestamp/page text between them. Confirm that layout only
 // when all five amounts reconcile, the tax rate agrees, and rows corroborate.
 const footer=rawText.slice(rawText.toUpperCase().lastIndexOf('MERCHANDISE'))
 const values=[...footer.matchAll(/(?:^|[ \t])\$?([0-9][0-9,]*\.[0-9]{2})[ \t]*$/gm)].map(m=>Number(m[1].replace(/,/g,'')))
 const rate=Number(footer.match(/\b([0-9]+(?:\.[0-9]+)?)%/)?.[1])
 const reordered=/MIDWOOD LUMBER AND MILLWORK/i.test(rawText)&&/^MERCHANDISE\s+OTHER\s+TAX\s+FREIGHT\s+TOTAL\b/i.test(footer)&&values.length===5&&sourceSum!==null&&Math.abs(values[0]-sourceSum)<=0.01&&Math.abs(values[0]+values[1]+values[2]+values[3]-values[4])<=0.01&&Number.isFinite(rate)&&Math.abs(Math.round((values[0]+values[1])*rate)/100-values[2])<=0.01
 const subtotal=combined?sourceSum:metadata.subtotal??(merchandise.length===1?merchandise[0]:reordered?values[0]:null)
 // Subtotals can include an explicitly printed delivery charge. Only remove it
 // when the document subtotal reconciles exactly with material rows + delivery.
 const includesDelivery=subtotal!==null&&sourceSum!==null&&metadata.deliveryCharge!==null&&metadata.deliveryCharge>0&&Math.abs(subtotal-sourceSum-metadata.deliveryCharge)<=0.01
 const amount=subtotal!==null?(includesDelivery?Math.round((subtotal-metadata.deliveryCharge!)*100)/100:subtotal):sourceSum
 return {amount,basis:subtotal!==null?'document-subtotal' as const:sourceSum!==null?'source-lines' as const:'unavailable' as const,discrepancy:subtotal!==null&&sourceSum!==null&&!includesDelivery&&Math.abs(subtotal-sourceSum)>0.01}
}
