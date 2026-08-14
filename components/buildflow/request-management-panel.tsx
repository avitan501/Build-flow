"use client"

import { Mail, MessageSquareText, Paperclip, Phone, Route, Send } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"

import { sendClientReplyAction } from "@/app/owner/materials/requests/actions"
import type { SupplierRoutingOption } from "@/lib/shop-qualification"

type PackageRoute = { id: string; department: string; supplier_id: string | null; status: string }

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
}: {
  requestId: string
  requestTitle: string
  client: { name: string; email: string; phone: string }
  departments: string[]
  suppliers: SupplierRoutingOption[]
  packages: PackageRoute[]
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
          </div>

        </div>
      </div>
      {feedback ? <p className={`mt-4 rounded-lg border px-4 py-3 text-sm font-semibold ${feedbackError ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`} role="status">{feedback}</p> : null}
    </section>
  )
}
