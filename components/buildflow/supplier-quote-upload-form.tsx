"use client"

import { FileUp, LoaderCircle, Plus, UserPlus, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"

import { uploadSupplierQuoteAction } from "@/app/admin/supplier-quotes/actions"
import { extractImageTextInBrowser } from "@/lib/browser-document-extraction"
import type { SupplierQuoteClient, SupplierQuoteSupplier } from "@/lib/supplier-quotes"

export function SupplierQuoteUploadForm({ clients, suppliers, departments, enabled, aiEnabled }: {
  clients: SupplierQuoteClient[]
  suppliers: SupplierQuoteSupplier[]
  departments: string[]
  enabled: boolean
  aiEnabled: boolean
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [fileName, setFileName] = useState("")
  const [clientSelection, setClientSelection] = useState(clients.length ? "" : "new")
  const [supplierId, setSupplierId] = useState("auto")
  const [error, setError] = useState("")
  const [extractionStatus, setExtractionStatus] = useState("")
  const [pending, startTransition] = useTransition()
  const supplier = suppliers.find((entry) => entry.id === supplierId)
  const addingClient = clientSelection === "new"

  function submit(formData: FormData) {
    setError("")
    if (!clientSelection) {
      setError("Choose a client or add a new one before uploading.")
      return
    }
    if (supplierId !== "auto" && !supplier) { setError("Choose a valid supplier."); return }
    formData.set("supplierName", supplier?.name ?? "")
    startTransition(async () => {
      const file = formData.get("quoteFile")
      if (!aiEnabled && file instanceof File && file.type.startsWith("image/")) {
        setExtractionStatus("Reading the supplier and material lines on this device...")
        try {
          const text = await extractImageTextInBrowser(file, setExtractionStatus)
          if (text.length < 30) throw new Error("No readable invoice text was found.")
          formData.set("browserOcrText", text)
        } catch (ocrError) {
          setExtractionStatus("")
          setError(ocrError instanceof Error ? ocrError.message : "This image could not be read. Try a clearer photo or PDF.")
          return
        }
      }
      setExtractionStatus("Saving the original and preparing extracted items...")
      const result = await uploadSupplierQuoteAction(formData)
      if (!result.ok) {
        setExtractionStatus("")
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
        <label className="grid gap-1.5 text-sm font-semibold text-slate-800 sm:col-span-2">Client
          <select name="clientSelection" required value={clientSelection} onChange={(event) => { setClientSelection(event.target.value); setError("") }} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Choose client</option><option value="new">+ Add new client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}{client.email ? ` - ${client.email}` : ""}</option>)}</select>
        </label>
        {addingClient ? <div className="grid gap-4 border border-sky-100 bg-sky-50/60 p-4 sm:col-span-2 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-950 sm:col-span-2"><UserPlus className="h-4 w-4 text-[#0071e3]" />Add new client</div>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-800">Full name<input name="clientFullName" required className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" autoComplete="name" /></label>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-800">Email<input name="clientEmail" type="email" required className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" autoComplete="email" /></label>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-800">Phone <span className="font-normal text-slate-400">Optional</span><input name="clientPhone" type="tel" className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" autoComplete="tel" /></label>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-800">Company <span className="font-normal text-slate-400">Optional</span><input name="clientCompanyName" className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" autoComplete="organization" /></label>
        </div> : null}
        <label className="grid gap-1.5 text-sm font-semibold text-slate-800">Supplier
          <select name="supplierId" required value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="auto">Detect from invoice</option>{suppliers.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select>
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
        <p className="text-xs font-medium text-slate-500 sm:col-span-2">Supplier, quote details, and material rows are read from the document. Review the results before routing.</p>
        {extractionStatus ? <p role="status" className="text-xs font-semibold text-[#0071e3] sm:col-span-2">{extractionStatus}</p> : null}
        <div className="flex justify-end sm:col-span-2"><button type="submit" disabled={pending || !fileName || !clientSelection} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white disabled:opacity-40">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Reading document…</> : <>Upload and extract <FileUp className="h-4 w-4" /></>}</button></div>
      </form>
    </section>
  )
}
