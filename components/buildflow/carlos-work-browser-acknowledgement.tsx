"use client"

import { CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { acknowledgeCarlosWorkBrowserAction } from "@/app/admin/ai-tools/work-browser/actions"

export function CarlosWorkBrowserAcknowledgement({ statement }: { statement: string }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function accept() {
    if (!checked) return
    setError("")
    startTransition(async () => {
      const result = await acknowledgeCarlosWorkBrowserAction()
      if (!result.ok) { setError(result.error); return }
      router.refresh()
    })
  }

  return <section className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-sky-200 bg-white shadow-sm">
    <header className="flex items-center gap-3 bg-[#071126] px-5 py-4 text-white"><span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-sky-300">One-time acknowledgement</p><h1 className="text-xl font-semibold">Employee Work Browser</h1></div></header>
    <div className="grid gap-4 p-5">
      <p className="text-sm leading-6 text-slate-700">This is a company-owned browser for Avantia Build work. It is separate from David&apos;s private browser.</p>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} className="mt-1 h-4 w-4" /><span>{statement}</span></label>
      {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
      <button type="button" onClick={accept} disabled={!checked || pending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-bold text-white disabled:bg-slate-300">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Accept and open work browser</button>
    </div>
  </section>
}
