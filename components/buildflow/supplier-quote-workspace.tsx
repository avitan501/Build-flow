"use client"

import { ArrowLeft, BookOpenCheck, Check, Columns3, ExternalLink, FileSearch, FileText, LoaderCircle, Plus, RotateCw, Save, Send, Store, Trash2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"

import {
  addSupplierQuoteItemAction,
  addSupplierQuoteItemsToCatalogAction,
  assignSupplierQuoteDirectoryAction,
  createAndAssignSupplierQuoteDirectoryAction,
  createClientQuoteFromSupplierQuoteAction,
  deleteSupplierQuoteItemAction,
  retrySupplierQuoteExtractionAction,
  saveSupplierQuoteAction,
  sendSupplierQuoteToComparisonAction,
} from "@/app/admin/supplier-quotes/actions"
import type { SupplierQuoteItemRecord, SupplierQuoteRecord } from "@/lib/supplier-quotes"

type EditableItem = {
  id: string
  itemCode: string
  description: string
  specification: string
  quantity: number
  unit: string
  unitPrice: number | null
  selected: boolean
  catalogItemId: string | null
}

function editableItem(item: SupplierQuoteItemRecord): EditableItem {
  return { id: item.id, itemCode: item.item_code, description: item.description, specification: item.specification, quantity: Number(item.quantity), unit: item.unit, unitPrice: item.unit_price === null ? null : Number(item.unit_price), selected: item.selected, catalogItemId: item.catalog_item_id }
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

export function SupplierQuoteWorkspace({ quote, initialItems, documentUrl, departments, suppliers }: {
  quote: SupplierQuoteRecord
  initialItems: SupplierQuoteItemRecord[]
  documentUrl: string | null
  departments: string[]
  suppliers: Array<{ id: string; name: string }>
}) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems.map(editableItem))
  const [quoteNumber, setQuoteNumber] = useState(quote.quote_number)
  const [department, setDepartment] = useState(quote.department)
  const [quoteDate, setQuoteDate] = useState(quote.quote_date ?? "")
  const [expiresOn, setExpiresOn] = useState(quote.expires_on ?? "")
  const [notes, setNotes] = useState(quote.notes)
  const [deliveryCharge, setDeliveryCharge] = useState(Number(quote.delivery_charge))
  const [taxPercent, setTaxPercent] = useState(Number(quote.tax_percent))
  const [leadTimeDays, setLeadTimeDays] = useState<number | null>(quote.lead_time_days === null ? null : Number(quote.lead_time_days))
  const [message, setMessage] = useState(quote.extraction_note)
  const [linkedSupplier, setLinkedSupplier] = useState(quote.supplier_id ?? "")
  const [supplierSelection, setSupplierSelection] = useState(quote.supplier_id ?? "")
  const [tone, setTone] = useState<"info" | "success" | "error">(initialItems.length ? "info" : "error")
  const [pending, startTransition] = useTransition()
  const selectedIds = items.filter((item) => item.selected).map((item) => item.id)
  const subtotal = useMemo(() => items.filter((item) => item.selected).reduce((total, item) => total + item.quantity * (item.unitPrice ?? 0), 0), [items])
  const taxableSubtotal = subtotal + deliveryCharge
  const tax = taxableSubtotal * taxPercent / 100
  const total = taxableSubtotal + tax

  function updateItem(id: string, patch: Partial<EditableItem>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item))
  }

  async function save() {
    const result = await saveSupplierQuoteAction({ quoteId: quote.id, quoteNumber, department, quoteDate, expiresOn, notes, deliveryCharge, taxPercent, leadTimeDays, items })
    if (!result.ok) {
      setTone("error")
      setMessage(result.error)
      return false
    }
    setTone("success")
    setMessage(result.message)
    router.refresh()
    return true
  }

  function runSave() {
    startTransition(async () => { await save() })
  }

  function addLine() {
    startTransition(async () => {
      const saved = await save()
      if (!saved) return
      const result = await addSupplierQuoteItemAction(quote.id)
      if (!result.ok) { setTone("error"); setMessage(result.error); return }
      setItems((current) => [...current, editableItem(result.data.item)])
      setTone("success")
      setMessage("New line added. Enter the material details.")
    })
  }

  function removeLine(item: EditableItem) {
    if (!window.confirm(`Remove “${item.description}” from this supplier quote?`)) return
    startTransition(async () => {
      const result = await deleteSupplierQuoteItemAction(quote.id, item.id)
      if (!result.ok) { setTone("error"); setMessage(result.error); return }
      setItems((current) => current.filter((entry) => entry.id !== item.id))
      setTone("success")
      setMessage(result.message)
    })
  }

  function retryExtraction(replaceExisting = false) {
    if (replaceExisting && !window.confirm("Re-read the original invoice with AI and replace the current extracted rows? The original invoice will remain saved.")) return
    startTransition(async () => {
      setTone("info")
      setMessage("Reading the original invoice and extracting its material lines...")
      const result = await retrySupplierQuoteExtractionAction(quote.id, replaceExisting)
      if (!result.ok) { setTone("error"); setMessage(result.error); return }
      setItems(result.data.items.map(editableItem))
      setTone("success")
      setMessage(result.message)
      router.refresh()
    })
  }

  function connectSupplier(create = false) {
    startTransition(async () => {
      if (!create && !supplierSelection) {
        setTone("error")
        setMessage("Choose a supplier from the directory first.")
        return
      }
      const result = create
        ? await createAndAssignSupplierQuoteDirectoryAction(quote.id)
        : await assignSupplierQuoteDirectoryAction(quote.id, supplierSelection)
      if (!result.ok) {
        setTone("error")
        setMessage(result.error)
        return
      }
      setLinkedSupplier(result.data.supplierId)
      setSupplierSelection(result.data.supplierId)
      setTone("success")
      setMessage(result.message)
      router.refresh()
    })
  }

  function route(destination: "catalog" | "comparison" | "client") {
    startTransition(async () => {
      if (!selectedIds.length) { setTone("error"); setMessage("Select at least one item first."); return }
      if (!await save()) return
      const result = destination === "catalog"
        ? await addSupplierQuoteItemsToCatalogAction(quote.id, selectedIds)
        : destination === "comparison"
          ? await sendSupplierQuoteToComparisonAction(quote.id, selectedIds)
          : await createClientQuoteFromSupplierQuoteAction(quote.id, selectedIds)
      if (!result.ok) { setTone("error"); setMessage(result.error); return }
      setTone("success")
      setMessage(result.message)
      if ("comparisonId" in result.data) router.push(`/admin/quote-comparison/${result.data.comparisonId}${destination === "client" ? "?prepare=client" : ""}`)
      else router.refresh()
    })
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-3 pb-28 pt-4 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[92rem]">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0"><Link href="/admin/supplier-quotes" className="inline-flex items-center gap-2 text-sm font-bold text-[#0071e3]"><ArrowLeft className="h-4 w-4" /> Quote storage</Link><p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{quote.department}</p><h1 className="mt-1 truncate text-2xl font-bold tracking-tight sm:text-3xl">{quote.supplier_name}</h1><p className="mt-1 text-sm font-semibold text-slate-800">{quote.client_name_snapshot ? `For ${quote.client_name_snapshot}` : "Not linked to a client"}</p><p className="mt-1 truncate text-sm text-slate-600">{quote.quote_number ? `Quote ${quote.quote_number} · ` : ""}{quote.file_name}</p></div>
          <div className="flex flex-wrap gap-2">{documentUrl ? <a href={documentUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold"><FileText className="h-4 w-4" /> Original <ExternalLink className="h-3.5 w-3.5" /></a> : null}<button type="button" onClick={runSave} disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-50">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save quote</button></div>
        </header>

        {message ? <div role={tone === "error" ? "alert" : "status"} className={`mt-4 border px-4 py-3 text-sm font-semibold ${tone === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-sky-200 bg-sky-50 text-sky-800"}`}>{message}</div> : null}

        {!linkedSupplier ? <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4" aria-labelledby="quote-supplier-link-heading">
          <div className="flex items-start gap-3"><Store className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div className="min-w-0 flex-1"><h2 id="quote-supplier-link-heading" className="font-bold text-amber-950">Confirm the supplier for this quote</h2><p className="mt-1 text-xs leading-5 text-amber-900">We read “{quote.source_vendor_name || quote.supplier_name}”. Choose the existing directory record, or add this exact vendor as a first-time supplier. Prices remain isolated under the supplier you confirm.</p></div></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"><select aria-label="Supplier Directory record" value={supplierSelection} onChange={(event) => setSupplierSelection(event.target.value)} className="min-h-11 min-w-0 rounded-lg border border-amber-300 bg-white px-3 text-sm"><option value="">Choose existing supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select><button type="button" onClick={() => connectSupplier(false)} disabled={pending || !supplierSelection} className="min-h-11 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-40">Use selected</button><button type="button" onClick={() => connectSupplier(true)} disabled={pending} className="min-h-11 rounded-lg border border-amber-400 bg-white px-4 text-sm font-bold text-amber-950 disabled:opacity-40">Add “{quote.source_vendor_name || quote.supplier_name}”</button></div>
          <Link href="/admin/vendors" className="mt-3 inline-flex text-xs font-bold text-amber-900 underline underline-offset-2">Open Supplier Directory for full contact details</Link>
        </section> : null}

        <details className="mt-4 overflow-hidden border border-slate-200 bg-white shadow-sm" aria-label="Quote details">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3"><span className="font-bold">Quote details</span><span className="text-xs font-semibold text-[#0071e3]">Edit dates, tax, delivery, and notes</span></summary>
          <div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1 text-xs font-bold text-slate-600">Quote number<input value={quoteNumber} onChange={(event) => setQuoteNumber(event.target.value)} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-950" /></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">Department<select value={department} onChange={(event) => setDepartment(event.target.value)} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950">{departments.map((entry) => <option key={entry}>{entry}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">Quote date<input type="date" value={quoteDate} onChange={(event) => setQuoteDate(event.target.value)} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-950" /></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">Expires<input type="date" value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-950" /></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">Delivery<input type="number" min="0" step="0.01" value={deliveryCharge} onChange={(event) => setDeliveryCharge(Number(event.target.value))} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-950" /></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">Tax %<input type="number" min="0" max="100" step="0.01" value={taxPercent} onChange={(event) => setTaxPercent(Number(event.target.value))} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-950" /></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">Lead time (days)<input type="number" min="0" max="3650" step="1" value={leadTimeDays ?? ""} onChange={(event) => setLeadTimeDays(event.target.value === "" ? null : Number(event.target.value))} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-950" /></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600 lg:col-span-3">Internal notes<input value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-950" placeholder="Delivery terms, contact, or follow-up" /></label>
          </div>
        </details>

        <section className="mt-4 border border-slate-200 bg-white shadow-sm" aria-labelledby="quote-items-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><h2 id="quote-items-heading" className="font-bold">Extracted items</h2><p className="mt-0.5 text-xs text-slate-500">Review every selected row before routing</p></div><div className="flex flex-wrap gap-2">{items.length ? <button type="button" onClick={() => retryExtraction(true)} disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-3 text-sm font-bold text-sky-800"><RotateCw className="h-4 w-4" /> Re-read with AI</button> : null}<button type="button" onClick={addLine} disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-bold"><Plus className="h-4 w-4" /> Add line</button></div></div>
          <div className="divide-y divide-slate-200">
            {items.map((item, index) => <article key={item.id} className={`grid grid-cols-2 gap-3 p-3 sm:grid-cols-4 lg:grid-cols-[2.5rem_minmax(13rem,2fr)_minmax(8rem,1fr)_6rem_6rem_7rem_7rem_2.5rem] lg:items-end lg:p-4 ${item.selected ? "bg-white" : "bg-slate-50 opacity-65"}`}>
              <label className="col-span-2 flex items-center gap-2 text-xs font-bold text-slate-500 sm:col-span-4 lg:col-span-1 lg:grid lg:justify-items-center"><span className="lg:hidden">Use item</span><input type="checkbox" checked={item.selected} onChange={(event) => updateItem(item.id, { selected: event.target.checked })} className="h-5 w-5 accent-[#0071e3]" aria-label={`Use item ${index + 1}`} /><span className="tabular-nums">{index + 1}</span></label>
              <label className="col-span-2 grid gap-1 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 sm:col-span-4 lg:col-span-1">Material<input value={item.description} onChange={(event) => updateItem(item.id, { description: event.target.value })} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold normal-case tracking-normal text-slate-950" /></label>
              <label className="col-span-2 grid gap-1 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 sm:col-span-4 lg:col-span-1">Specification<input value={item.specification} onChange={(event) => updateItem(item.id, { specification: event.target.value })} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm normal-case tracking-normal text-slate-950" /></label>
              <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">Qty<input type="number" min="0.001" step="0.001" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) })} className="min-h-10 rounded-lg border border-slate-300 px-2 text-sm text-slate-950" /></label>
              <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">Unit<input value={item.unit} onChange={(event) => updateItem(item.id, { unit: event.target.value })} className="min-h-10 rounded-lg border border-slate-300 px-2 text-sm normal-case tracking-normal text-slate-950" /></label>
              <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">Unit price<input type="number" min="0" step="0.01" value={item.unitPrice ?? ""} onChange={(event) => updateItem(item.id, { unitPrice: event.target.value === "" ? null : Number(event.target.value) })} className="min-h-10 rounded-lg border border-slate-300 px-2 text-sm text-slate-950" /></label>
              <div><p className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">Line total</p><p className="flex min-h-10 items-center text-sm font-bold tabular-nums">{money(item.quantity * (item.unitPrice ?? 0))}</p></div>
              <button type="button" onClick={() => removeLine(item)} disabled={pending} aria-label={`Remove ${item.description}`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
            </article>)}
            {!items.length ? <div className="px-5 py-10 text-center"><FileSearch className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-bold">No items extracted yet</p><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Read the saved invoice again to extract material names, model numbers, quantities, units, prices, and totals.</p><div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => retryExtraction()} disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-bold text-white disabled:opacity-50">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />} Extract invoice</button><button type="button" onClick={addLine} disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold"><Plus className="h-4 w-4" /> Add manually</button></div></div> : null}
          </div>
        </section>

        {documentUrl ? <details className="mt-4 overflow-hidden border border-slate-200 bg-white shadow-sm"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3"><span><span id="invoice-preview-heading" className="block font-bold">Original invoice</span><span className="mt-0.5 block text-xs text-slate-500">Open only when you need to compare the source</span></span><span className="text-xs font-semibold text-[#0071e3]">View document</span></summary><div className="border-t border-slate-200"><div className="flex justify-end p-3"><a href={documentUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-bold">Open full size <ExternalLink className="h-3.5 w-3.5" /></a></div>{quote.mime_type.startsWith("image/") ? <Image src={documentUrl} alt={`Original supplier invoice from ${quote.supplier_name}`} width={1600} height={2200} unoptimized className="mx-auto max-h-[36rem] w-auto max-w-full object-contain p-3 pt-0" /> : <iframe src={documentUrl} title={`Original supplier invoice from ${quote.supplier_name}`} className="h-[30rem] w-full border-0" />}</div></details> : null}

        <section className="sticky bottom-2 z-20 mt-4 grid gap-3 rounded-lg border border-slate-200 bg-[#f5f5f7]/95 p-2 shadow-lg backdrop-blur lg:static lg:grid-cols-[minmax(0,1fr)_22rem] lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <div className="grid gap-2 sm:grid-cols-3">
            <button type="button" onClick={() => route("catalog")} disabled={pending || !selectedIds.length} className="flex min-h-16 items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 text-left text-sm font-bold shadow-sm disabled:opacity-40"><BookOpenCheck className="h-5 w-5 text-[#0071e3]" /><span>Add to catalog<span className="mt-0.5 block text-xs font-medium text-slate-500">Items and supplier prices</span></span></button>
            <button type="button" onClick={() => route("comparison")} disabled={pending || !selectedIds.length} className="flex min-h-16 items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 text-left text-sm font-bold shadow-sm disabled:opacity-40"><Columns3 className="h-5 w-5 text-[#0071e3]" /><span>{quote.comparison_id ? "Add to request comparison" : "Compare suppliers"}<span className="mt-0.5 block text-xs font-medium text-slate-500">{quote.comparison_id ? "Add this quote as a supplier column" : "Open comparison room"}</span></span></button>
            <button type="button" onClick={() => route("client")} disabled={pending || !selectedIds.length} className="flex min-h-16 items-center gap-3 rounded-lg bg-[#0071e3] px-4 text-left text-sm font-bold text-white shadow-sm disabled:opacity-40"><Send className="h-5 w-5" /><span>Prepare client quote<span className="mt-0.5 block text-xs font-medium text-sky-100">Choose client and markup</span></span></button>
          </div>
          <div className="border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between text-sm"><span className="text-slate-500">Selected materials</span><strong>{money(subtotal)}</strong></div><div className="mt-2 flex items-center justify-between text-sm"><span className="text-slate-500">Tax + delivery</span><strong>{money(tax + deliveryCharge)}</strong></div><div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3"><span className="font-bold">Supplier total</span><strong className="text-xl tabular-nums">{money(total)}</strong></div><p className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-500"><Check className="h-3.5 w-3.5 text-emerald-600" /> {selectedIds.length} item{selectedIds.length === 1 ? "" : "s"} selected</p></div>
        </section>
      </div>
    </main>
  )
}
