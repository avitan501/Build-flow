"use client"

import { Download, FileText, Mail, MessageSquareText, Paperclip, Phone, Plus, Route, Send, Trash2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { createPortal } from "react-dom"

import { previewRequestClientQuoteAction, sendClientReplyAction, sendRequestClientQuoteAction, type RequestClientQuoteInput } from "@/app/owner/materials/requests/actions"
import type { SupplierRoutingOption } from "@/lib/shop-qualification"

type PackageRoute = { id: string; department: string; supplier_id: string | null; status: string }
type QuoteLine = { key: string; description: string; quantity: number; unit: string; unitPrice: number }

const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-sky-400 hover:bg-sky-50"

const REPLY_BLOCKS = [
  { id: "received", label: "Order received", text: "We received your order and are reviewing it now." },
  { id: "question", label: "I have a question", text: "I have a question about your request before we continue." },
  { id: "pricing", label: "Pricing is ready", text: "Your pricing is ready. Please review the attached quote." },
  { id: "missing", label: "Need more information", text: "Please reply with the missing information so we can complete your request." },
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
}: {
  requestId: string
  requestTitle: string
  client: { name: string; email: string; phone: string }
  departments: string[]
  suppliers: SupplierRoutingOption[]
  packages: PackageRoute[]
  requestItems: Array<{ id: string; name: string; quantity: number; unit: string | null }>
  projectAddress: string
}) {
  const router = useRouter()
  const [department, setDepartment] = useState("All departments")
  const [supplierIds, setSupplierIds] = useState<string[]>(() => [...new Set(packages.flatMap((pkg) => pkg.supplier_id ? [pkg.supplier_id] : []))])
  const [greeting, setGreeting] = useState<"hi" | "hello" | "morning" | "afternoon">("hi")
  const [replyBlocks, setReplyBlocks] = useState<string[]>(["received"])
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

  const firstName = client.name.trim().split(/\s+/)[0] || "there"
  const clientMessage = useMemo(() => {
    const greetingText = greeting === "hello" ? `Hello ${client.name || "there"},` : greeting === "morning" ? `Good morning ${firstName},` : greeting === "afternoon" ? `Good afternoon ${firstName},` : `Hi ${firstName},`
    const selectedText = REPLY_BLOCKS.filter((block) => replyBlocks.includes(block.id)).map((block) => block.text)
    return [greetingText, "", ...selectedText, ...(replyNote.trim() ? [replyNote.trim()] : []), "", `Request: ${requestTitle}`, "", "Thank you,", "Avantia Build"].join("\n")
  }, [client.name, firstName, greeting, replyBlocks, replyNote, requestTitle])

  function toggleSupplier(supplierId: string) {
    setSupplierIds((current) => current.includes(supplierId) ? current.filter((id) => id !== supplierId) : [...current, supplierId])
  }

  function createSupplierRequest() {
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

  function toggleReplyBlock(blockId: string) {
    setReplyBlocks((current) => current.includes(blockId) ? current.filter((id) => id !== blockId) : [...current, blockId])
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
    <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5" aria-labelledby="request-management-heading">
      <div className="flex items-center gap-2"><Route className="h-5 w-5 text-[#0066cc]" /><h2 id="request-management-heading" className="text-xl font-bold">Manage request</h2></div>
      <p className="mt-1 text-sm text-slate-600">Reply to the client or prepare one pricing request for several suppliers.</p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-bold text-slate-950">Create supplier request</h3>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Items to include<select value={department} onChange={(event) => setDepartment(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950"><option>All departments</option>{departments.map((entry) => <option key={entry}>{entry}</option>)}</select></label>
            <fieldset>
              <legend className="text-sm font-semibold text-slate-700">Suppliers</legend>
              <div className="mt-1.5 max-h-56 overflow-y-auto rounded-lg border border-slate-300 bg-white p-2">
                {suppliers.map((entry) => <label key={entry.id} className={`flex min-h-10 items-center gap-3 rounded-md px-2 text-sm ${entry.email ? "cursor-pointer hover:bg-slate-50" : "cursor-not-allowed text-slate-400"}`}><input type="checkbox" checked={supplierIds.includes(entry.id)} disabled={!entry.email} onChange={() => toggleSupplier(entry.id)} className="h-4 w-4 rounded border-slate-300 accent-[#0071e3]" /><span className="min-w-0"><span className="block truncate font-semibold">{entry.name}</span><span className="block truncate text-xs text-slate-500">{entry.email || "Email required"}</span></span></label>)}
              </div>
            </fieldset>
            <button type="button" onClick={createSupplierRequest} disabled={!supplierIds.length} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-50"><Route className="h-4 w-4" />Create request for {supplierIds.length || ""} supplier{supplierIds.length === 1 ? "" : "s"}</button>
          </div>
          {packages.length ? <div className="mt-4 border-t border-slate-200 pt-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Current routes</p><div className="mt-2 grid gap-2">{packages.map((pkg) => <div key={pkg.id} className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold">{pkg.department}</span><span className="text-right text-slate-600">{suppliers.find((entry) => entry.id === pkg.supplier_id)?.name || "Not assigned"} · {pkg.status.replaceAll("_", " ")}</span></div>)}</div></div> : null}
        </div>

        <div>
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-[#0066cc]" /><h3 className="font-bold text-slate-950">Reply to client</h3></div>
            <p className="mt-1 text-sm text-slate-500">Choose the message parts. The reply updates instantly.</p>

            <fieldset className="mt-4">
              <legend className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Greeting</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([['hi', `Hi ${firstName}`], ['hello', 'Hello'], ['morning', 'Good morning'], ['afternoon', 'Good afternoon']] as const).map(([value, label]) => <label key={value} className={`flex min-h-10 cursor-pointer items-center justify-center rounded-lg border px-2 text-center text-xs font-semibold ${greeting === value ? "border-sky-400 bg-sky-50 text-[#0066cc]" : "border-slate-200 bg-white text-slate-600"}`}><input type="radio" name={`greeting-${requestId}`} value={value} checked={greeting === value} onChange={() => setGreeting(value)} className="sr-only" />{label}</label>)}
              </div>
            </fieldset>

            <fieldset className="mt-4">
              <legend className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">What to say</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {REPLY_BLOCKS.map((block) => <label key={block.id} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${replyBlocks.includes(block.id) ? "border-sky-300 bg-sky-50 text-slate-950" : "border-slate-200 bg-white text-slate-600"}`}><input type="checkbox" checked={replyBlocks.includes(block.id)} onChange={() => toggleReplyBlock(block.id)} className="h-4 w-4 rounded border-slate-300 accent-[#0071e3]" />{block.label}</label>)}
              </div>
            </fieldset>

            <label className="mt-4 grid gap-1.5 text-sm font-semibold text-slate-700">Additional note <span className="font-normal text-slate-400">(optional)</span><textarea value={replyNote} onChange={(event) => setReplyNote(event.target.value)} rows={2} placeholder="Add a short custom note" className="resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <div className="mt-4 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700" aria-label="Reply preview">{clientMessage}</div>

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
      </div>
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
    </section>
  )
}
