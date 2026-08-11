"use client"

import { AlertTriangle, CheckCircle2, ExternalLink, Play } from "lucide-react"
import Link from "next/link"
import { useActionState } from "react"

import { runOrderTestAction, type OrderTestState } from "@/app/admin/ai-tools/order-test/actions"

type DepartmentOption = { slug: string; label: string }
const initialState: OrderTestState = { status: "idle", message: "", checks: [] }

export function OrderFlowTest({ departments }: { departments: DepartmentOption[] }) {
  const [state, action, pending] = useActionState(runOrderTestAction, initialState)
  return (
    <div className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <form action={action} className="grid content-start gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <label className="grid gap-1.5 text-sm font-semibold text-slate-800">Department<select name="department" required defaultValue="" className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"><option value="" disabled>Choose department</option>{departments.map((department) => <option key={department.slug} value={department.slug}>{department.label}</option>)}</select></label>
        <fieldset><legend className="text-sm font-semibold text-slate-800">Order path</legend><div className="mt-2 grid grid-cols-2 gap-2"><label className="cursor-pointer"><input className="peer sr-only" type="radio" name="mode" value="quick" defaultChecked /><span className="flex min-h-12 items-center justify-center rounded-lg border border-slate-300 px-3 text-center text-sm font-semibold text-slate-700 peer-checked:border-[#0071e3] peer-checked:bg-sky-50 peer-checked:text-[#005bb5]">Quick Order</span></label><label className="cursor-pointer"><input className="peer sr-only" type="radio" name="mode" value="upload" /><span className="flex min-h-12 items-center justify-center rounded-lg border border-slate-300 px-3 text-center text-sm font-semibold text-slate-700 peer-checked:border-[#0071e3] peer-checked:bg-sky-50 peer-checked:text-[#005bb5]">Upload a plan</span></label></div></fieldset>
        <button disabled={pending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50"><Play className="h-4 w-4" />{pending ? "Testing…" : "Run order test"}</button>
        <p className="text-xs leading-5 text-slate-500">This checks the live route and settings without creating a customer, project, or fake order.</p>
      </form>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        {state.status === "idle" ? <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 text-center"><div><Play className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 text-sm font-semibold text-slate-700">Choose a department and order path.</p><p className="mt-1 text-xs text-slate-500">The result will identify exactly what is ready or missing.</p></div></div> : <><div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${state.status === "passed" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>{state.status === "passed" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />}<div><h2 className="font-bold text-slate-950">{state.status === "passed" ? "Working" : "Needs attention"}</h2><p className="mt-0.5 text-sm text-slate-600">{state.message}</p></div></div><div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">{state.checks.map((check) => <div key={check.label} className="flex items-start gap-3 px-4 py-3">{check.passed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}<div><p className="text-sm font-bold text-slate-900">{check.label}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{check.detail}</p></div></div>)}</div>{state.route ? <Link href={state.route} target="_blank" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-[#0066cc]">Open customer page<ExternalLink className="h-4 w-4" /></Link> : null}</>}
      </section>
    </div>
  )
}
