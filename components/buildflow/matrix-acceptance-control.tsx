'use client'
import {useState} from 'react'
import {matrixAcceptanceCost,type MatrixAcceptance} from '@/lib/matrix-match-acceptance'
import {comparisonIndicators,receivedProductPriceRows} from '@/lib/received-product-prices'
import type {QuoteComparisonItemRecord} from '@/lib/quote-comparison'
import type {ReceivedSupplierQuote} from './received-supplier-quote-table'

export function MatrixAcceptanceControl({item,items=[item],quote,acceptances,onAccept,disabled=false,saveStatus,saveError}:{item:QuoteComparisonItemRecord;items?:QuoteComparisonItemRecord[];quote:ReceivedSupplierQuote;acceptances:MatrixAcceptance[];onAccept:(value:MatrixAcceptance|null,itemId:string,quoteId:string)=>void;disabled?:boolean;saveStatus?:string;saveError?:string|null}){
 const cell=receivedProductPriceRows(items,[quote]).find(row=>row.item.id===item.id)?.cells[0]
 const existing=acceptances.find(a=>a.itemId===item.id&&a.quoteId===quote.id)
 const [lineNumber,setLineNumber]=useState(existing?.lineNumber??(cell?.lines.length===1?cell.lines[0].line_number:-1))
 const [consent,setConsent]=useState(false)
 const line=cell?.lines.find(l=>l.line_number===lineNumber)
 const packaging=line&&comparisonIndicators(item,[line],cell?.reasons??[]).some(i=>i.kind==='packaging')
 const value:MatrixAcceptance={itemId:item.id,quoteId:quote.id,lineNumber,basis:packaging?'quoted-line':'requested-quantity'}
 const cost=matrixAcceptanceCost(value,items,[quote])
 const reserved=acceptances.some(a=>a.quoteId===quote.id&&a.lineNumber===lineNumber&&a.itemId!==item.id)
 const money=cost===null?'Not available':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cost)
 return <div data-testid="accept-difference-control" className="mt-3 space-y-3 text-sm">
  {existing?<><p className="font-semibold text-emerald-800">Difference accepted for this item · {money}</p><button type="button" disabled={disabled} onClick={()=>onAccept(null,item.id,quote.id)} className="min-h-11 rounded-lg border px-3">Undo acceptance</button></>:<>
  {cell?.lines.length!==1?<label className="grid gap-1">Choose the exact source line<select value={lineNumber} disabled={disabled} onChange={e=>{setLineNumber(Number(e.target.value));setConsent(false)}} className="min-h-11 rounded-lg border px-3"><option value={-1}>Select source line</option>{cell?.lines.map(l=><option key={l.line_number} value={l.line_number}>Line {l.line_number}: {l.description}</option>)}</select></label>:null}
  <p>Cost to include: <strong>{money}</strong> · before tax, delivery excluded.</p>
  <p className="text-xs text-slate-600">{packaging?'Uses the supplier’s full quoted line total. This does not establish pieces per box.':'Uses your requested quantity × the supplier unit price.'} Acceptance is for this item only, not engineering certification or an order.</p>
  {reserved?<p role="alert" className="text-red-700">This source is already accepted for another item. It cannot be counted twice.</p>:null}
  <label className="flex items-start gap-2"><input type="checkbox" checked={consent} disabled={disabled||reserved||cost===null} onChange={e=>setConsent(e.target.checked)} className="mt-1"/>I accept the displayed differences and this cost for this item.</label>
  <button type="button" disabled={disabled||!consent||reserved||cost===null} onClick={()=>{onAccept(value,item.id,quote.id);setConsent(false)}} className="min-h-11 rounded-lg bg-slate-950 px-4 text-white disabled:opacity-40">Accept difference for this item</button>
  <p className="text-xs text-slate-500">Saved with the purchasing draft. Check the page’s save status before leaving.</p>
  </>}
  {saveStatus?<p role="status" data-testid="acceptance-save-status" className={saveError?'text-red-700':'text-xs text-slate-600'}>{saveError??(saveStatus==='saved'?'Purchasing draft saved · not an order':saveStatus==='saving'?'Saving purchasing draft…':'Purchasing draft not saved yet')}</p>:null}
 </div>
}
