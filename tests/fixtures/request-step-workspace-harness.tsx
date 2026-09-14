"use client"
// Local browser harness only. Never expose this fixture as a production route.
import { useEffect, useState } from "react"
import Link from "next/link"
import { RequestStepWorkspace, RequestStepStatusPopover, RequestAttentionIndicator } from "@/components/buildflow/request-step-workspace"
import { deriveRequestSteps, type RequestStepRecord } from "@/lib/request-step-state"
import type { updateRequestWorkflowStepDetailsAction } from "@/app/owner/materials/requests/actions"
const requestId = "11111111-1111-1111-1111-111111111111"
let fail = false, conflict = false
const save: typeof updateRequestWorkflowStepDetailsAction = async input => {
  await new Promise(resolve => setTimeout(resolve, 700))
  if (fail) { fail = false; return { ok: false, error: "Fixture save failure" } }
  const records = JSON.parse(localStorage.getItem("step-fixture-records") || "[]") as RequestStepRecord[]
  const current = records.find(row => row.step === input.step)
  if (conflict) { conflict = false; return { ok: false, error: "Fixture conflict. Review and retry.", current: { request_id: requestId, step: input.step as 1 | 2 | 3, assignee: "david", note: "Other edit", completed_override: false, revision: 9 } } }
  const record: RequestStepRecord = { request_id: requestId, step: input.step as 1 | 2 | 3, assignee: "carlos", note: "", completed_override: null, ...current, ...input.patch, revision: input.revision + 1 }
  localStorage.setItem("step-fixture-records", JSON.stringify([...records.filter(row => row.step !== input.step), record]))
  return { ok: true, record }
}
export default function Fixture() {
  const [records,setRecords] = useState<RequestStepRecord[]>([])
  useEffect(()=>{const frame=requestAnimationFrame(()=>setRecords(JSON.parse(localStorage.getItem("step-fixture-records") || "[]")));return()=>cancelAnimationFrame(frame)},[])
  const states = deriveRequestSteps({ requestId, assignee:"carlos", records, eligible:[true,true,true],legacyCompleted:[false,false,false] })
  return <RequestStepWorkspace initial={states} available actorId="fixture-user" saveAction={save}><main className="mx-auto max-w-3xl bg-slate-50 p-4"><RequestAttentionIndicator guidance={{step:1,text:"Review items.",waiting:false}} events={Array.from({length:35},(_,i)=>({id:String(i),title:`Fixture event ${i}`,description:`Preserved detail ${i}`,createdAt:"2026-09-14T12:00:00Z"}))} />{([1,2,3] as const).map(step=><section id={["request-items-heading","request-supplier-quotes","request-client-delivery"][step-1]} tabIndex={-1} key={step} className="my-4 rounded-xl bg-white p-4"><h2>Step {step}</h2><RequestStepStatusPopover step={step}/></section>)}<button onClick={()=>{fail=true}}>Fail next</button><button onClick={()=>{conflict=true}}>Conflict next</button><Link href="/">Leave fixture</Link></main></RequestStepWorkspace>
}
