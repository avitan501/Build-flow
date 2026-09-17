import {formatComparisonMoney} from '@/lib/quote-comparison'
import type {receivedPriceSummary} from '@/lib/received-price-summary'

export function SupplierProposalTotals({totals,materialLines}:{totals:ReturnType<typeof receivedPriceSummary>;materialLines:Record<string,string>}){
 return <tr data-testid="supplier-proposal-totals" className="align-top border-b border-slate-300">
  <th>Supplier proposal total<p className="mt-1 text-[10px] font-normal text-slate-500">Original quoted materials · before tax<br/>Delivery excluded</p></th>
  {totals.suppliers.map((supplier,index)=>{
   const proposal=supplier.quote.proposalTotal
   const source=supplier.quote.sourceItems??[]
   const valid=source.length>0&&source.every(l=>l.line_total!==null&&l.line_total!==undefined&&Number.isFinite(Number(l.line_total))&&Number(l.line_total)>=0)
   const amount=proposal?.amount??(valid?source.reduce((n,l)=>n+Math.round(Number(l.line_total)*100),0)/100:null)
   const missing=totals.rows.flatMap((row,rowIndex)=>totals.cells[rowIndex][index].missing?[{item:row.item,index:rowIndex}]:[])
   const differences=totals.cells.flatMap((row,rowIndex)=>row[index].problem?[rowIndex+1]:[])
   return <td key={supplier.quote.id} data-testid="supplier-proposal-total">
    <p className="font-bold text-base tabular-nums">{amount===null?'Not available':formatComparisonMoney(amount)}</p>
    <p className="mt-1 text-[10px] text-slate-500">{proposal?.basis==='document-subtotal'?'From original proposal':'Quoted source-line sum · document subtotal not confirmed'}</p>
    {proposal?.discrepancy?<p className="mt-2 text-[10px] text-amber-800">Difference: document subtotal and extracted line totals do not reconcile. Review original proposal.</p>:null}
    {missing.length?<details className="mt-2"><summary className="min-h-11 cursor-pointer font-semibold">Proposal may be missing {missing.length} requested items</summary><ol className="space-y-2 text-[10px]">{missing.map(({item,index})=><li key={item.id}>Item {index+1}: {materialLines[item.id]||`${item.quantity} ${item.unit} · ${item.description}`} · no source match found; check original quote.</li>)}</ol></details>:null}
    {differences.length?<details className="mt-2"><summary className="min-h-11 cursor-pointer">Differences to review: {differences.length} items</summary><p className="text-[10px]">Items {differences.join(', ')}. Use their dots to see the exact requested-versus-quoted difference. These checks do not reduce the original proposal total.</p></details>:null}
   </td>
  })}
  <td className="sticky right-0 z-10 border-l border-slate-200 bg-slate-50"><p className="text-[10px] text-slate-600">Proposal totals may cover different quantities or items. Mixed-basket savings below compare the same requested rows—not these unequal proposal totals.</p></td>
 </tr>
}
