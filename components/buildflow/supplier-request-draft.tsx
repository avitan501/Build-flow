"use client"

import { ArrowLeft, CheckCircle2, Mail, MessageCircle, Send, Smartphone, XCircle } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"

import { sendAuraMessageAction } from "@/app/owner/aura/actions"

type DeliveryChannel = "email" | "sms" | "whatsapp"
type DraftSupplier = {
  id: string
  name: string
  email: string
  phone: string
  whatsapp: string
  preferredDeliveryMethod: string
  items: Array<{ id: string; label: string }>
}

type DeliveryResult = {
  supplierId: string
  supplierName: string
  requestId: string | null
  channel: DeliveryChannel
  ok: boolean
  error: string | null
}

function availableChannels(supplier: DraftSupplier): DeliveryChannel[] {
  return [
    ...(supplier.email ? ["email" as const] : []),
    ...(supplier.phone ? ["sms" as const] : []),
    ...(supplier.whatsapp || supplier.phone ? ["whatsapp" as const] : []),
  ]
}

function initialChannels(supplier: DraftSupplier): DeliveryChannel[] {
  const available = availableChannels(supplier)
  const preferred = supplier.preferredDeliveryMethod === "sms" || supplier.preferredDeliveryMethod === "whatsapp" || supplier.preferredDeliveryMethod === "email"
    ? supplier.preferredDeliveryMethod
    : null
  return preferred && available.includes(preferred) ? [preferred] : available.slice(0, 1)
}

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
  const [channelsBySupplier, setChannelsBySupplier] = useState<Record<string, DeliveryChannel[]>>(() => Object.fromEntries(suppliers.map((supplier) => [supplier.id, initialChannels(supplier)])))
  const [itemIdsBySupplier, setItemIdsBySupplier] = useState<Record<string, string[]>>(() => Object.fromEntries(suppliers.map((supplier) => [supplier.id, supplier.items.map((item) => item.id)])))
  const [results, setResults] = useState<DeliveryResult[]>([])
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  const selectedDeliveryCount = Object.values(channelsBySupplier).reduce((total, channels) => total + channels.length, 0)
  const sent = results.length > 0 && results.length === selectedDeliveryCount && results.every((result) => result.ok)
  const messageForSupplier = (supplier: DraftSupplier) => {
    const selectedIds = itemIdsBySupplier[supplier.id] || []
    const selectedList = supplier.items.filter((item) => selectedIds.includes(item.id)).map((item) => item.label).join("\n")
    return ["Client: Avantia Build", `Request: ${requestId}`, `Shipping address: ${jobAddress.trim() || "Not entered"}`, "", "Items:", selectedList || materialList.trim()].join("\n")
  }

  function toggleChannel(supplierId: string, channel: DeliveryChannel) {
    setChannelsBySupplier((current) => ({
      ...current,
      [supplierId]: (current[supplierId] || []).includes(channel)
        ? (current[supplierId] || []).filter((value) => value !== channel)
        : [...(current[supplierId] || []), channel],
    }))
  }

  function toggleSupplierItem(supplierId: string, itemId: string) {
    setItemIdsBySupplier((current) => ({ ...current, [supplierId]: (current[supplierId] || []).includes(itemId) ? (current[supplierId] || []).filter((id) => id !== itemId) : [...(current[supplierId] || []), itemId] }))
  }

  function sendRequests() {
    setError("")
    setResults([])
    startTransition(async () => {
      const nextResults: DeliveryResult[] = []
      for (const supplier of suppliers) {
        const supplierMessage = messageForSupplier(supplier)
        const selectedItemIds = itemIdsBySupplier[supplier.id] || []
        if (!selectedItemIds.length) {
          nextResults.push({ supplierId: supplier.id, supplierName: supplier.name, requestId: null, channel: channelsBySupplier[supplier.id]?.[0] || "email", ok: false, error: "Choose at least one material for this supplier." })
          continue
        }
        for (const channel of channelsBySupplier[supplier.id] || []) {
          const recipient = channel === "email" ? supplier.email : channel === "whatsapp" ? supplier.whatsapp || supplier.phone : supplier.phone
          if (channel !== "email" && supplierMessage.length > 1600) {
            nextResults.push({ supplierId: supplier.id, supplierName: supplier.name, requestId: null, channel, ok: false, error: "Text and WhatsApp messages must be under 1,600 characters. Shorten the item list or use email." })
            continue
          }
          const result = await sendAuraMessageAction({ channel, recipient, subject, message: supplierMessage, supplierId: supplier.id, supplierName: supplier.name, materialRequestId: requestId, materialRequestTitle: requestTitle, materialRequestItemIds: selectedItemIds })
          nextResults.push({ supplierId: supplier.id, supplierName: supplier.name, requestId: null, channel, ok: result.ok, error: result.ok ? null : result.error })
        }
      }
      setResults(nextResults)
      if (!nextResults.length) setError("Choose at least one contact method.")
      else if (!nextResults.some((result) => result.ok)) setError("No supplier messages were sent. Review the results below.")
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
              {suppliers.map((supplier) => <div key={supplier.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"><p className="text-sm font-bold">{supplier.name}</p><p className="mt-0.5 text-[11px] font-semibold text-slate-500">{(itemIdsBySupplier[supplier.id] || []).length} of {supplier.items.length} materials selected</p><div className="mt-2 grid gap-1">{supplier.items.map((item) => <label key={item.id} className="flex min-h-9 cursor-pointer items-start gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"><input type="checkbox" checked={(itemIdsBySupplier[supplier.id] || []).includes(item.id)} onChange={() => toggleSupplierItem(supplier.id, item.id)} className="mt-0.5 h-4 w-4 accent-[#0071e3]" /><span className="line-clamp-2 whitespace-pre-line">{item.label}</span></label>)}</div><div className="mt-2 flex flex-wrap gap-2">{availableChannels(supplier).map((channel) => <label key={channel} className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold"><input type="checkbox" checked={(channelsBySupplier[supplier.id] || []).includes(channel)} onChange={() => toggleChannel(supplier.id, channel)} />{channel === "email" ? <Mail className="h-3.5 w-3.5" /> : channel === "sms" ? <Smartphone className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}{channel === "sms" ? "Text" : channel === "whatsapp" ? "WhatsApp" : "Email"}</label>)}</div></div>)}
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-1.5 text-sm font-bold">Shipping or job address<input value={jobAddress} onChange={(event) => setJobAddress(event.target.value)} maxLength={500} className="min-h-11 rounded-lg border border-slate-300 px-3 text-base font-normal outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" /></label>
            <label className="grid gap-1.5 text-sm font-bold">Email subject<input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={300} className="min-h-11 rounded-lg border border-slate-300 px-3 text-base font-normal outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" /></label>
            <label className="grid gap-1.5 text-sm font-bold">Items and request details · master fallback <span className="text-xs font-normal text-slate-500">Used only if a legacy request has no item links.</span><textarea value={materialList} onChange={(event) => setMaterialList(event.target.value)} rows={5} maxLength={20_000} className="resize-y rounded-lg border border-slate-300 px-3 py-3 font-mono text-sm leading-6 font-normal outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" /></label>
            <div className="grid gap-2" aria-label="Exact message preview">{suppliers.map((supplier) => { const message = messageForSupplier(supplier); return <details key={supplier.id} className="rounded-lg border border-sky-200 bg-sky-50 p-4"><summary className="cursor-pointer text-xs font-bold uppercase tracking-[.12em] text-[#0066cc]">Exact preview · {supplier.name} · {message.length.toLocaleString()} characters</summary><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-800">{message}</pre></details> })}</div>
          </div>

          {error ? <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</p> : null}
          {results.length ? <div className="mt-4 grid gap-2" aria-label="Supplier delivery results">{results.map((result) => <div key={`${result.supplierId}-${result.channel}`} className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${result.ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>{result.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />}<div><p className="text-sm font-bold">{result.supplierName} · {result.channel === "sms" ? "Text" : result.channel === "whatsapp" ? "WhatsApp" : "Email"}</p><p className="mt-0.5 text-xs text-slate-700">{result.ok ? "Sent and saved in Aura Communications." : result.error}</p></div></div>)}</div> : null}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Link href="/admin/supplier-requests" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"><Mail className="h-4 w-4" />Sent requests</Link>
            <button type="button" onClick={sendRequests} disabled={pending || sent || !selectedDeliveryCount || !jobAddress.trim() || !subject.trim() || !materialList.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-5 text-sm font-semibold text-white disabled:opacity-45"><Send className="h-4 w-4" />{pending ? "Sending..." : sent ? "Requests sent" : `Send ${selectedDeliveryCount} message${selectedDeliveryCount === 1 ? "" : "s"}`}</button>
          </div>
        </section>
      </div>
    </main>
  )
}
