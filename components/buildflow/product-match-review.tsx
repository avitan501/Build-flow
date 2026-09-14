"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmProductMatchAction } from "@/app/admin/quote-comparison/product-match-actions";
import { canonicalProductMatch, productMatchSnapshot, type QuoteComparisonBidRecord, type QuoteComparisonItemRecord } from "@/lib/quote-comparison";

export function ProductMatchReview({item,bid,disabled,beforeConfirm}:{item:QuoteComparisonItemRecord;bid:QuoteComparisonBidRecord;disabled:boolean;beforeConfirm:()=>Promise<boolean>}) {
  const router=useRouter();
  const [checked,setChecked]=useState(false),[unit,setUnit]=useState(""),[error,setError]=useState("");
  const [pending,startTransition]=useTransition();
  const price=bid.quote_comparison_prices?.find(row=>row.item_id===item.id);
  if(!price?.notes.trim())return <p className="px-3 pb-3 text-xs text-amber-900">Upload the supplier quote with its original wording before reviewing.</p>;
  return <details className="border-t border-amber-100 bg-amber-50/50 px-3 text-xs">
    <summary className="min-h-11 cursor-pointer py-3 font-bold text-sky-800">Review this match</summary>
    <div className="grid gap-3 pb-3">
      <div><p className="font-bold">Requested</p><p>{item.description} · {item.specification} · {item.quantity} {item.unit}</p></div>
      <div><p className="font-bold">Supplier original</p><p className="whitespace-pre-wrap">{price.notes}</p></div>
      <label className="flex items-start gap-2"><input type="checkbox" checked={checked} disabled={disabled||pending} onChange={event=>setChecked(event.target.checked)} className="mt-1 h-5 w-5 shrink-0"/><span>I reviewed the source and specifications. This is the requested product or a suitable equivalent.</span></label>
      <label className="grid gap-1">The supplier price is for one…<input value={unit} onChange={event=>setUnit(event.target.value)} disabled={disabled||pending} placeholder={`Type the verified unit (${item.unit})`} className="min-h-11 rounded-lg border bg-white px-3"/></label>
      <p className="text-slate-600">No unit conversion. Original wording stays unchanged. Changes require a new review.</p>
      <button type="button" disabled={disabled||pending||!checked||!unit.trim()} onClick={()=>startTransition(async()=>{setError("");try{if(!await beforeConfirm())return;const result=await confirmProductMatchAction({comparisonId:item.comparison_id,itemId:item.id,bidId:bid.id,expectedSource:canonicalProductMatch(productMatchSnapshot(item,bid,price)),sellingUnit:unit,confirmed:checked});if(!result.ok){setError(result.error||"Not confirmed");return;}router.refresh();}catch{setError("Not confirmed. Keep this review open and try again.");}})} className="min-h-11 rounded-lg bg-slate-950 px-3 font-bold text-white disabled:opacity-40">{pending?"Confirming…":"Confirm reviewed match"}</button>
      {error?<p role="alert" className="text-rose-700">{error}</p>:null}
    </div>
  </details>;
}
