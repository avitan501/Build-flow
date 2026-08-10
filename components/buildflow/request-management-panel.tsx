"use client"

import { ExternalLink, Mail, MessageCircle, Phone, Route } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"

import { routeRequestToSupplierAction } from "@/app/preview-admin/workflow-actions"
import { sendClientReplyAction } from "@/app/owner/materials/requests/actions"
import type { SupplierRoutingOption } from "@/lib/shop-qualification"

type PackageRoute = { id: string; department: string; supplier_id: string | null; status: string }

function whatsappLink(phone: string, message: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`
}

const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-sky-400 hover:bg-sky-50"

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
  const [department, setDepartment] = useState(departments[0] || "General request")
  const existingPackage = packages.find((pkg) => pkg.department === department)
  const [supplierId, setSupplierId] = useState(existingPackage?.supplier_id || "")
  const [clientMessage, setClientMessage] = useState(`Hi ${client.name || "there"},\n\nWe are reviewing your Avantia Build request and will follow up with the next step shortly.\n\nRequest: ${requestTitle}`)
  const [supplierMessage, setSupplierMessage] = useState(`Please review and provide pricing for this Avantia Build request.\n\nRequest: ${requestTitle}\nDepartment: ${department}`)
  const [feedback, setFeedback] = useState("")
  const [feedbackError, setFeedbackError] = useState(false)
  const [pending, startTransition] = useTransition()

  const supplier = useMemo(() => suppliers.find((entry) => entry.id === supplierId), [supplierId, suppliers])

  function chooseDepartment(nextDepartment: string) {
    setDepartment(nextDepartment)
    setSupplierId(packages.find((pkg) => pkg.department === nextDepartment)?.supplier_id || "")
    setSupplierMessage(`Please review and provide pricing for this Avantia Build request.\n\nRequest: ${requestTitle}\nDepartment: ${nextDepartment}`)
  }

  function saveRouting() {
    startTransition(async () => {
      setFeedback("")
      const result = await routeRequestToSupplierAction({ requestId, department, supplierId })
      setFeedbackError(!result.ok)
      setFeedback(result.ok ? "Supplier routing saved. The request is now in Supplier Requests for review." : result.error)
      if (result.ok) router.refresh()
    })
  }

  function sendClientEmail() {
    startTransition(async () => {
      setFeedback("")
      const result = await sendClientReplyAction({ requestId, message: clientMessage })
      setFeedbackError(!result.ok)
      setFeedback(result.ok ? `Email sent directly to ${client.email}.` : result.error)
    })
  }

  return (
    <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5" aria-labelledby="request-management-heading">
      <div className="flex items-center gap-2"><Route className="h-5 w-5 text-[#0066cc]" /><h2 id="request-management-heading" className="text-xl font-bold">Manage request</h2></div>
      <p className="mt-1 text-sm text-slate-600">Route this request, contact the client, and contact the assigned supplier from one place.</p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-bold text-slate-950">Supplier routing</h3>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Department<select value={department} onChange={(event) => chooseDepartment(event.target.value)} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950">{departments.map((entry) => <option key={entry}>{entry}</option>)}</select></label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Supplier<select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950"><option value="">Choose supplier</option>{suppliers.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
            <button type="button" onClick={saveRouting} disabled={pending || !supplierId} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-50"><Route className="h-4 w-4" />{pending ? "Saving..." : "Save supplier routing"}</button>
          </div>
          {packages.length ? <div className="mt-4 border-t border-slate-200 pt-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Current routes</p><div className="mt-2 grid gap-2">{packages.map((pkg) => <div key={pkg.id} className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold">{pkg.department}</span><span className="text-right text-slate-600">{suppliers.find((entry) => entry.id === pkg.supplier_id)?.name || "Not assigned"} · {pkg.status.replaceAll("_", " ")}</span></div>)}</div></div> : null}
        </div>

        <div className="grid gap-4">
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-bold text-slate-950">Reply to client</h3>
            <textarea value={clientMessage} onChange={(event) => setClientMessage(event.target.value)} rows={4} className="mt-3 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <div className="mt-3 flex flex-wrap gap-2">
              {client.email ? <button type="button" onClick={sendClientEmail} disabled={pending || !clientMessage.trim()} className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-50`}><Mail className="h-4 w-4" />{pending ? "Sending..." : "Send email"}</button> : null}
              {client.phone ? <a href={`tel:${client.phone}`} className={actionClass}><Phone className="h-4 w-4" />Call client</a> : null}
              {client.phone ? <a href={whatsappLink(client.phone, clientMessage)} target="_blank" rel="noreferrer" className={actionClass}><MessageCircle className="h-4 w-4" />WhatsApp client</a> : null}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-bold text-slate-950">Contact supplier</h3>
            <p className="mt-1 text-sm text-slate-500">{supplier ? `${supplier.name}${supplier.contactName ? ` · ${supplier.contactName}` : ""}` : "Choose a supplier above."}</p>
            <textarea value={supplierMessage} onChange={(event) => setSupplierMessage(event.target.value)} rows={4} disabled={!supplier} className="mt-3 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" />
            {supplier ? <div className="mt-3 flex flex-wrap gap-2">
              {supplier.email ? <a href={`mailto:${supplier.email}?subject=${encodeURIComponent(`Pricing request: ${requestTitle}`)}&body=${encodeURIComponent(supplierMessage)}`} className={actionClass}><Mail className="h-4 w-4" />Email supplier</a> : null}
              {supplier.whatsapp || supplier.phone ? <a href={whatsappLink(supplier.whatsapp || supplier.phone || "", supplierMessage)} target="_blank" rel="noreferrer" className={actionClass}><MessageCircle className="h-4 w-4" />WhatsApp supplier</a> : null}
              {supplier.phone ? <a href={`tel:${supplier.phone}`} className={actionClass}><Phone className="h-4 w-4" />Call supplier</a> : null}
              {supplier.portalUrl ? <a href={supplier.portalUrl} target="_blank" rel="noreferrer" className={actionClass}><ExternalLink className="h-4 w-4" />Supplier portal</a> : null}
              {!supplier.email && !supplier.whatsapp && !supplier.phone && !supplier.portalUrl ? <p className="text-sm font-medium text-amber-700">Add a contact method in Supplier Directory before contacting this supplier.</p> : null}
            </div> : null}
          </div>
        </div>
      </div>
      {feedback ? <p className={`mt-4 rounded-lg border px-4 py-3 text-sm font-semibold ${feedbackError ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`} role="status">{feedback}</p> : null}
    </section>
  )
}
