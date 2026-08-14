"use client"

import { Check, ChevronLeft, ChevronRight, FileUp, ImageIcon, PackagePlus, Pencil, Plus, Save, Search, Store, Trash2, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { createPortal } from "react-dom"

import {
  deleteMaterialCatalogItemAction,
  importMaterialCatalogPdfAction,
  saveMaterialCatalogItemAction,
  saveMaterialCatalogPricesAction,
} from "@/app/admin/catalog/actions"
import {
  MATERIAL_CATALOG_CATEGORIES,
  hasRoutableSupplierTrust,
  materialCatalogDepartmentOptions,
  supplierServesMaterialDepartment,
  type CatalogSupplier,
  type MaterialCatalogItem,
  type MaterialCatalogSupplierPrice,
} from "@/lib/material-catalog"

type PriceDraft = {
  unitPrice: string
  availability: "available" | "not_available" | "unknown"
  supplierSku: string
}

type EditorDraft = {
  id?: string
  category: string
  itemCode: string
  name: string
  description: string
  defaultQuantity: string
  unit: string
  imageUrl: string
  status: "active" | "inactive"
}

const unitOptions = ["each", "pcs", "sheets", "boxes", "bags", "bundles", "rolls", "pails", "sets", "tubes", "sq. ft.", "lin. ft.", "squares"]

function cellKey(itemId: string, supplierId: string) {
  return `${itemId}::${supplierId}`
}

function emptyEditor(category: string): EditorDraft {
  const prefix = category.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "MAT"
  return { category, itemCode: `${prefix}-NEW`, name: "", description: "", defaultQuantity: "1", unit: "each", imageUrl: "", status: "active" }
}

function itemEditor(item: MaterialCatalogItem): EditorDraft {
  return {
    id: item.id,
    category: item.category,
    itemCode: item.item_code,
    name: item.name,
    description: item.description,
    defaultQuantity: String(item.default_quantity),
    unit: item.unit,
    imageUrl: item.image_url ?? "",
    status: item.status,
  }
}

export function MaterialCatalogWorkspace({
  initialItems,
  initialPrices,
  suppliers,
  departments,
}: {
  initialItems: MaterialCatalogItem[]
  initialPrices: MaterialCatalogSupplierPrice[]
  suppliers: CatalogSupplier[]
  departments: string[]
}) {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState(initialItems[0]?.category || MATERIAL_CATALOG_CATEGORIES[0])
  const [itemSearch, setItemSearch] = useState("")
  const [supplierSearch, setSupplierSearch] = useState("")
  const [mobileSupplierId, setMobileSupplierId] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [editor, setEditor] = useState<EditorDraft | null>(null)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()
  const initialPriceMap = useMemo(() => new Map(initialPrices.map((price) => [cellKey(price.item_id, price.supplier_id), price])), [initialPrices])
  const [priceDrafts, setPriceDrafts] = useState<Record<string, PriceDraft>>(() => Object.fromEntries(initialPrices.map((price) => [cellKey(price.item_id, price.supplier_id), {
    unitPrice: price.unit_price === null ? "" : String(price.unit_price),
    availability: price.availability,
    supplierSku: price.supplier_sku,
  }])))

  const categories = useMemo(() => materialCatalogDepartmentOptions(departments, initialItems.map((item) => item.category)), [departments, initialItems])
  const categoryItems = useMemo(() => initialItems.filter((item) => {
    if (item.category !== selectedCategory) return false
    if (!showInactive && item.status === "inactive") return false
    const needle = itemSearch.trim().toLowerCase()
    return !needle || `${item.item_code} ${item.name} ${item.description} ${item.unit}`.toLowerCase().includes(needle)
  }), [initialItems, itemSearch, selectedCategory, showInactive])
  const visibleSuppliers = useMemo(() => {
    const needle = supplierSearch.trim().toLowerCase()
    return suppliers.filter((supplier) => {
      if (!hasRoutableSupplierTrust(supplier.trustLevel) || !supplierServesMaterialDepartment(supplier, selectedCategory)) return false
      const materials = Array.isArray(supplier.materials) ? supplier.materials.join(" ") : supplier.materials ?? ""
      return !needle || `${supplier.name} ${supplier.email ?? ""} ${supplier.phone ?? ""} ${materials}`.toLowerCase().includes(needle)
    })
  }, [selectedCategory, supplierSearch, suppliers])
  const mobileSupplier = visibleSuppliers.find((supplier) => supplier.id === mobileSupplierId) ?? visibleSuppliers[0] ?? null

  function moveMobileSupplier(direction: -1 | 1) {
    if (!mobileSupplier || visibleSuppliers.length < 2) return
    const currentIndex = visibleSuppliers.findIndex((supplier) => supplier.id === mobileSupplier.id)
    const nextIndex = (currentIndex + direction + visibleSuppliers.length) % visibleSuppliers.length
    setMobileSupplierId(visibleSuppliers[nextIndex].id)
  }

  function draftFor(itemId: string, supplierId: string): PriceDraft {
    const key = cellKey(itemId, supplierId)
    return priceDrafts[key] ?? { unitPrice: "", availability: "unknown", supplierSku: "" }
  }

  function updatePrice(itemId: string, supplierId: string, patch: Partial<PriceDraft>) {
    const key = cellKey(itemId, supplierId)
    setPriceDrafts((current) => ({ ...current, [key]: { ...draftFor(itemId, supplierId), ...patch } }))
    setDirtyKeys((current) => new Set(current).add(key))
    setNotice("")
    setError("")
  }

  function savePrices() {
    const changes = [...dirtyKeys].map((key) => {
      const [itemId, supplierId] = key.split("::")
      const draft = priceDrafts[key]
      return {
        itemId,
        supplierId,
        unitPrice: draft.unitPrice.trim() === "" ? null : Number(draft.unitPrice),
        availability: draft.availability,
        supplierSku: draft.supplierSku,
      }
    })
    startTransition(async () => {
      const result = await saveMaterialCatalogPricesAction(changes)
      if (!result.ok) return setError(result.error)
      setDirtyKeys(new Set())
      setNotice(result.message)
      router.refresh()
    })
  }

  function saveItem() {
    if (!editor) return
    startTransition(async () => {
      const result = await saveMaterialCatalogItemAction({
        id: editor.id,
        category: editor.category,
        itemCode: editor.itemCode,
        name: editor.name,
        description: editor.description,
        defaultQuantity: Number(editor.defaultQuantity),
        unit: editor.unit,
        imageUrl: editor.imageUrl,
        status: editor.status,
      })
      if (!result.ok) return setError(result.error)
      setEditor(null)
      setSelectedCategory(editor.category)
      setNotice(result.message)
      router.refresh()
    })
  }

  function deleteItem(item: MaterialCatalogItem) {
    if (!window.confirm(`Delete only ${item.name}? Supplier prices for this item will also be removed.`)) return
    startTransition(async () => {
      const result = await deleteMaterialCatalogItemAction(item.id)
      if (!result.ok) return setError(result.error)
      setNotice(result.message)
      router.refresh()
    })
  }

  function importPdf(file: File | null) {
    if (!file) return
    const formData = new FormData()
    formData.set("catalogPdf", file)
    startTransition(async () => {
      const result = await importMaterialCatalogPdfAction(formData)
      if (!result.ok) return setError(result.error)
      setNotice(result.message)
      router.refresh()
    })
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-3 pb-24 pt-4 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[100rem]">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0066cc]">Manager catalog</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Materials & supplier pricing</h1>
            <p className="mt-1 text-sm text-slate-600">Edit one category at a time. Supplier Directory contacts become price columns automatically.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold hover:border-sky-400">
              <FileUp className="h-4 w-4" />Import PDF<input type="file" accept="application/pdf,.pdf" className="sr-only" disabled={pending} onChange={(event) => { importPdf(event.target.files?.[0] ?? null); event.currentTarget.value = "" }} />
            </label>
            <Link href="/admin/vendors" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold hover:border-sky-400"><Store className="h-4 w-4" />Add supplier</Link>
            <button type="button" onClick={() => setEditor(emptyEditor(selectedCategory))} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Add item</button>
          </div>
        </header>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Catalog category">
          {categories.map((category) => {
            const count = initialItems.filter((item) => item.category === category && item.status === "active").length
            return <button key={category} type="button" role="tab" aria-selected={selectedCategory === category} onClick={() => setSelectedCategory(category)} className={`min-h-9 shrink-0 rounded-lg border px-3 text-xs font-bold ${selectedCategory === category ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`}>{category} <span className="ml-1 opacity-70">{count}</span></button>
          })}
        </div>

        <section className="mt-3 border-y border-slate-200 bg-white px-3 py-3 sm:rounded-lg sm:border">
          <div className="grid gap-2 md:grid-cols-[minmax(14rem,1fr)_minmax(14rem,1fr)_auto_auto]">
            <label className="relative"><span className="sr-only">Search materials</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={itemSearch} onChange={(event) => setItemSearch(event.target.value)} placeholder="Search items or item code" className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm" /></label>
            <label className="relative"><span className="sr-only">Search supplier columns</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={supplierSearch} onChange={(event) => setSupplierSearch(event.target.value)} placeholder="Filter supplier columns" className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm" /></label>
            <label className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-semibold"><input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} className="h-4 w-4 accent-[#0071e3]" />Show inactive</label>
            <button type="button" onClick={savePrices} disabled={pending || dirtyKeys.size === 0} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-40"><Save className="h-4 w-4" />Save {dirtyKeys.size ? `${dirtyKeys.size} price${dirtyKeys.size === 1 ? "" : "s"}` : "prices"}</button>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{categoryItems.length} item{categoryItems.length === 1 ? "" : "s"} · {visibleSuppliers.length} supplier column{visibleSuppliers.length === 1 ? "" : "s"}</span><span>Blank price = not entered · N/A = supplier does not carry it</span></div>
        </section>

        {notice ? <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900" role="status">{notice}</p> : null}
        {error ? <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800" role="alert">{error}</p> : null}

        <section className="mt-3 overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm md:hidden" aria-label={`${selectedCategory} mobile supplier pricing`}>
          <header className="border-b border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => moveMobileSupplier(-1)} disabled={visibleSuppliers.length < 2} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-35" aria-label="Previous supplier"><ChevronLeft className="h-4 w-4" /></button>
              <label className="min-w-0 flex-1"><span className="sr-only">Supplier price column</span><select value={mobileSupplier?.id ?? ""} onChange={(event) => setMobileSupplierId(event.target.value)} disabled={!mobileSupplier} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold"><option value="">No eligible supplier</option>{visibleSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
              <button type="button" onClick={() => moveMobileSupplier(1)} disabled={visibleSuppliers.length < 2} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-35" aria-label="Next supplier"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <p className="mt-2 text-xs text-slate-500">{mobileSupplier ? `${mobileSupplier.email || mobileSupplier.phone || "Contact not set"} · ${visibleSuppliers.findIndex((supplier) => supplier.id === mobileSupplier.id) + 1} of ${visibleSuppliers.length}` : `Assign an eligible supplier to ${selectedCategory} in Supplier Directory.`}</p>
          </header>
          <div className="divide-y divide-slate-200">
            {categoryItems.map((item) => {
              const supplier = mobileSupplier
              const key = supplier ? cellKey(item.id, supplier.id) : ""
              const draft = supplier ? draftFor(item.id, supplier.id) : null
              const saved = supplier ? initialPriceMap.get(key) : null
              return <article key={item.id} className={dirtyKeys.has(key) ? "bg-amber-50" : "bg-white"}>
                <div className="flex items-center gap-2 px-3 py-2.5">
                  {item.image_url ? <button type="button" onClick={() => setEditor(itemEditor(item))} className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white"><Image src={item.image_url} alt="" fill sizes="36px" className="object-contain" /></button> : <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400"><ImageIcon className="h-4 w-4" /></span>}
                  <div className="min-w-0 flex-1"><p className="text-sm font-bold leading-4 text-slate-950">{item.name}</p><p className="mt-1 text-[10px] text-slate-500">{item.item_code} · {Number(item.default_quantity).toLocaleString()} {item.unit}{item.status === "inactive" ? " · inactive" : ""}</p></div>
                  <button type="button" onClick={() => setEditor(itemEditor(item))} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-sky-50 hover:text-[#0066cc]" aria-label={`Edit ${item.name}`}><Pencil className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => deleteItem(item)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-700" aria-label={`Delete ${item.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                {supplier && draft ? <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-2 border-t border-slate-100 px-3 py-2.5">
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-slate-400">$</span><input aria-label={`${supplier.name} unit price for ${item.name}`} inputMode="decimal" value={draft.unitPrice} onChange={(event) => updatePrice(item.id, supplier.id, { unitPrice: event.target.value.replace(/[^0-9.]/g, "") })} placeholder="Unit price" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-6 pr-3 text-sm tabular-nums" /></div>
                  <div className="flex gap-1"><select aria-label={`${supplier.name} availability for ${item.name}`} value={draft.availability} onChange={(event) => updatePrice(item.id, supplier.id, { availability: event.target.value as PriceDraft["availability"] })} className={`h-10 min-w-0 flex-1 rounded-lg border px-2 text-xs font-semibold ${draft.availability === "not_available" ? "border-rose-200 bg-rose-50 text-rose-700" : draft.availability === "available" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}><option value="unknown">Unknown</option><option value="available">Available</option><option value="not_available">N/A</option></select>{saved || dirtyKeys.has(key) ? <span className={`inline-flex h-10 w-8 shrink-0 items-center justify-center rounded-lg ${dirtyKeys.has(key) ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"}`} title={dirtyKeys.has(key) ? "Unsaved change" : "Saved"}>{dirtyKeys.has(key) ? <Pencil className="h-3 w-3" /> : <Check className="h-3 w-3" />}</span> : null}</div>
                </div> : null}
              </article>
            })}
          </div>
          {!categoryItems.length ? <div className="grid min-h-48 place-items-center p-8 text-center"><div><PackagePlus className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-bold">No matching items</p><button type="button" onClick={() => setEditor(emptyEditor(selectedCategory))} className="mt-2 text-sm font-semibold text-[#0066cc]">Add the first item</button></div></div> : null}
        </section>

        <section className="mt-3 hidden max-w-full overflow-auto overscroll-x-contain rounded-lg border border-slate-300 bg-white shadow-sm md:block" aria-label={`${selectedCategory} supplier pricing matrix`}>
          <table className="border-collapse text-left text-xs" style={{ minWidth: `${460 + Math.max(visibleSuppliers.length, 1) * 172}px` }}>
            <thead className="sticky top-0 z-30 bg-slate-100">
              <tr>
                <th className="sticky left-0 z-40 w-[320px] min-w-[320px] border-b border-r border-slate-300 bg-slate-100 px-3 py-2 font-bold">Item</th>
                <th className="w-[140px] min-w-[140px] border-b border-r border-slate-300 px-3 py-2 font-bold">Sample quantity</th>
                {visibleSuppliers.map((supplier) => <th key={supplier.id} className="w-[172px] min-w-[172px] border-b border-r border-slate-300 px-2 py-2 align-top"><span className="block truncate font-bold" title={supplier.name}>{supplier.name}</span><span className="mt-0.5 block truncate text-[10px] font-normal text-slate-500">{supplier.email || supplier.phone || "Contact not set"}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {categoryItems.map((item) => <tr key={item.id} className="group even:bg-slate-50/60">
                <td className="sticky left-0 z-20 border-b border-r border-slate-200 bg-white px-3 py-2 group-even:bg-[#fafafa]">
                  <div className="flex items-center gap-2">
                    {item.image_url ? <button type="button" onClick={() => setEditor(itemEditor(item))} className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white"><Image src={item.image_url} alt="" fill sizes="36px" className="object-contain" /></button> : <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400"><ImageIcon className="h-4 w-4" /></span>}
                    <div className="min-w-0 flex-1"><p className="font-bold leading-4 text-slate-950">{item.name}</p><p className="mt-0.5 text-[10px] text-slate-500">{item.item_code}{item.status === "inactive" ? " · inactive" : ""}</p></div>
                    <button type="button" onClick={() => setEditor(itemEditor(item))} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-sky-50 hover:text-[#0066cc]" aria-label={`Edit ${item.name}`}><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => deleteItem(item)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-700" aria-label={`Delete ${item.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
                <td className="border-b border-r border-slate-200 px-3 py-2 align-middle"><p className="font-bold tabular-nums">{Number(item.default_quantity).toLocaleString()}</p><p className="text-[10px] text-slate-500">{item.unit}</p></td>
                {visibleSuppliers.map((supplier) => {
                  const key = cellKey(item.id, supplier.id)
                  const draft = draftFor(item.id, supplier.id)
                  const saved = initialPriceMap.get(key)
                  return <td key={supplier.id} className={`border-b border-r border-slate-200 p-1.5 align-top ${dirtyKeys.has(key) ? "bg-amber-50" : ""}`}>
                    <div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 font-semibold text-slate-400">$</span><input aria-label={`${supplier.name} unit price for ${item.name}`} inputMode="decimal" value={draft.unitPrice} onChange={(event) => updatePrice(item.id, supplier.id, { unitPrice: event.target.value.replace(/[^0-9.]/g, "") })} placeholder="Price" className="h-8 w-full rounded-md border border-slate-300 bg-white pl-5 pr-2 text-xs tabular-nums" /></div>
                    <div className="mt-1 flex gap-1">
                      <select aria-label={`${supplier.name} availability for ${item.name}`} value={draft.availability} onChange={(event) => updatePrice(item.id, supplier.id, { availability: event.target.value as PriceDraft["availability"] })} className={`h-7 min-w-0 flex-1 rounded-md border px-1 text-[10px] font-semibold ${draft.availability === "not_available" ? "border-rose-200 bg-rose-50 text-rose-700" : draft.availability === "available" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}><option value="unknown">Unknown</option><option value="available">Available</option><option value="not_available">N/A</option></select>
                      {saved || dirtyKeys.has(key) ? <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${dirtyKeys.has(key) ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"}`} title={dirtyKeys.has(key) ? "Unsaved change" : "Saved"}>{dirtyKeys.has(key) ? <Pencil className="h-3 w-3" /> : <Check className="h-3 w-3" />}</span> : null}
                    </div>
                  </td>
                })}
              </tr>)}
            </tbody>
          </table>
          {!categoryItems.length ? <div className="grid min-h-48 place-items-center p-8 text-center"><div><PackagePlus className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-bold">No matching items</p><button type="button" onClick={() => setEditor(emptyEditor(selectedCategory))} className="mt-2 text-sm font-semibold text-[#0066cc]">Add the first item</button></div></div> : null}
        </section>
      </div>

      {editor && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[150] grid place-items-center overflow-y-auto bg-slate-950/50 p-3" role="dialog" aria-modal="true" aria-labelledby="catalog-item-editor-title" onMouseDown={(event) => { if (event.currentTarget === event.target && !pending) setEditor(null) }}>
        <section className="w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0066cc]">Catalog item</p><h2 id="catalog-item-editor-title" className="mt-0.5 text-lg font-bold">{editor.id ? "Edit material" : "Add material"}</h2></div><button type="button" onClick={() => setEditor(null)} disabled={pending} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200" aria-label="Close"><X className="h-4 w-4" /></button></header>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-bold">Category<select value={editor.category} onChange={(event) => setEditor({ ...editor, category: event.target.value })} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal">{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-bold">Item code<input value={editor.itemCode} onChange={(event) => setEditor({ ...editor, itemCode: event.target.value })} className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal uppercase" /></label>
            <label className="grid gap-1 text-xs font-bold sm:col-span-2">Material name<input value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} autoFocus className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
            <label className="grid gap-1 text-xs font-bold">Sample quantity<input type="number" min="0.01" step="0.01" value={editor.defaultQuantity} onChange={(event) => setEditor({ ...editor, defaultQuantity: event.target.value })} className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
            <label className="grid gap-1 text-xs font-bold">Unit<select value={editor.unit} onChange={(event) => setEditor({ ...editor, unit: event.target.value })} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal">{unitOptions.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-bold sm:col-span-2">Description <span className="font-normal text-slate-400">optional</span><textarea value={editor.description} onChange={(event) => setEditor({ ...editor, description: event.target.value })} rows={2} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="grid gap-1 text-xs font-bold sm:col-span-2">Small product image URL <span className="font-normal text-slate-400">optional</span><input value={editor.imageUrl} onChange={(event) => setEditor({ ...editor, imageUrl: event.target.value })} placeholder="/images/materials/..." className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
            <label className="grid gap-1 text-xs font-bold">Status<select value={editor.status} onChange={(event) => setEditor({ ...editor, status: event.target.value as EditorDraft["status"] })} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal"><option value="active">Active</option><option value="inactive">Inactive / hidden</option></select></label>
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3"><button type="button" onClick={() => setEditor(null)} disabled={pending} className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold">Cancel</button><button type="button" onClick={saveItem} disabled={pending || !editor.name.trim() || !editor.itemCode.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-40"><Save className="h-4 w-4" />{pending ? "Saving..." : "Save item"}</button></footer>
        </section>
      </div>, document.body) : null}
    </main>
  )
}
