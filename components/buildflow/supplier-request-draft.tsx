"use client"

import { ArrowLeft, CheckCircle2, Mail, Send, XCircle } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"

import { sendSupplierQuoteRequestsAction, type SupplierQuoteDeliveryResult } from "@/app/admin/vendors/actions"

type DraftSupplier = { id: string; name: string; email: string }

export function SupplierRequestDraft({
  requestId,
  requestTitle,
  department,
  suppliers,
  initialAddress,
  initialMaterialList,
}: {
  requestId: string
  requestTitle: string
  department: string
  suppliers: DraftSupplier[]
  initialAddress: string
  initialMaterialList: string
}) {
  const [jobAddress, setJobAddress] = useState(initialAddress)
  const [subject, setSubject] = useState(`Pricing request: ${requestTitle}`)
  const [materialList, setMaterialList] = useState(initialMaterialList)
  const [results, setResults] = useState<SupplierQuoteDeliveryResult[]>([])
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  const sent = results.some((result) => result.ok)

  function sendRequests() {
    setError("")
    setResults([])
    startTransition(async () => {
      const result = await sendSupplierQuoteRequestsAction({
        supplierIds: suppliers.map((supplier) => supplier.id),
        jobAddress,
        subject,
        materialList,
      })
      setResults(result.results)
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 pb-28 pt-5 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href={`/owner/materials/requests/${requestId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[#0066cc]"><ArrowLeft className="h-4 w-4" />Back to request</Link>
        <header className="mt-5 rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0066cc]">Supplier request draft</p>
          <h1 className="mt-1 text-2xl font-bold">Review before sending</h1>
          <p className="mt-2 text-sm text-slate-600">Nothing is sent until you press Send requests.</p>
        </header>

        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
            <div><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Request</p><h2 className="mt-1 text-lg font-bold">{requestTitle}</h2><p className="mt-1 text-sm text-slate-600">{department}</p></div>
            <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800">{suppliers.length} supplier{suppliers.length === 1 ? "" : "s"}</span>
          </div>

          <div className="mt-4">
            <p className="text-sm font-bold">Recipients</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {suppliers.map((supplier) => <div key={supplier.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-sm font-bold">{supplier.name}</p><p className="truncate text-xs text-slate-600">{supplier.email}</p></div>)}
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-1.5 text-sm font-bold">Shipping or job address<input value={jobAddress} onChange={(event) => setJobAddress(event.target.value)} maxLength={500} className="min-h-11 rounded-lg border border-slate-300 px-3 text-base font-normal outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" /></label>
            <label className="grid gap-1.5 text-sm font-bold">Email subject<input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={300} className="min-h-11 rounded-lg border border-slate-300 px-3 text-base font-normal outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" /></label>
            <label className="grid gap-1.5 text-sm font-bold">Items and request details<textarea value={materialList} onChange={(event) => setMaterialList(event.target.value)} rows={12} maxLength={20_000} className="resize-y rounded-lg border border-slate-300 px-3 py-3 font-mono text-sm leading-6 font-normal outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" /></label>
          </div>

          {error ? <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</p> : null}
          {results.length ? <div className="mt-4 grid gap-2" aria-label="Supplier delivery results">{results.map((result) => <div key={result.supplierId} className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${result.ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>{result.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />}<div><p className="text-sm font-bold">{result.supplierName}</p><p className="mt-0.5 text-xs text-slate-700">{result.ok ? "Email sent and saved in Sent Requests." : result.error}</p></div></div>)}</div> : null}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Link href="/admin/supplier-requests" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"><Mail className="h-4 w-4" />Sent requests</Link>
            <button type="button" onClick={sendRequests} disabled={pending || sent || !jobAddress.trim() || !subject.trim() || !materialList.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-5 text-sm font-semibold text-white disabled:opacity-45"><Send className="h-4 w-4" />{pending ? "Sending..." : sent ? "Requests sent" : `Send to ${suppliers.length} supplier${suppliers.length === 1 ? "" : "s"}`}</button>
          </div>
        </section>
      </div>
    </main>
  )
}
