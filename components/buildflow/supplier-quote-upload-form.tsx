"use client"

import { FileUp, LoaderCircle, Plus, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"

import { uploadSupplierQuoteAction } from "@/app/admin/supplier-quotes/actions"
import type { SupplierQuoteSupplier } from "@/lib/supplier-quotes"

export function SupplierQuoteUploadForm({ suppliers, departments, enabled }: {
  suppliers: SupplierQuoteSupplier[]
  departments: string[]
  enabled: boolean
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [fileName, setFileName] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  const supplier = suppliers.find((entry) => entry.id === supplierId)

  function submit(formData: FormData) {
    setError("")
    if (!supplier) {
      setError("Choose the supplier that sent this quote.")
      return
    }
    formData.set("supplierName", supplier.name)
    startTransition(async () => {
      const result = await uploadSupplierQuoteAction(formData)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push(`/admin/supplier-quotes/${result.data.quoteId}`)
    })
  }

  if (!open) {
    return <button type="button" disabled={!enabled} onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#005bb5] disabled:bg-slate-300"><Plus className="h-4 w-4" /> Add supplier quote</button>
  }

  return (
    <section className="w-full border border-slate-200 bg-white shadow-sm sm:max-w-2xl" aria-labelledby="supplier-quote-upload-title">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0071e3]">New quote</p><h2 id="supplier-quote-upload-title" className="mt-1 text-lg font-bold">Upload and extract</h2></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close upload form" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600"><X className="h-4 w-4" /></button>
      </div>
      <form ref={formRef} action={submit} className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <label className="grid gap-1.5 text-sm font-semibold text-slate-800">Supplier
          <select name="supplierId" required value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Choose supplier</option>{suppliers.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-800">Department
          <select name="department" defaultValue="Others" className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm">{departments.map((department) => <option key={department}>{department}</option>)}</select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-800">Quote number <span className="font-normal text-slate-400">Optional</span><input name="quoteNumber" className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Q-1048" /></label>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-800">Quote date <input name="quoteDate" type="date" className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm" /></label>
        <label className="sm:col-span-2">
          <span className="flex min-h-24 cursor-pointer items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm font-semibold text-slate-700 hover:border-[#0071e3] hover:bg-sky-50"><FileUp className="h-5 w-5 text-[#0071e3]" />{fileName || "Choose PDF, CSV, TXT, or image · 25 MB maximum"}</span>
          <input name="quoteFile" type="file" required accept=".pdf,.csv,.txt,.jpg,.jpeg,.png,.webp,application/pdf,text/csv,text/plain,image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
        </label>
        {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 sm:col-span-2">{error}</p> : null}
        <div className="flex justify-end sm:col-span-2"><button type="submit" disabled={pending || !fileName || !supplierId} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white disabled:opacity-40">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Extracting…</> : <>Upload and extract <FileUp className="h-4 w-4" /></>}</button></div>
      </form>
    </section>
  )
}
