"use client"

import { FileUp, LoaderCircle, Plus, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"

import { uploadSupplierQuoteAction } from "@/app/admin/supplier-quotes/actions"
import { extractImageTextInBrowser } from "@/lib/browser-document-extraction"
import type { SupplierQuoteClient, SupplierQuoteRequestOption, SupplierQuoteSupplier } from "@/lib/supplier-quotes"

export function SupplierQuoteUploadForm({ clients, requests, suppliers, departments, enabled, aiEnabled, initialRequestId = "", initialDepartment = "Others", initiallyOpen = false }: {
  clients: SupplierQuoteClient[]
  requests: SupplierQuoteRequestOption[]
  suppliers: SupplierQuoteSupplier[]
  departments: string[]
  enabled: boolean
  aiEnabled: boolean
  initialRequestId?: string
  initialDepartment?: string
  initiallyOpen?: boolean
}) {
  const initialRequest = requests.find((request) => request.id === initialRequestId)
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(Boolean(initialRequest) || initiallyOpen)
  const [fileName, setFileName] = useState("")
  const [linkMode, setLinkMode] = useState<"unlinked" | "request">(initialRequest ? "request" : "unlinked")
  const [clientSelection, setClientSelection] = useState(initialRequest?.clientId ?? "")
  const [requestId, setRequestId] = useState(initialRequest?.id ?? "")
  const [supplierId, setSupplierId] = useState("auto")
  const [error, setError] = useState("")
  const [extractionStatus, setExtractionStatus] = useState("")
  const [pending, startTransition] = useTransition()
  const supplier = suppliers.find((entry) => entry.id === supplierId)
  const clientRequests = requests.filter((request) => request.clientId === clientSelection)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        window.setTimeout(() => document.getElementById("open-supplier-quote-upload")?.focus(), 0)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  function closeModal() {
    setOpen(false)
    window.setTimeout(() => document.getElementById("open-supplier-quote-upload")?.focus(), 0)
  }

  function submit(formData: FormData) {
    setError("")
    if (linkMode === "request" && (!clientSelection || !requestId)) {
      setError("Choose the client and one of their requests before uploading.")
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
    return <button id="open-supplier-quote-upload" type="button" disabled={!enabled} onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#005bb5] disabled:bg-slate-300"><Plus className="h-4 w-4" /> Add supplier quote</button>
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-hidden px-3 py-4 sm:px-6 sm:py-8" data-testid="supplier-quote-intake-modal">
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]" aria-hidden="true" onMouseDown={closeModal} />
      <div className="relative flex h-full min-h-0 items-center justify-center">
        <section id="supplier-quote-upload" role="dialog" aria-modal="true" aria-labelledby="supplier-quote-upload-title" aria-describedby="supplier-quote-upload-description" className="flex max-h-full w-full max-w-[920px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_28px_90px_rgba(15,23,42,.32)]">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-7 sm:py-5">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-[#0071e3]"><FileUp className="h-5 w-5" /></span>
              <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0071e3]">AI supplier intake</p><h2 id="supplier-quote-upload-title" className="mt-1 text-lg font-bold tracking-tight text-slate-950 sm:text-xl">Upload once. Review before saving.</h2><p id="supplier-quote-upload-description" className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">Connect the quote, add its source details, then let AI prepare the material rows for review.</p></div>
            </div>
            <button ref={closeButtonRef} type="button" onClick={closeModal} aria-label="Close upload form" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"><X className="h-4 w-4" /></button>
          </div>
          <form ref={formRef} action={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6">
              <div className="grid min-w-0 gap-x-5 gap-y-4 sm:grid-cols-2">
                <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-slate-800 sm:col-span-2">Quote connection
                  <select name="linkMode" value={linkMode} onChange={(event) => { setLinkMode(event.target.value as "unlinked" | "request"); setClientSelection(""); setRequestId(""); setError("") }} className="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="unlinked">Don&apos;t link it to anyone</option><option value="request">Attach to a client request</option></select>
                </label>
                {linkMode === "request" ? <div className="grid min-w-0 gap-4 rounded-xl border border-sky-100 bg-sky-50/60 p-4 sm:col-span-2 sm:grid-cols-2">
                  <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-slate-800">Client<select name="clientSelection" required value={clientSelection} onChange={(event) => { setClientSelection(event.target.value); setRequestId(""); setError("") }} className="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Choose client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}{client.email ? ` - ${client.email}` : ""}</option>)}</select></label>
                  <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-slate-800">Client request<select name="requestId" required value={requestId} disabled={!clientSelection} onChange={(event) => { setRequestId(event.target.value); setError("") }} className="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm disabled:bg-slate-100"><option value="">{clientSelection ? "Choose request / case" : "Choose client first"}</option>{clientRequests.map((request) => <option key={request.id} value={request.id}>{request.caseNumber} · {request.title}{request.projectName ? ` · ${request.projectName}` : ""}</option>)}</select></label>
                  {clientSelection && !clientRequests.length ? <p className="text-xs font-semibold text-amber-800 sm:col-span-2">This client has no requests yet. Choose “Don&apos;t link it to anyone” or create a client request first.</p> : null}
                </div> : null}
                <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-slate-800">Supplier
                  <select name="supplierId" required value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="auto">Detect from invoice</option>{suppliers.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select>
                </label>
                <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-slate-800">Department
                  <select name="department" defaultValue={initialDepartment} className="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm">{departments.map((department) => <option key={department}>{department}</option>)}</select>
                </label>
                <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-slate-800">Quote number <span className="font-normal text-slate-400">Optional</span><input name="quoteNumber" className="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Q-1048" /></label>
                <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-slate-800">Quote date <input name="quoteDate" type="date" className="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 px-3 text-sm" /></label>
                <label className="min-w-0 sm:col-span-2">
                  <span className="flex min-h-28 w-full min-w-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center text-sm font-semibold text-slate-700 transition hover:border-[#0071e3] hover:bg-sky-50 sm:flex-row sm:gap-3"><FileUp className="h-5 w-5 shrink-0 text-[#0071e3]" /><span className="min-w-0 break-words">{fileName || "Choose PDF, CSV, TXT, or image · 25 MB maximum"}</span></span>
                  <input name="quoteFile" type="file" required accept=".pdf,.csv,.txt,.jpg,.jpeg,.png,.webp,application/pdf,text/csv,text/plain,image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
                </label>
                {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 sm:col-span-2">{error}</p> : null}
                <div className="grid min-w-0 gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 sm:col-span-2 sm:grid-cols-3 sm:p-4" aria-label="Safe supplier quote import steps">
                  <p className="text-xs font-semibold leading-5 text-emerald-950"><span className="mr-1.5 text-emerald-700">1</span>Original PDF stays private</p>
                  <p className="text-xs font-semibold leading-5 text-emerald-950"><span className="mr-1.5 text-emerald-700">2</span>AI fills vendor, date, and prices</p>
                  <p className="text-xs font-semibold leading-5 text-emerald-950"><span className="mr-1.5 text-emerald-700">3</span>You approve before catalog changes</p>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-slate-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div className="min-w-0">{extractionStatus ? <p role="status" className="text-xs font-semibold text-[#0071e3]">{extractionStatus}</p> : <p className="text-xs text-slate-500">Nothing changes in the catalog until you review the extracted quote.</p>}</div>
              <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
                <button type="button" onClick={closeModal} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={pending || !fileName || (linkMode === "request" && (!clientSelection || !requestId))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Reading document…</> : <>Upload and extract <FileUp className="h-4 w-4" /></>}</button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
