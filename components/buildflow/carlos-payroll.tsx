"use client"
import {useRef,useState,useTransition} from "react"
import {useRouter} from "next/navigation"
import {requestCarlosPayAction,setCarlosPaidAction} from "@/app/admin/daily-summary/payroll-actions"
import {payrollMoney,payrollTotalCents,type CarlosPayDay} from "@/lib/carlos-payroll"

export function CarlosPayroll({days,canRequest,canMarkPaid,unavailable=false}:{days:CarlosPayDay[];canRequest:boolean;canMarkPaid:boolean;unavailable?:boolean}) {
 const router=useRouter();const [selected,setSelected]=useState<string[]>([]);const [pending,startTransition]=useTransition()
 const [message,setMessage]=useState("");const requestId=useRef("")
 const chosen=days.filter(day=>selected.includes(day.date)&&!day.paidAt&&!day.requestedAt)
 function toggle(date:string) {requestId.current="";setSelected(values=>values.includes(date)?values.filter(value=>value!==date):[...values,date]);setMessage("")}
 function requestPay(){if(!requestId.current)requestId.current=crypto.randomUUID();startTransition(async()=>{
  const result=await requestCarlosPayAction(chosen.map(day=>day.date),requestId.current)
  setMessage(result.ok?`Requested ${payrollMoney(result.totalCents??0)}. Not marked paid.`:result.error||"Please try again.")
  if(result.ok){setSelected([]);requestId.current="";router.refresh()}
 })}
 function mark(day:CarlosPayDay){startTransition(async()=>{const result=await setCarlosPaidAction(day.date,!day.paidAt,day.version);setMessage(result.ok?"Payment status updated.":result.error||"Please try again.");if(result.ok)router.refresh()})}
 return <section aria-label="Carlos pay" className="mb-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4"><div><h2 className="font-semibold">Pay</h2><p className="text-xs text-slate-500">$5/hour · breaks excluded</p></div><div className="text-right"><p className="text-xs text-slate-500">Unpaid total</p><p className="text-xl font-semibold tabular-nums">{unavailable?"—":payrollMoney(payrollTotalCents(days.filter(day=>!day.paidAt)))}</p></div></header>
  {unavailable?<p role="status" className="p-4 text-sm text-amber-800">Pay records are unavailable. Nothing was changed.</p>:!days.length?<p className="p-4 text-sm text-slate-500">Completed workdays appear here after clock out.</p>:<div className="max-h-80 overflow-y-auto">{days.map(day=><div key={day.date} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
   {canRequest?<input aria-label={`Request pay for ${day.date}`} type="checkbox" checked={chosen.some(value=>value.date===day.date)} disabled={pending||!!day.paidAt||!!day.requestedAt} onChange={()=>toggle(day.date)} className="h-5 w-5 shrink-0"/>:null}
   <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{day.date}</p><p className="text-xs text-slate-500">{(day.workedMs/3_600_000).toFixed(2)} hours · {day.paidAt?"Paid":day.requestedAt?"Requested · unpaid":"Unpaid"}</p></div>
   <span className="text-sm font-semibold tabular-nums">{payrollMoney(payrollTotalCents([day]))}</span>
   {canMarkPaid?<button type="button" disabled={pending} onClick={()=>mark(day)} className="min-h-11 rounded-md border border-slate-300 px-3 text-xs font-semibold disabled:opacity-50">{day.paidAt?"Mark unpaid":"Mark paid"}</button>:null}
  </div>)}</div>}
  {canRequest&&!unavailable?<div className="p-4"><button type="button" disabled={pending||!chosen.length} onClick={requestPay} className="min-h-11 w-full rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-40 sm:w-auto">{pending?"Requesting…":`Request ${payrollMoney(payrollTotalCents(chosen))}`}</button></div>:null}
  {message?<p role="status" className="px-4 pb-4 text-sm">{message}</p>:null}
 </section>
}
