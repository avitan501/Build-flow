"use client"

import { BadgeDollarSign, ChevronDown, Download, ExternalLink, FileText, Mail, MessageSquareText, Paperclip, Phone, Plus, Route, Send, Trash2, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { createPortal } from "react-dom"

import { previewRequestClientQuoteAction, sendClientReplyAction, sendRequestClientQuoteAction, type RequestClientQuoteInput } from "@/app/owner/materials/requests/actions"
import { supplierCanReceiveDepartmentRequest } from "@/lib/material-catalog"
import type { SupplierRoutingOption } from "@/lib/shop-qualification"
import type { ManagerPipelineStage } from "@/lib/manager-dashboard"

type PackageRoute = { id: string; department: string; supplier_id: string | null; status: string }
type QuoteLine = { key: string; description: string; quantity: number; unit: string; unitPrice: number }
export type RequestComparisonSummary = { id: string; title: string; status: string; quoteNumber: string; updatedAt: string; bids: Array<{ id: string; supplierName: string; landedTotal: number; pricedItemCount: number; itemCount: number; recommended: boolean }> }

const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-sky-400 hover:bg-sky-50"

const REPLY_BLOCKS = [
  { id: "received", label: "Order received", text: "We received your order and are reviewing it now." },
  { id: "question", label: "I have a question", text: "I have a question about your request before we continue." },
  { id: "pricing", label: "Pricing is ready", text: "Your pricing is ready. Please review the attached quote." },
  { id: "missing", label: "Ask for missing details", text: "Please reply with the missing information so we can complete your request." },
] as const

export function RequestManagementPanel({
  requestId,
  requestTitle,
  client,
  departments,
  suppliers,
  packages,
  requestItems,
  projectAddress,
  currentStage,
  comparisons,
}: {
  requestId: string
  requestTitle: string
  client: { name: string; email: string; phone: string }
  departments: string[]
  suppliers: SupplierRoutingOption[]
  packages: PackageRoute[]
  requestItems: Array<{ id: string; name: string; quantity: number; unit: string | null; reviewReasons: string[] }>
  projectAddress: string
  currentStage: ManagerPipelineStage
  comparisons: RequestComparisonSummary[]
}) {
  const router = useRouter()
  const [department, setDepartment] = useState(() => departments.length === 1 ? departments[0] : "")
  const [supplierIds, setSupplierIds] = useState<string[]>([])
  const [greeting, setGreeting] = useState<"hi" | "hello" | "morning" | "afternoon">("hi")
  const [replyBlock, setReplyBlock] = useState<string>(() => requestItems.some((item) => item.reviewReasons.length) ? "missing" : "received")
  const [replyNote, setReplyNote] = useState("")
  const [attachment, setAttachment] = useState<File | null>(null)
  const [deliveryMethod, setDeliveryMethod] = useState<"email" | "text">(client.email ? "email" : "text")
  const [feedback, setFeedback] = useState("")
  const [feedbackError, setFeedbackError] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteNumber, setQuoteNumber] = useState(() => `AVA-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${requestId.slice(0, 4).toUpperCase()}`)
  const [issueDate] = useState(() => new Date().toLocaleDateString("en-US"))
  const [expiresOn, setExpiresOn] = useState(() => new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-US"))
  const [clientAddress, setClientAddress] = useState("")
  const [shipTo, setShipTo] = useState(projectAddress)
  const [quoteLines, setQuoteLines] = useState<QuoteLine[]>(() => requestItems.length ? requestItems.map((item) => ({ key: item.id, description: item.name, quantity: Number(item.quantity) || 1, unit: item.unit || "each", unitPrice: 0 })) : [{ key: crypto.randomUUID(), description: "", quantity: 1, unit: "each", unitPrice: 0 }])
  const [deliveryCharge, setDeliveryCharge] = useState(0)
  const [salesTaxRate, setSalesTaxRate] = useState(8.875)
  const [quoteTerms, setQuoteTerms] = useState("Prices may change until the order is approved and processed. This estimate expires after 30 days. All sales are final unless stated otherwise. Delivery, taxes, and freight are included only when shown above.")
  const [quoteMessage, setQuoteMessage] = useState("Please review the attached Avantia Build estimate. Reply with any questions or approval.")
  const [includeAch, setIncludeAch] = useState(false)
  const [ach, setAch] = useState({ bankName: "", accountOwner: "", routingNumber: "", accountNumber: "" })
  const [quoteFeedback, setQuoteFeedback] = useState("")
  const [pending, startTransition] = useTransition()
  const eligibleSuppliers = useMemo(
    () => department ? suppliers.filter((supplier) => supplierCanReceiveDepartmentRequest(supplier, department)) : [],
    [department, suppliers],
  )

  const firstName = client.name.trim().split(/\s+/)[0] || "there"
  const missingQuestions = useMemo(() => requestItems.flatMap((item) => item.reviewReasons.map((reason) => `${item.name}: ${reason}`)), [requestItems])
  const clientMessage = useMemo(() => {
    const greetingText = greeting === "hello" ? `Hello ${client.name || "there"},` : greeting === "morning" ? `Good morning ${firstName},` : greeting === "afternoon" ? `Good afternoon ${firstName},` : `Hi ${firstName},`
    const selectedText = REPLY_BLOCKS.filter((block) => block.id === replyBlock).flatMap((block) => block.id === "missing" && missingQuestions.length
      ? ["To finish pricing, please confirm:", ...missingQuestions.map((question) => `- ${question}`)]
      : [block.text])
    return [greetingText, "", ...selectedText, ...(replyNote.trim() ? [replyNote.trim()] : []), "", `Request: ${requestTitle}`, "", "Thank you,", "Avantia Build"].join("\n")
  }, [client.name, firstName, greeting, missingQuestions, replyBlock, replyNote, requestTitle])

  function toggleSupplier(supplierId: string) {
    setSupplierIds((current) => current.includes(supplierId) ? current.filter((id) => id !== supplierId) : [...current, supplierId])
  }

  function createSupplierRequest() {
    if (!department || !supplierIds.length) return
    const query = new URLSearchParams({ department })
    supplierIds.forEach((supplierId) => query.append("supplier", supplierId))
    router.push(`/owner/materials/requests/${requestId}/supplier-request?${query.toString()}`)
  }

  function sendClientEmail() {
    startTransition(async () => {
      setFeedback("")
      const formData = new FormData()
      formData.set("requestId", requestId)
      formData.set("message", clientMessage)
      if (attachment) formData.set("attachment", attachment)
      const result = await sendClientReplyAction(formData)
      setFeedbackError(!result.ok)
      setFeedback(result.ok ? `Email sent directly to ${client.email}.` : result.error)
    })
  }

  function openClientText() {
    const phone = client.phone.replace(/\D/g, "")
    if (!phone) return
    const separator = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "&" : "?"
    window.location.href = `sms:${phone}${separator}body=${encodeURIComponent(clientMessage)}`
    setFeedbackError(false)
    setFeedback("The text message is ready in your messaging app. Review it and tap Send.")
  }

  const quoteSubtotal = quoteLines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0), 0)
  const quoteTax = (quoteSubtotal + deliveryCharge) * salesTaxRate / 100
  const quoteTotal = quoteSubtotal + deliveryCharge + quoteTax

  function quoteInput(): RequestClientQuoteInput {
    return {
      requestId,
      quoteNumber,
      issueDate,
      expiresOn,
      clientAddress,
      shipTo,
      message: quoteMessage,
      lines: quoteLines.map(({ description, quantity, unit, unitPrice }) => ({ description, quantity, unit, unitPrice })),
      deliveryCharge,
      salesTaxRate,
      terms: quoteTerms,
      ach: includeAch ? ach : undefined,
    }
  }

  function updateQuoteLine(key: string, patch: Partial<QuoteLine>) {
    setQuoteLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line))
  }

  function downloadQuote() {
    setQuoteFeedback("")
    startTransition(async () => {
      const result = await previewRequestClientQuoteAction(quoteInput())
      if (!result.ok || !result.pdfBase64 || !result.fileName) return setQuoteFeedback(result.ok ? "The PDF could not be prepared." : result.error)
      const bytes = Uint8Array.from(atob(result.pdfBase64), (character) => character.charCodeAt(0))
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }))
      const link = document.createElement("a")
      link.href = url
      link.download = result.fileName
      link.click()
      URL.revokeObjectURL(url)
      setQuoteFeedback("Estimate PDF downloaded for review.")
    })
  }

  function sendQuote() {
    setQuoteFeedback("")
    startTransition(async () => {
      const result = await sendRequestClientQuoteAction(quoteInput())
      setQuoteFeedback(result.ok ? `Estimate emailed to ${client.email}.` : result.error)
      if (result.ok) setFeedback(`Estimate ${quoteNumber} emailed to ${client.email}.`)
    })
  }

  return (
    <div className="grid gap-2">
      <details open={currentStage === "pricing"} className="group overflow-hidden rounded-lg border border-slate-200 bg-white">
        <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-sky-200 bg-sky-50 text-sky-700"><BadgeDollarSign className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-[.12em] text-sky-700">Step 3</span><span className="block font-bold">Get supplier pricing</span><span className="block truncate text-xs font-medium text-slate-500">{comparisons.some((comparison) => comparison.bids.length) ? `${comparisons.reduce((total, comparison) => total + comparison.bids.length, 0)} supplier quote${comparisons.reduce((total, comparison) => total + comparison.bids.length, 0) === 1 ? "" : "s"} received` : packages.length ? `${packages.length} supplier request${packages.length === 1 ? "" : "s"} sent` : "No supplier prices received yet"}</span></span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
        </summary>
        <div className="border-t border-slate-200 p-4">
          {comparisons.length ? <div className="mb-3 grid gap-2">{comparisons.map((comparison) => <article key={comparison.id} className="rounded-md border border-slate-200 bg-slate-50 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-bold">{comparison.title}</h3><p className="mt-0.5 text-xs text-slate-500">{comparison.bids.length ? `${comparison.bids.length} supplier response${comparison.bids.length === 1 ? "" : "s"}` : "Waiting for supplier response"}</p></div><Link href={`/admin/quote-comparison/${comparison.id}`} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-[#0066cc]">Compare <ExternalLink className="h-3.5 w-3.5" /></Link></div>{comparison.bids.length ? <div className="mt-2 divide-y divide-slate-200 border-t border-slate-200">{comparison.bids.map((bid) => <div key={bid.id} className="flex items-center justify-between gap-3 py-2 text-xs"><span className="min-w-0 truncate font-semibold">{bid.supplierName}{bid.recommended ? " · Best match" : ""}</span><span className="shrink-0 text-right"><strong className="block text-sm tabular-nums">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(bid.landedTotal)}</strong><span className="text-slate-500">{bid.pricedItemCount}/{bid.itemCount} items</span></span></div>)}</div> : null}</article>)}</div> : <p className="mb-3 rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900">Supplier answers and prices will appear here after a quote is linked to this request.</p>}

          <details className="group/route rounded-md border border-slate-200 bg-slate-50">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-bold"><span className="inline-flex items-center gap-2"><Route className="h-4 w-4 text-sky-700" />Send to another supplier</span><ChevronDown className="h-4 w-4 text-slate-400 transition group-open/route:rotate-180" /></summary>
            <div className="border-t border-slate-200 p-3">
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Department<select value={department} onChange={(event) => { setDepartment(event.target.value); setSupplierIds([]) }} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950"><option value="">Choose department</option>{departments.map((entry) => <option key={entry}>{entry}</option>)}</select></label>
            <fieldset>
              <legend className="text-sm font-semibold text-slate-700">Suppliers</legend>
              <div className="mt-1.5 max-h-56 overflow-y-auto rounded-lg border border-slate-300 bg-white p-2">
                {!department ? <p className="px-2 py-4 text-center text-sm text-slate-500">Choose a department first.</p> : eligibleSuppliers.length ? eligibleSuppliers.map((entry) => <label key={entry.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-sm hover:bg-slate-50"><input type="checkbox" checked={supplierIds.includes(entry.id)} onChange={() => toggleSupplier(entry.id)} className="h-4 w-4 rounded border-slate-300 accent-[#0071e3]" /><span className="min-w-0"><span className="block truncate font-semibold">{entry.name}</span><span className="block truncate text-xs text-slate-500">{entry.email} · {(entry.trustLevel || "not-reviewed").replaceAll("-", " ")}</span></span></label>) : <p className="px-2 py-4 text-center text-sm leading-5 text-slate-500">No eligible suppliers are assigned to {department}. Add the category and set the trust level to First-time trial or higher in Supplier Directory.</p>}
              </div>
            </fieldset>
            <button type="button" onClick={createSupplierRequest} disabled={!department || !supplierIds.length} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-50"><Route className="h-4 w-4" />Create request for {supplierIds.length || ""} supplier{supplierIds.length === 1 ? "" : "s"}</button>
          </div>
          {packages.length ? <div className="mt-4 border-t border-slate-200 pt-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Current routes</p><div className="mt-2 grid gap-2">{packages.map((pkg) => <div key={pkg.id} className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold">{pkg.department}</span><span className="text-right text-slate-600">{suppliers.find((entry) => entry.id === pkg.supplier_id)?.name || "Not assigned"} · {pkg.status.replaceAll("_", " ")}</span></div>)}</div></div> : null}
            </div>
          </details>
        </div>
      </details>

      <details open={currentStage === "approval"} className="group overflow-hidden rounded-lg border border-slate-200 bg-white">
        <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3"><span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-violet-200 bg-violet-50 text-violet-700"><MessageSquareText className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-[.12em] text-violet-700">Step 4</span><span className="block font-bold">Reply to client</span><span className="block truncate text-xs font-medium text-slate-500">Questions, pricing, estimate, or approval</span></span><ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" /></summary>
        <div className="border-t border-slate-200 p-4">
          <div>
            {missingQuestions.length ? <p className="mt-1 text-xs font-semibold text-amber-700">{missingQuestions.length} missing details can be added to the reply automatically.</p> : null}

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-bold text-slate-600">Greeting<select value={greeting} onChange={(event) => setGreeting(event.target.value as typeof greeting)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950"><option value="hi">Hi {firstName}</option><option value="hello">Hello</option><option value="morning">Good morning</option><option value="afternoon">Good afternoon</option></select></label>
              <label className="grid gap-1 text-xs font-bold text-slate-600">Follow-up<select value={replyBlock} onChange={(event) => setReplyBlock(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950">{REPLY_BLOCKS.map((block) => <option key={block.id} value={block.id}>{block.label}</option>)}</select></label>
            </div>

            <label className="mt-3 grid gap-1 text-xs font-bold text-slate-600">Add a note <span className="font-normal text-slate-400">(optional)</span><textarea value={replyNote} onChange={(event) => setReplyNote(event.target.value)} rows={2} placeholder="Write a short note" className="resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50"><summary className="cursor-pointer px-3 py-2 text-xs font-bold text-[#0066cc]">Preview message</summary><div className="whitespace-pre-wrap border-t border-slate-200 px-3 py-3 text-sm leading-6 text-slate-700" aria-label="Reply preview">{clientMessage}</div></details>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
              <button type="button" onClick={() => setDeliveryMethod("email")} disabled={!client.email} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold ${deliveryMethod === "email" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"} disabled:opacity-40`}><Mail className="h-4 w-4" />Email</button>
              <button type="button" onClick={() => setDeliveryMethod("text")} disabled={!client.phone} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold ${deliveryMethod === "text" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"} disabled:opacity-40`}><MessageSquareText className="h-4 w-4" />Text</button>
            </div>

            {deliveryMethod === "email" ? <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 text-sm font-semibold text-slate-700"><Paperclip className="h-4 w-4" /><span className="min-w-0 flex-1 truncate">{attachment?.name || "Attach quote or order (optional)"}</span><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx" onChange={(event) => setAttachment(event.target.files?.[0] || null)} className="sr-only" /></label> : attachment ? <p className="mt-3 text-xs font-medium text-amber-700">Attachments can only be sent by email.</p> : null}

            <div className="mt-3 flex flex-wrap gap-2">
              {deliveryMethod === "email" ? <button type="button" onClick={sendClientEmail} disabled={pending || !client.email} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4" />{pending ? "Sending..." : "Send email reply"}</button> : <button type="button" onClick={openClientText} disabled={!client.phone} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-50"><MessageSquareText className="h-4 w-4" />Open text message</button>}
              {client.phone ? <a href={`tel:${client.phone}`} className={actionClass}><Phone className="h-4 w-4" />Call</a> : null}
            </div>
            <button type="button" onClick={() => setQuoteOpen(true)} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#0071e3] bg-sky-50 px-4 text-sm font-bold text-[#0066cc]"><FileText className="h-4 w-4" />Create and send estimate</button>
          </div>

        </div>
      </details>
      {feedback ? <p className={`mt-4 rounded-lg border px-4 py-3 text-sm font-semibold ${feedbackError ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`} role="status">{feedback}</p> : null}

      {quoteOpen && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[150] grid place-items-center overflow-y-auto bg-slate-950/55 p-2 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="request-quote-title" onMouseDown={(event) => { if (event.currentTarget === event.target && !pending) setQuoteOpen(false) }}>
        <section className="flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
          <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#0066cc]">Avantia Build estimate</p><h2 id="request-quote-title" className="mt-0.5 text-xl font-bold">Create client quote</h2><p className="mt-0.5 text-xs text-slate-500">Review the PDF, then email it as an attachment.</p></div><button type="button" onClick={() => setQuoteOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200" aria-label="Close"><X className="h-4 w-4" /></button></header>
          <div className="overflow-y-auto p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="grid gap-1 text-xs font-bold">Estimate code<input value={quoteNumber} onChange={(event) => setQuoteNumber(event.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
              <label className="grid gap-1 text-xs font-bold">Date<input value={issueDate} disabled className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal" /></label>
              <label className="grid gap-1 text-xs font-bold">Valid through<input value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
              <label className="grid gap-1 text-xs font-bold">Client<input value={client.name} disabled className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal" /></label>
              <label className="grid gap-1 text-xs font-bold sm:col-span-2">Customer address<textarea value={clientAddress} onChange={(event) => setClientAddress(event.target.value)} rows={2} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
              <label className="grid gap-1 text-xs font-bold sm:col-span-2">Ship to<textarea value={shipTo} onChange={(event) => setShipTo(event.target.value)} rows={2} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[48rem] text-left text-xs"><thead className="bg-slate-950 text-white"><tr><th className="px-3 py-2">Item</th><th className="px-3 py-2">Description</th><th className="px-3 py-2">Quantity</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2">Unit price</th><th className="px-3 py-2 text-right">Total</th><th className="w-10" /></tr></thead><tbody>{quoteLines.map((line, index) => <tr key={line.key} className="border-b border-slate-200 last:border-b-0"><td className="px-3 py-2 font-bold">{index + 1}</td><td className="p-1.5"><input value={line.description} onChange={(event) => updateQuoteLine(line.key, { description: event.target.value })} className="h-9 w-full min-w-56 rounded-md border border-slate-300 px-2" /></td><td className="p-1.5"><input type="number" min="0.01" step="0.01" value={line.quantity} onChange={(event) => updateQuoteLine(line.key, { quantity: Number(event.target.value) })} className="h-9 w-24 rounded-md border border-slate-300 px-2" /></td><td className="p-1.5"><input value={line.unit} onChange={(event) => updateQuoteLine(line.key, { unit: event.target.value })} className="h-9 w-24 rounded-md border border-slate-300 px-2" /></td><td className="p-1.5"><input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateQuoteLine(line.key, { unitPrice: Number(event.target.value) })} className="h-9 w-28 rounded-md border border-slate-300 px-2" /></td><td className="px-3 py-2 text-right font-bold tabular-nums">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(line.quantity * line.unitPrice)}</td><td><button type="button" onClick={() => setQuoteLines((current) => current.filter((item) => item.key !== line.key))} className="inline-flex h-8 w-8 items-center justify-center text-slate-400 hover:text-rose-700" aria-label={`Remove item ${index + 1}`}><Trash2 className="h-3.5 w-3.5" /></button></td></tr>)}</tbody></table>
            </div>
            <button type="button" onClick={() => setQuoteLines((current) => [...current, { key: crypto.randomUUID(), description: "", quantity: 1, unit: "each", unitPrice: 0 }])} className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-bold"><Plus className="h-3.5 w-3.5" />Add item</button>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_20rem]">
              <div className="grid gap-3">
                <label className="grid gap-1 text-xs font-bold">Terms & conditions<textarea value={quoteTerms} onChange={(event) => setQuoteTerms(event.target.value)} rows={3} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
                <label className="grid gap-1 text-xs font-bold">Email message<textarea value={quoteMessage} onChange={(event) => setQuoteMessage(event.target.value)} rows={2} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
                <label className="inline-flex min-h-10 items-center gap-2 text-sm font-bold"><input type="checkbox" checked={includeAch} onChange={(event) => setIncludeAch(event.target.checked)} className="h-4 w-4 accent-[#0071e3]" />Include ACH payment information in this PDF</label>
                {includeAch ? <div className="grid gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:grid-cols-2"><label className="grid gap-1 text-xs font-bold">Bank name<input value={ach.bankName} onChange={(event) => setAch({ ...ach, bankName: event.target.value })} className="h-9 rounded-md border border-slate-300 bg-white px-2 font-normal" /></label><label className="grid gap-1 text-xs font-bold">Account owner<input value={ach.accountOwner} onChange={(event) => setAch({ ...ach, accountOwner: event.target.value })} className="h-9 rounded-md border border-slate-300 bg-white px-2 font-normal" /></label><label className="grid gap-1 text-xs font-bold">Routing number<input type="password" inputMode="numeric" value={ach.routingNumber} onChange={(event) => setAch({ ...ach, routingNumber: event.target.value })} className="h-9 rounded-md border border-slate-300 bg-white px-2 font-normal" /></label><label className="grid gap-1 text-xs font-bold">Account number<input type="password" value={ach.accountNumber} onChange={(event) => setAch({ ...ach, accountNumber: event.target.value })} className="h-9 rounded-md border border-slate-300 bg-white px-2 font-normal" /></label><p className="sm:col-span-2 text-[10px] font-semibold text-amber-800">These values are used only to create this PDF and are not saved in the customer request.</p></div> : null}
              </div>
              <aside className="rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="flex justify-between text-sm"><span>Subtotal</span><strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(quoteSubtotal)}</strong></div><label className="mt-3 flex items-center justify-between gap-3 text-sm"><span>Delivery</span><input type="number" min="0" step="0.01" value={deliveryCharge} onChange={(event) => setDeliveryCharge(Number(event.target.value))} className="h-9 w-28 rounded-md border border-slate-300 bg-white px-2 text-right" /></label><label className="mt-2 flex items-center justify-between gap-3 text-sm"><span>Sales tax %</span><input type="number" min="0" max="20" step="0.001" value={salesTaxRate} onChange={(event) => setSalesTaxRate(Number(event.target.value))} className="h-9 w-28 rounded-md border border-slate-300 bg-white px-2 text-right" /></label><div className="mt-3 flex justify-between border-t border-slate-300 pt-3 text-lg"><strong>Total</strong><strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(quoteTotal)}</strong></div></aside>
            </div>
            {quoteFeedback ? <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold" role="status">{quoteFeedback}</p> : null}
          </div>
          <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3"><button type="button" onClick={downloadQuote} disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold disabled:opacity-40"><Download className="h-4 w-4" />Download PDF</button><button type="button" onClick={sendQuote} disabled={pending || !client.email || !quoteLines.length} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-bold text-white disabled:opacity-40"><Send className="h-4 w-4" />{pending ? "Working..." : "Send estimate"}</button></footer>
        </section>
      </div>, document.body) : null}
    </div>
  )
}
