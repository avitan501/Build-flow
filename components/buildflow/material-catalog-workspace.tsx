"use client"

import { AlertTriangle, Archive, Check, ChevronLeft, ChevronRight, ExternalLink, EyeOff, FileUp, ImageIcon, PackagePlus, Pencil, Plus, Save, Search, Store, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"
import { createPortal } from "react-dom"

import {
  deleteMaterialCatalogItemAction,
  importMaterialCatalogPdfAction,
  saveCatalogDepartmentSuppliersAction,
  saveMaterialCatalogItemAction,
  saveMaterialCatalogPricesAction,
} from "@/app/admin/catalog/actions"
import { ExaCatalogResearch } from "@/components/buildflow/exa-catalog-research"
import {
  MATERIAL_CATALOG_CATEGORIES,
  hasRoutableSupplierTrust,
  materialCatalogDepartmentOptions,
  normalizeMaterialCatalogDepartment,
  supplierServesMaterialDepartment,
  type CatalogSupplier,
  type MaterialCatalogItem,
  type MaterialCatalogSupplierPrice,
} from "@/lib/material-catalog"
import {
  catalogItemIssues,
  catalogItemMatchesReview,
  isPriceStale,
  normalizedComparisonPrice,
  priceCheckedDateLabel,
  priceVerificationLabel,
  type CatalogReviewFilter,
} from "@/lib/material-catalog-quality"

type PriceDraft = {
  unitPrice: string
  availability: "available" | "not_available" | "unknown"
  supplierSku: string
  productUrl: string
  deliveryPrice: string
  minimumOrder: string
  priceType: "retail" | "supplier_quote" | "contractor" | "estimated"
  verificationStatus: "verified_today" | "recently_verified" | "supplier_quote" | "stale" | "unavailable" | "possible_match" | "unverified"
  notes: string
}

type EditorDraft = {
  id?: string
  category: string
  itemCode: string
  name: string
  description: string
  measurement: string
  thickness: string
  brand: string
  manufacturerModelNumber: string
  upc: string
  packageQuantity: string
  packageUnit: string
  comparisonQuantity: string
  comparisonUnit: string
  reviewStatus: "ready" | "needs_review" | "ambiguous" | "discontinued"
  qualityNotes: string
  defaultQuantity: string
  unit: string
  imageUrl: string
  status: "active" | "inactive"
}

const unitOptions = ["each", "pcs", "sheets", "boxes", "bags", "bundles", "rolls", "pails", "sets", "tubes", "sq. ft.", "lin. ft.", "squares"]

function cellKey(itemId: string, supplierId: string) {
  return `${itemId}::${supplierId}`
}

const RETAIL_CATALOG_SUPPLIER_IDS = new Set(["lowes-retail-catalog", "home-depot-retail-catalog"])

function isRetailCatalogSupplier(supplier: CatalogSupplier) {
  return RETAIL_CATALOG_SUPPLIER_IDS.has(supplier.id)
}

function emptyEditor(category: string): EditorDraft {
  const prefix = category.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "MAT"
  return { category, itemCode: `${prefix}-NEW`, name: "", description: "", measurement: "", thickness: "", brand: "", manufacturerModelNumber: "", upc: "", packageQuantity: "1", packageUnit: "each", comparisonQuantity: "1", comparisonUnit: "each", reviewStatus: "needs_review", qualityNotes: "", defaultQuantity: "1", unit: "each", imageUrl: "", status: "active" }
}

function itemEditor(item: MaterialCatalogItem): EditorDraft {
  return {
    id: item.id,
    category: item.category,
    itemCode: item.item_code,
    name: item.name,
    description: item.description,
    measurement: item.measurement,
    thickness: item.thickness,
    brand: item.brand,
    manufacturerModelNumber: item.manufacturer_model_number,
    upc: item.upc,
    packageQuantity: String(item.package_quantity),
    packageUnit: item.package_unit,
    comparisonQuantity: String(item.comparison_quantity),
    comparisonUnit: item.comparison_unit,
    reviewStatus: item.review_status,
    qualityNotes: item.quality_notes,
    defaultQuantity: String(item.default_quantity),
    unit: item.unit,
    imageUrl: item.image_url ?? "",
    status: item.status,
  }
}

function initialCatalogSupplierIds(suppliers: CatalogSupplier[]) {
  const selections: Record<string, string[]> = {}
  for (const supplier of suppliers) {
    for (const department of supplier.catalogEnabledDepartments ?? []) {
      const normalized = normalizeMaterialCatalogDepartment(department)
      selections[normalized] = [...new Set([...(selections[normalized] ?? []), supplier.id])]
    }
  }
  return selections
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
  const [catalogSupplierSearch, setCatalogSupplierSearch] = useState("")
  const [mobileSupplierId, setMobileSupplierId] = useState("")
  const [catalogSupplierOpen, setCatalogSupplierOpen] = useState(false)
  const [catalogSupplierDepartment, setCatalogSupplierDepartment] = useState(initialItems[0]?.category || MATERIAL_CATALOG_CATEGORIES[0])
  const [catalogSupplierDraftIds, setCatalogSupplierDraftIds] = useState<string[]>([])
  const [catalogSupplierIds, setCatalogSupplierIds] = useState<Record<string, string[]>>(() => initialCatalogSupplierIds(suppliers))
  const [showInactive, setShowInactive] = useState(false)
  const [reviewFilter, setReviewFilter] = useState<CatalogReviewFilter>("all")
  const [itemColumnWidth, setItemColumnWidth] = useState(280)
  const [priceColumnWidth, setPriceColumnWidth] = useState(88)
  const [editor, setEditor] = useState<EditorDraft | null>(null)
  const [priceEditor, setPriceEditor] = useState<{ item: MaterialCatalogItem; supplier: CatalogSupplier } | null>(null)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()
  const initialPriceMap = useMemo(() => new Map(initialPrices.map((price) => [cellKey(price.item_id, price.supplier_id), price])), [initialPrices])
  const [priceDrafts, setPriceDrafts] = useState<Record<string, PriceDraft>>(() => Object.fromEntries(initialPrices.map((price) => [cellKey(price.item_id, price.supplier_id), {
    unitPrice: price.unit_price === null ? "" : String(price.unit_price),
    availability: price.availability,
    supplierSku: price.supplier_sku,
    productUrl: price.product_url ?? "",
    deliveryPrice: price.delivery_price === null ? "" : String(price.delivery_price),
    minimumOrder: String(price.minimum_order),
    priceType: price.price_type,
    verificationStatus: price.verification_status,
    notes: price.notes,
  }])))

  const categories = useMemo(() => materialCatalogDepartmentOptions(departments, initialItems.map((item) => item.category)), [departments, initialItems])
  const categoryItems = useMemo(() => initialItems.filter((item) => {
    if (item.category !== selectedCategory) return false
    if (!showInactive && item.status === "inactive") return false
    if (!catalogItemMatchesReview(item, initialPrices, reviewFilter)) return false
    const needle = itemSearch.trim().toLowerCase()
    return !needle || `${item.item_code} ${item.name} ${item.description} ${item.measurement} ${item.thickness} ${item.unit}`.toLowerCase().includes(needle)
  }), [initialItems, initialPrices, itemSearch, reviewFilter, selectedCategory, showInactive])
  const categoryQuality = useMemo(() => {
    const items = initialItems.filter((item) => item.category === selectedCategory && item.status === "active")
    return {
      total: items.length,
      missingPrice: items.filter((item) => catalogItemMatchesReview(item, initialPrices, "missing_price")).length,
      stale: items.filter((item) => catalogItemMatchesReview(item, initialPrices, "stale")).length,
      needsReview: items.filter((item) => catalogItemMatchesReview(item, initialPrices, "needs_review")).length,
      ready: items.filter((item) => catalogItemMatchesReview(item, initialPrices, "ready")).length,
    }
  }, [initialItems, initialPrices, selectedCategory])
  const eligibleCatalogSupplierPool = useMemo(() => suppliers.filter((supplier) => (
    hasRoutableSupplierTrust(supplier.trustLevel) && supplierServesMaterialDepartment(supplier, selectedCategory)
  )), [selectedCategory, suppliers])
  const departmentSupplierPool = useMemo(() => suppliers.filter((supplier) => (
    hasRoutableSupplierTrust(supplier.trustLevel) && supplierServesMaterialDepartment(supplier, catalogSupplierDepartment)
  )), [catalogSupplierDepartment, suppliers])
  const visibleSuppliers = useMemo(() => {
    const needle = supplierSearch.trim().toLowerCase()
    return eligibleCatalogSupplierPool.filter((supplier) => {
      if (!(catalogSupplierIds[selectedCategory] ?? []).includes(supplier.id)) return false
      const materials = Array.isArray(supplier.materials) ? supplier.materials.join(" ") : supplier.materials ?? ""
      return !needle || `${supplier.name} ${supplier.email ?? ""} ${supplier.phone ?? ""} ${materials}`.toLowerCase().includes(needle)
    })
  }, [catalogSupplierIds, eligibleCatalogSupplierPool, selectedCategory, supplierSearch])
  const eligibleCatalogSuppliers = useMemo(() => {
    const needle = catalogSupplierSearch.trim().toLowerCase()
    return departmentSupplierPool.filter((supplier) => {
      const materials = Array.isArray(supplier.materials) ? supplier.materials.join(" ") : supplier.materials ?? ""
      return !needle || `${supplier.name} ${supplier.email ?? ""} ${supplier.phone ?? ""} ${materials}`.toLowerCase().includes(needle)
    })
  }, [catalogSupplierSearch, departmentSupplierPool])
  const savedCatalogSupplierIds = useMemo(() => (
    (catalogSupplierIds[catalogSupplierDepartment] ?? []).filter((id) => departmentSupplierPool.some((supplier) => supplier.id === id))
  ), [catalogSupplierDepartment, catalogSupplierIds, departmentSupplierPool])
  const catalogSupplierSelectionChanged = useMemo(() => (
    [...catalogSupplierDraftIds].sort().join("|") !== [...savedCatalogSupplierIds].sort().join("|")
  ), [catalogSupplierDraftIds, savedCatalogSupplierIds])
  const mobileSupplier = visibleSuppliers.find((supplier) => supplier.id === mobileSupplierId)
    ?? visibleSuppliers.find((supplier) => supplier.id === "home-depot-retail-catalog")
    ?? visibleSuppliers[0]
    ?? null

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const itemWidth = Number(window.localStorage.getItem("avantia-catalog-item-column-width"))
        const priceWidth = Number(window.localStorage.getItem("avantia-catalog-price-column-width"))
        if (itemWidth >= 220 && itemWidth <= 520) setItemColumnWidth(itemWidth)
        if (priceWidth >= 76 && priceWidth <= 220) setPriceColumnWidth(priceWidth)
      } catch {
        // Browser storage is optional; the catalog still uses stable defaults.
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  function updateItemColumnWidth(width: number) {
    setItemColumnWidth(width)
    try { window.localStorage.setItem("avantia-catalog-item-column-width", String(width)) } catch {
      // Browser storage is optional.
    }
  }

  function updatePriceColumnWidth(width: number) {
    setPriceColumnWidth(width)
    try { window.localStorage.setItem("avantia-catalog-price-column-width", String(width)) } catch {
      // Browser storage is optional.
    }
  }

  function moveMobileSupplier(direction: -1 | 1) {
    if (!mobileSupplier || visibleSuppliers.length < 2) return
    const currentIndex = visibleSuppliers.findIndex((supplier) => supplier.id === mobileSupplier.id)
    const nextIndex = (currentIndex + direction + visibleSuppliers.length) % visibleSuppliers.length
    setMobileSupplierId(visibleSuppliers[nextIndex].id)
  }

  function openCatalogSuppliers() {
    if (dirtyKeys.size) {
      setError("Save price changes before changing supplier columns.")
      return
    }
    const eligibleIds = new Set(eligibleCatalogSupplierPool.map((supplier) => supplier.id))
    setCatalogSupplierDepartment(selectedCategory)
    setCatalogSupplierDraftIds((catalogSupplierIds[selectedCategory] ?? []).filter((id) => eligibleIds.has(id)))
    setCatalogSupplierSearch("")
    setCatalogSupplierOpen(true)
    setError("")
  }

  function toggleCatalogSupplier(supplierId: string) {
    setCatalogSupplierDraftIds((current) => current.includes(supplierId) ? current.filter((id) => id !== supplierId) : [...current, supplierId])
  }

  function changeCatalogSupplierDepartment(department: string) {
    if (department === catalogSupplierDepartment || catalogSupplierSelectionChanged) return
    const eligibleIds = new Set(suppliers
      .filter((supplier) => hasRoutableSupplierTrust(supplier.trustLevel) && supplierServesMaterialDepartment(supplier, department))
      .map((supplier) => supplier.id))
    setCatalogSupplierDepartment(department)
    setCatalogSupplierDraftIds((catalogSupplierIds[department] ?? []).filter((id) => eligibleIds.has(id)))
    setCatalogSupplierSearch("")
  }

  function saveCatalogSuppliers() {
    startTransition(async () => {
      const result = await saveCatalogDepartmentSuppliersAction({ department: catalogSupplierDepartment, supplierIds: catalogSupplierDraftIds })
      if (!result.ok) return setError(result.error)
      setCatalogSupplierIds((current) => ({ ...current, [catalogSupplierDepartment]: result.data.supplierIds }))
      setSelectedCategory(catalogSupplierDepartment)
      setMobileSupplierId("")
      setCatalogSupplierOpen(false)
      setNotice(result.message)
      setError("")
      router.refresh()
    })
  }

  function hideSupplier(supplier: CatalogSupplier) {
    if (dirtyKeys.size) {
      setError("Save price changes before hiding a supplier column.")
      return
    }
    if (!window.confirm(`Hide ${supplier.name} from ${selectedCategory}? You can restore it with Add supplier.`)) return
    const supplierIds = (catalogSupplierIds[selectedCategory] ?? []).filter((id) => id !== supplier.id)
    startTransition(async () => {
      const result = await saveCatalogDepartmentSuppliersAction({ department: selectedCategory, supplierIds })
      if (!result.ok) return setError(result.error)
      setCatalogSupplierIds((current) => ({ ...current, [selectedCategory]: result.data.supplierIds }))
      setMobileSupplierId("")
      setNotice(`${supplier.name} hidden from ${selectedCategory}.`)
      setError("")
      router.refresh()
    })
  }

  function draftFor(itemId: string, supplierId: string): PriceDraft {
    const key = cellKey(itemId, supplierId)
    return priceDrafts[key] ?? { unitPrice: "", availability: "unknown", supplierSku: "", productUrl: "", deliveryPrice: "", minimumOrder: "1", priceType: "supplier_quote", verificationStatus: "unverified", notes: "" }
  }

  function updatePrice(itemId: string, supplierId: string, patch: Partial<PriceDraft>) {
    const key = cellKey(itemId, supplierId)
    setPriceDrafts((current) => ({ ...current, [key]: { ...draftFor(itemId, supplierId), ...patch } }))
    setDirtyKeys((current) => new Set(current).add(key))
    setNotice("")
    setError("")
  }

  function setExactProductLink(item: MaterialCatalogItem, supplier: CatalogSupplier) {
    const current = draftFor(item.id, supplier.id).productUrl
    const value = window.prompt(`Paste the exact ${supplier.name} product-page URL for ${item.name}. Leave blank to remove it.`, current)
    if (value === null) return
    const productUrl = value.trim()
    if (productUrl) {
      try {
        const url = new URL(productUrl)
        const hostname = url.hostname.toLowerCase().replace(/^www\./, "")
        const hasProductId = /\/\d+\/?$/.test(url.pathname)
        const valid = url.protocol === "https:" && (
          (supplier.id === "lowes-retail-catalog" && hostname === "lowes.com" && url.pathname.startsWith("/pd/") && hasProductId)
          || (supplier.id === "home-depot-retail-catalog" && hostname === "homedepot.com" && url.pathname.startsWith("/p/") && hasProductId)
        )
        if (!valid) return setError(`Paste an exact ${supplier.name} product page, not a search or category page.`)
      } catch {
        return setError("Enter a complete HTTPS product-page URL.")
      }
    }
    updatePrice(item.id, supplier.id, { productUrl })
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
        productUrl: draft.productUrl,
        deliveryPrice: draft.deliveryPrice.trim() === "" ? null : Number(draft.deliveryPrice),
        minimumOrder: Number(draft.minimumOrder || 1),
        priceType: draft.priceType,
        verificationStatus: draft.verificationStatus,
        notes: draft.notes,
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
        measurement: editor.measurement,
        thickness: editor.thickness,
        brand: editor.brand,
        manufacturerModelNumber: editor.manufacturerModelNumber,
        upc: editor.upc,
        packageQuantity: Number(editor.packageQuantity),
        packageUnit: editor.packageUnit,
        comparisonQuantity: Number(editor.comparisonQuantity),
        comparisonUnit: editor.comparisonUnit,
        reviewStatus: editor.reviewStatus,
        qualityNotes: editor.qualityNotes,
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
    if (!window.confirm(`Archive ${item.name}? It will be hidden, while its supplier prices and history stay saved.`)) return
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

  function prepareExaResult(result: import("@/lib/exa-catalog-search").ExaCatalogSearchResult) {
    const draft = emptyEditor(selectedCategory)
    setEditor({
      ...draft,
      name: result.title,
      description: result.snippet,
      imageUrl: result.imageUrl ?? "",
      qualityNotes: `Found by Exa at ${result.url}. Verify the exact product, price, and availability before saving.`,
    })
    setNotice("Review the Exa result, then save it as a catalog item. Supplier pricing must be verified separately.")
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-3 pb-24 pt-4 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[100rem]">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0066cc]">Manager catalog</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Materials & supplier pricing</h1>
            <p className="mt-1 text-sm text-slate-600">Edit one category at a time. Only suppliers you add become price columns.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold hover:border-sky-400">
              <FileUp className="h-4 w-4" />Import PDF<input type="file" accept="application/pdf,.pdf" className="sr-only" disabled={pending} onChange={(event) => { importPdf(event.target.files?.[0] ?? null); event.currentTarget.value = "" }} />
            </label>
            <button type="button" onClick={openCatalogSuppliers} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold hover:border-sky-400"><Store className="h-4 w-4" />Add supplier</button>
            <button type="button" onClick={() => setEditor(emptyEditor(selectedCategory))} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Add item</button>
          </div>
        </header>

        <ExaCatalogResearch department={selectedCategory} onUseResult={prepareExaResult} />

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
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>{categoryItems.length} item{categoryItems.length === 1 ? "" : "s"} · {visibleSuppliers.length} supplier column{visibleSuppliers.length === 1 ? "" : "s"}</span>
            <div className="hidden items-center gap-4 md:flex" aria-label="Catalog column sizes">
              <label className="flex items-center gap-2 font-semibold text-slate-600">Item <input aria-label="Item column width" type="range" min="220" max="520" step="20" value={itemColumnWidth} onChange={(event) => updateItemColumnWidth(Number(event.target.value))} className="w-24 accent-[#0071e3]" /></label>
              <label className="flex items-center gap-2 font-semibold text-slate-600">Price <input aria-label="Price column width" type="range" min="76" max="220" step="12" value={priceColumnWidth} onChange={(event) => updatePriceColumnWidth(Number(event.target.value))} className="w-24 accent-[#0071e3]" /></label>
            </div>
            <span>Retail pricing location: ZIP 11516</span>
          </div>
          <div className="mt-3 flex gap-1.5 overflow-x-auto border-t border-slate-100 pt-3" aria-label="Catalog review queue">
            {([
              ["all", "All", categoryQuality.total],
              ["missing_price", "Missing price", categoryQuality.missingPrice],
              ["stale", "Stale", categoryQuality.stale],
              ["needs_review", "Needs review", categoryQuality.needsReview],
              ["ready", "Ready", categoryQuality.ready],
            ] as Array<[CatalogReviewFilter, string, number]>).map(([value, label, count]) => <button key={value} type="button" onClick={() => setReviewFilter(value)} className={`min-h-8 shrink-0 rounded-md border px-2.5 text-[11px] font-bold ${reviewFilter === value ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{label} <span className="ml-1 opacity-70">{count}</span></button>)}
          </div>
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
            {mobileSupplier && !isRetailCatalogSupplier(mobileSupplier) ? <p className="mt-2 text-xs text-slate-500">{mobileSupplier.email || mobileSupplier.phone || "Contact not set"} · {visibleSuppliers.findIndex((supplier) => supplier.id === mobileSupplier.id) + 1} of {visibleSuppliers.length}</p> : null}
            {mobileSupplier ? <button type="button" onClick={() => hideSupplier(mobileSupplier)} disabled={pending} className="mt-2 inline-flex min-h-8 items-center gap-1.5 text-xs font-bold text-slate-600 disabled:opacity-40"><EyeOff className="h-3.5 w-3.5" />Hide from {selectedCategory}</button> : null}
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
                  <div className="min-w-0 flex-1"><p className="text-sm font-bold leading-4 text-slate-950">{item.name}</p>{item.measurement || item.thickness ? <p className="mt-1 text-[11px] font-semibold text-slate-600">{[item.measurement, item.thickness].filter(Boolean).join(" · ")}</p> : null}<p className="mt-1 text-[10px] text-slate-500">{item.item_code} · price per {item.unit}{item.status === "inactive" ? " · inactive" : ""}</p>{catalogItemIssues(item, initialPrices).length ? <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700" title={catalogItemIssues(item, initialPrices).join("; ")}><AlertTriangle className="h-3 w-3" />{catalogItemIssues(item, initialPrices).length} review</p> : <p className="mt-1 text-[10px] font-bold text-emerald-700">Ready</p>}</div>
                  <button type="button" onClick={() => setEditor(itemEditor(item))} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-sky-50 hover:text-[#0066cc]" aria-label={`Edit ${item.name}`}><Pencil className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => deleteItem(item)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-700" aria-label={`Archive ${item.name}`}><Archive className="h-3.5 w-3.5" /></button>
                </div>
                {supplier && draft ? <div className="border-t border-slate-100 px-3 py-2.5">
                  {isRetailCatalogSupplier(supplier) ? <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-slate-400">$</span><input aria-label={`${supplier.name} unit price for ${item.name}`} inputMode="decimal" value={draft.unitPrice} onChange={(event) => updatePrice(item.id, supplier.id, { unitPrice: event.target.value.replace(/[^0-9.]/g, "") })} placeholder="Price" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-6 pr-2 text-sm tabular-nums" /></div>
                    {draft.productUrl ? <a href={draft.productUrl} target="_blank" rel="noreferrer" aria-label={`Open exact ${item.name} at ${supplier.name}`} title={`Open exact ${item.name} at ${supplier.name}`} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-[#0066cc]"><ExternalLink className="h-4 w-4" /></a> : <button type="button" onClick={() => setExactProductLink(item, supplier)} aria-label={`Add exact ${supplier.name} product link for ${item.name}`} title={`Add exact ${supplier.name} product link for ${item.name}`} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-amber-800"><ExternalLink className="h-4 w-4" /></button>}
                  </div> : <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-2">
                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-slate-400">$</span><input aria-label={`${supplier.name} unit price for ${item.name}`} inputMode="decimal" value={draft.unitPrice} onChange={(event) => updatePrice(item.id, supplier.id, { unitPrice: event.target.value.replace(/[^0-9.]/g, "") })} placeholder="Unit price" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-6 pr-3 text-sm tabular-nums" /></div>
                    <div className="flex gap-1"><select aria-label={`${supplier.name} availability for ${item.name}`} value={draft.availability} onChange={(event) => updatePrice(item.id, supplier.id, { availability: event.target.value as PriceDraft["availability"] })} className={`h-10 min-w-0 flex-1 rounded-lg border px-2 text-xs font-semibold ${draft.availability === "not_available" ? "border-rose-200 bg-rose-50 text-rose-700" : draft.availability === "available" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}><option value="unknown">Unknown</option><option value="available">Available</option><option value="not_available">N/A</option></select>{saved || dirtyKeys.has(key) ? <span className={`inline-flex h-10 w-8 shrink-0 items-center justify-center rounded-lg ${dirtyKeys.has(key) ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"}`} title={dirtyKeys.has(key) ? "Unsaved change" : "Saved"}>{dirtyKeys.has(key) ? <Pencil className="h-3 w-3" /> : <Check className="h-3 w-3" />}</span> : null}</div>
                  </div>}
                  {saved ? <button type="button" onClick={() => setPriceEditor({ item, supplier })} className={`mt-1 text-left text-[10px] font-bold ${isPriceStale(saved) || saved.verification_status === "possible_match" || saved.verification_status === "unverified" ? "text-amber-700" : "text-emerald-700"}`}>{priceVerificationLabel(saved)}{priceCheckedDateLabel(saved) ? ` · ${priceCheckedDateLabel(saved)}` : ""}{normalizedComparisonPrice(item, saved) !== null ? ` · $${normalizedComparisonPrice(item, saved)!.toFixed(2)}/${item.comparison_unit}` : ""}</button> : <button type="button" onClick={() => setPriceEditor({ item, supplier })} className="mt-1 text-[10px] font-bold text-[#0066cc]">Price details</button>}
                </div> : null}
              </article>
            })}
          </div>
          {!categoryItems.length ? <div className="grid min-h-48 place-items-center p-8 text-center"><div><PackagePlus className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-bold">No matching items</p><button type="button" onClick={() => setEditor(emptyEditor(selectedCategory))} className="mt-2 text-sm font-semibold text-[#0066cc]">Add the first item</button></div></div> : null}
        </section>

        <section className="mt-3 hidden max-w-full overflow-auto overscroll-x-contain rounded-lg border border-slate-300 bg-white shadow-sm md:block" aria-label={`${selectedCategory} supplier pricing matrix`}>
          {!visibleSuppliers.length ? <div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 bg-sky-50 px-3 py-2 text-sm"><span className="font-semibold text-slate-700">No supplier added to {selectedCategory}.</span><button type="button" onClick={openCatalogSuppliers} className="shrink-0 font-bold text-[#0066cc]">Add supplier</button></div> : null}
          <table className="border-collapse text-left text-xs" style={{ minWidth: `${itemColumnWidth + visibleSuppliers.length * priceColumnWidth}px` }}>
            <thead className="sticky top-0 z-30 bg-slate-100">
              <tr>
                <th style={{ width: itemColumnWidth, minWidth: itemColumnWidth }} className="sticky left-0 z-40 border-b border-r border-slate-300 bg-slate-100 px-3 py-2 font-bold">Item</th>
                {visibleSuppliers.map((supplier) => <th key={supplier.id} style={{ width: priceColumnWidth, minWidth: priceColumnWidth }} className="border-b border-r border-slate-300 px-1.5 py-2 align-top"><div className="flex items-start gap-1"><span className="min-w-0 flex-1 truncate font-bold" title={supplier.name}>{supplier.name}</span><button type="button" onClick={() => hideSupplier(supplier)} disabled={pending} className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-white hover:text-slate-800 disabled:opacity-30" title={`Hide ${supplier.name} from ${selectedCategory}`} aria-label={`Hide ${supplier.name} from ${selectedCategory}`}><EyeOff className="h-3 w-3" /></button></div>{!isRetailCatalogSupplier(supplier) ? <span className="mt-0.5 block truncate text-[9px] font-normal text-slate-500">{supplier.email || supplier.phone || "Contact not set"}</span> : null}</th>)}
              </tr>
            </thead>
            <tbody>
              {categoryItems.map((item) => <tr key={item.id} className="group even:bg-slate-50/60">
                <td style={{ width: itemColumnWidth, minWidth: itemColumnWidth }} className="sticky left-0 z-20 border-b border-r border-slate-200 bg-white px-3 py-2 group-even:bg-[#fafafa]">
                  <div className="flex items-center gap-2">
                    {item.image_url ? <button type="button" onClick={() => setEditor(itemEditor(item))} className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white"><Image src={item.image_url} alt="" fill sizes="36px" className="object-contain" /></button> : <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400"><ImageIcon className="h-4 w-4" /></span>}
                    <div className="min-w-0 flex-1"><p className="font-bold leading-4 text-slate-950">{item.name}</p>{item.measurement || item.thickness ? <p className="mt-0.5 text-[10px] font-semibold text-slate-600">{[item.measurement, item.thickness].filter(Boolean).join(" · ")}</p> : null}<p className="mt-0.5 text-[10px] text-slate-500">{item.item_code} · price per {item.unit}{item.status === "inactive" ? " · inactive" : ""}</p>{catalogItemIssues(item, initialPrices).length ? <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-amber-700" title={catalogItemIssues(item, initialPrices).join("; ")}><AlertTriangle className="h-3 w-3" />Review</span> : <span className="mt-1 block text-[9px] font-bold text-emerald-700">Ready</span>}</div>
                    <button type="button" onClick={() => setEditor(itemEditor(item))} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-sky-50 hover:text-[#0066cc]" aria-label={`Edit ${item.name}`}><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => deleteItem(item)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-700" aria-label={`Archive ${item.name}`}><Archive className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
                {visibleSuppliers.map((supplier) => {
                  const key = cellKey(item.id, supplier.id)
                  const draft = draftFor(item.id, supplier.id)
                  const saved = initialPriceMap.get(key)
                  return <td key={supplier.id} style={{ width: priceColumnWidth, minWidth: priceColumnWidth }} className={`border-b border-r border-slate-200 p-1 align-top ${dirtyKeys.has(key) ? "bg-amber-50" : ""}`}>
                    {isRetailCatalogSupplier(supplier) ? <div className="flex items-center gap-1">
                      <div className="relative min-w-0 flex-1"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 font-semibold text-slate-400">$</span><input aria-label={`${supplier.name} unit price for ${item.name}`} inputMode="decimal" value={draft.unitPrice} onChange={(event) => updatePrice(item.id, supplier.id, { unitPrice: event.target.value.replace(/[^0-9.]/g, "") })} placeholder="Price" className="h-7 w-full rounded-md border border-slate-300 bg-white pl-4 pr-1 text-[11px] tabular-nums" /></div>
                      {draft.productUrl ? <a href={draft.productUrl} target="_blank" rel="noreferrer" aria-label={`Open exact ${item.name} at ${supplier.name}`} title={`Open exact ${item.name} at ${supplier.name}`} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-[#0066cc]"><ExternalLink className="h-3 w-3" /></a> : <button type="button" onClick={() => setExactProductLink(item, supplier)} aria-label={`Add exact ${supplier.name} product link for ${item.name}`} title={`Add exact ${supplier.name} product link for ${item.name}`} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-amber-300 bg-amber-50 text-amber-800"><ExternalLink className="h-3 w-3" /></button>}
                    </div> : <><div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 font-semibold text-slate-400">$</span><input aria-label={`${supplier.name} unit price for ${item.name}`} inputMode="decimal" value={draft.unitPrice} onChange={(event) => updatePrice(item.id, supplier.id, { unitPrice: event.target.value.replace(/[^0-9.]/g, "") })} placeholder="Price" className="h-8 w-full rounded-md border border-slate-300 bg-white pl-5 pr-2 text-xs tabular-nums" /></div>
                    <div className="mt-1 flex gap-1">
                      <select aria-label={`${supplier.name} availability for ${item.name}`} value={draft.availability} onChange={(event) => updatePrice(item.id, supplier.id, { availability: event.target.value as PriceDraft["availability"] })} className={`h-7 min-w-0 flex-1 rounded-md border px-1 text-[10px] font-semibold ${draft.availability === "not_available" ? "border-rose-200 bg-rose-50 text-rose-700" : draft.availability === "available" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}><option value="unknown">Unknown</option><option value="available">Available</option><option value="not_available">N/A</option></select>
                      {saved || dirtyKeys.has(key) ? <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${dirtyKeys.has(key) ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"}`} title={dirtyKeys.has(key) ? "Unsaved change" : "Saved"}>{dirtyKeys.has(key) ? <Pencil className="h-3 w-3" /> : <Check className="h-3 w-3" />}</span> : null}
                    </div></>}
                    {saved ? <button type="button" onClick={() => setPriceEditor({ item, supplier })} className={`mt-1 block max-w-full truncate text-left text-[9px] font-bold ${isPriceStale(saved) || saved.verification_status === "possible_match" || saved.verification_status === "unverified" ? "text-amber-700" : "text-emerald-700"}`} title={`${priceVerificationLabel(saved)}${priceCheckedDateLabel(saved) ? ` · ${priceCheckedDateLabel(saved)}` : ""}`}>{priceVerificationLabel(saved)}{priceCheckedDateLabel(saved) ? ` · ${priceCheckedDateLabel(saved)}` : ""}{normalizedComparisonPrice(item, saved) !== null ? ` · $${normalizedComparisonPrice(item, saved)!.toFixed(2)}` : ""}</button> : <button type="button" onClick={() => setPriceEditor({ item, supplier })} className="mt-1 text-[9px] font-bold text-[#0066cc]">Details</button>}
                  </td>
                })}
              </tr>)}
            </tbody>
          </table>
          {!categoryItems.length ? <div className="grid min-h-48 place-items-center p-8 text-center"><div><PackagePlus className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-bold">No matching items</p><button type="button" onClick={() => setEditor(emptyEditor(selectedCategory))} className="mt-2 text-sm font-semibold text-[#0066cc]">Add the first item</button></div></div> : null}
        </section>
      </div>

      {catalogSupplierOpen && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[155] grid place-items-center overflow-y-auto bg-slate-950/50 p-3" role="dialog" aria-modal="true" aria-labelledby="catalog-supplier-title" onMouseDown={(event) => { if (event.currentTarget === event.target && !pending) setCatalogSupplierOpen(false) }}>
        <section className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl">
          <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0066cc]">{catalogSupplierDepartment}</p><h2 id="catalog-supplier-title" className="mt-0.5 text-lg font-bold">Catalog suppliers</h2><p className="mt-1 text-xs text-slate-500">Suppliers are filtered by the departments selected in Supplier Settings.</p></div><button type="button" onClick={() => setCatalogSupplierOpen(false)} disabled={pending} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200" aria-label="Close"><X className="h-4 w-4" /></button></header>
          <div className="p-4">
            <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1" aria-label="Filter suppliers by department">
              {categories.map((category) => <button key={category} type="button" onClick={() => changeCatalogSupplierDepartment(category)} disabled={pending || (catalogSupplierSelectionChanged && category !== catalogSupplierDepartment)} className={`min-h-9 shrink-0 rounded-lg border px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 ${category === catalogSupplierDepartment ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-sky-400"}`}>{category}</button>)}
            </div>
            <label className="relative block"><span className="sr-only">Search available suppliers</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={catalogSupplierSearch} onChange={(event) => setCatalogSupplierSearch(event.target.value)} placeholder="Search supplier" className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm" /></label>
            <div className="mt-3 max-h-[50dvh] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
              {eligibleCatalogSuppliers.map((supplier) => <label key={supplier.id} className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50"><input type="checkbox" checked={catalogSupplierDraftIds.includes(supplier.id)} onChange={() => toggleCatalogSupplier(supplier.id)} className="h-4 w-4 rounded border-slate-300 accent-[#0071e3]" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-950">{supplier.name}</span><span className="block truncate text-xs text-slate-500">{supplier.email || supplier.phone || "Contact not set"}</span></span></label>)}
              {!eligibleCatalogSuppliers.length ? <div className="px-4 py-8 text-center"><p className="text-sm font-semibold text-slate-700">No eligible suppliers for {catalogSupplierDepartment}.</p><p className="mt-1 text-xs text-slate-500">Assign this department and an approved trust level in Supplier Settings first.</p></div> : null}
            </div>
            <Link href="/admin/vendors" className="mt-3 inline-flex text-sm font-semibold text-[#0066cc]">Create or edit a supplier in Supplier Directory</Link>
          </div>
          <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3"><span className="text-xs font-semibold text-slate-500">{catalogSupplierDraftIds.length} selected{catalogSupplierSelectionChanged ? " · Save before changing department" : ""}</span><div className="flex gap-2"><button type="button" onClick={() => setCatalogSupplierOpen(false)} disabled={pending} className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold">Cancel</button><button type="button" onClick={saveCatalogSuppliers} disabled={pending} className="min-h-10 rounded-lg bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-40">{pending ? "Saving..." : "Save suppliers"}</button></div></footer>
        </section>
      </div>, document.body) : null}

      {editor && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[150] grid place-items-center overflow-y-auto bg-slate-950/50 p-3" role="dialog" aria-modal="true" aria-labelledby="catalog-item-editor-title" onMouseDown={(event) => { if (event.currentTarget === event.target && !pending) setEditor(null) }}>
        <section className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0066cc]">Catalog item</p><h2 id="catalog-item-editor-title" className="mt-0.5 text-lg font-bold">{editor.id ? "Edit material" : "Add material"}</h2></div><button type="button" onClick={() => setEditor(null)} disabled={pending} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200" aria-label="Close"><X className="h-4 w-4" /></button></header>
          <div className="grid overflow-y-auto gap-3 p-4 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-bold">Category<select value={editor.category} onChange={(event) => setEditor({ ...editor, category: event.target.value })} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal">{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-bold">Item code<input value={editor.itemCode} onChange={(event) => setEditor({ ...editor, itemCode: event.target.value })} className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal uppercase" /></label>
            <label className="grid gap-1 text-xs font-bold sm:col-span-2">Material name<input value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} autoFocus className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
            <label className="grid gap-1 text-xs font-bold">Measurement / size <span className="font-normal text-slate-400">optional</span><input value={editor.measurement} onChange={(event) => setEditor({ ...editor, measurement: event.target.value })} placeholder="Example: 4 x 8 ft." className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
            <label className="grid gap-1 text-xs font-bold">Thickness / gauge <span className="font-normal text-slate-400">optional</span><input value={editor.thickness} onChange={(event) => setEditor({ ...editor, thickness: event.target.value })} placeholder="Example: 5/8 in. or 12/2" className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
            <label className="grid gap-1 text-xs font-bold">Brand <span className="font-normal text-slate-400">optional</span><input value={editor.brand} onChange={(event) => setEditor({ ...editor, brand: event.target.value })} placeholder="Example: GAF" className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
            <label className="grid gap-1 text-xs font-bold">Manufacturer model <span className="font-normal text-slate-400">optional</span><input value={editor.manufacturerModelNumber} onChange={(event) => setEditor({ ...editor, manufacturerModelNumber: event.target.value })} placeholder="Exact model number" className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
            <label className="grid gap-1 text-xs font-bold sm:col-span-2">UPC <span className="font-normal text-slate-400">optional</span><input value={editor.upc} inputMode="numeric" onChange={(event) => setEditor({ ...editor, upc: event.target.value.replace(/[^0-9]/g, "") })} placeholder="Barcode number" className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
            <label className="grid gap-1 text-xs font-bold">Unit<select value={editor.unit} onChange={(event) => setEditor({ ...editor, unit: event.target.value })} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal">{unitOptions.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-bold">Package quantity<input inputMode="decimal" value={editor.packageQuantity} onChange={(event) => setEditor({ ...editor, packageQuantity: event.target.value.replace(/[^0-9.]/g, "") })} className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
            <label className="grid gap-1 text-xs font-bold">Package unit<select value={editor.packageUnit} onChange={(event) => setEditor({ ...editor, packageUnit: event.target.value })} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal">{unitOptions.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-bold">Compare quantity<input inputMode="decimal" value={editor.comparisonQuantity} onChange={(event) => setEditor({ ...editor, comparisonQuantity: event.target.value.replace(/[^0-9.]/g, "") })} className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
            <label className="grid gap-1 text-xs font-bold">Compare unit<select value={editor.comparisonUnit} onChange={(event) => setEditor({ ...editor, comparisonUnit: event.target.value })} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal">{unitOptions.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-bold">Catalog confidence<select value={editor.reviewStatus} onChange={(event) => setEditor({ ...editor, reviewStatus: event.target.value as EditorDraft["reviewStatus"] })} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal"><option value="needs_review">Needs review</option><option value="ambiguous">Ambiguous</option><option value="ready">Ready</option><option value="discontinued">Discontinued</option></select></label>
            <label className="grid gap-1 text-xs font-bold sm:col-span-2">Description <span className="font-normal text-slate-400">optional</span><textarea value={editor.description} onChange={(event) => setEditor({ ...editor, description: event.target.value })} rows={2} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="grid gap-1 text-xs font-bold sm:col-span-2">Quality notes <span className="font-normal text-slate-400">optional</span><textarea value={editor.qualityNotes} onChange={(event) => setEditor({ ...editor, qualityNotes: event.target.value })} placeholder="Why this exact product was selected or what still needs checking" rows={2} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="grid gap-1 text-xs font-bold sm:col-span-2">Small product image URL <span className="font-normal text-slate-400">optional</span><input value={editor.imageUrl} onChange={(event) => setEditor({ ...editor, imageUrl: event.target.value })} placeholder="/images/materials/..." className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
            <label className="grid gap-1 text-xs font-bold">Status<select value={editor.status} onChange={(event) => setEditor({ ...editor, status: event.target.value as EditorDraft["status"] })} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal"><option value="active">Active</option><option value="inactive">Inactive / hidden</option></select></label>
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3"><button type="button" onClick={() => setEditor(null)} disabled={pending} className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold">Cancel</button><button type="button" onClick={saveItem} disabled={pending || !editor.name.trim() || !editor.itemCode.trim() || !Number(editor.packageQuantity) || !Number(editor.comparisonQuantity)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-40"><Save className="h-4 w-4" />{pending ? "Saving..." : "Save item"}</button></footer>
        </section>
      </div>, document.body) : null}

      {priceEditor && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[160] grid place-items-center bg-slate-950/50 p-3" role="dialog" aria-modal="true" aria-labelledby="price-editor-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setPriceEditor(null) }}>
        <section className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-2xl">
          <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0066cc]">Price details</p><h2 id="price-editor-title" className="mt-0.5 text-base font-bold">{priceEditor.item.name}</h2><p className="text-xs text-slate-500">{priceEditor.supplier.name}</p></div><button type="button" onClick={() => setPriceEditor(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200" aria-label="Close"><X className="h-4 w-4" /></button></header>
          {(() => {
            const draft = draftFor(priceEditor.item.id, priceEditor.supplier.id)
            return <div className="grid gap-3 p-4 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-bold">Delivery charge<input inputMode="decimal" value={draft.deliveryPrice} onChange={(event) => updatePrice(priceEditor.item.id, priceEditor.supplier.id, { deliveryPrice: event.target.value.replace(/[^0-9.]/g, "") })} placeholder="0.00" className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
              <label className="grid gap-1 text-xs font-bold">Minimum order<input inputMode="decimal" value={draft.minimumOrder} onChange={(event) => updatePrice(priceEditor.item.id, priceEditor.supplier.id, { minimumOrder: event.target.value.replace(/[^0-9.]/g, "") })} className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
              <label className="grid gap-1 text-xs font-bold">Price source<select value={draft.priceType} disabled={isRetailCatalogSupplier(priceEditor.supplier)} onChange={(event) => updatePrice(priceEditor.item.id, priceEditor.supplier.id, { priceType: event.target.value as PriceDraft["priceType"] })} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal disabled:bg-slate-100"><option value="retail">Retail snapshot</option><option value="supplier_quote">Supplier quote</option><option value="contractor">Contractor price</option><option value="estimated">Estimated</option></select></label>
              <label className="grid gap-1 text-xs font-bold">Confidence<select value={draft.verificationStatus} disabled={isRetailCatalogSupplier(priceEditor.supplier)} onChange={(event) => updatePrice(priceEditor.item.id, priceEditor.supplier.id, { verificationStatus: event.target.value as PriceDraft["verificationStatus"] })} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal disabled:bg-slate-100"><option value="supplier_quote">Supplier quote</option><option value="recently_verified">Recently verified</option><option value="possible_match">Possible match</option><option value="unverified">Unverified</option><option value="stale">Stale</option><option value="unavailable">Unavailable</option></select></label>
              <label className="grid gap-1 text-xs font-bold sm:col-span-2">Supplier SKU<input value={draft.supplierSku} onChange={(event) => updatePrice(priceEditor.item.id, priceEditor.supplier.id, { supplierSku: event.target.value })} className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
              <label className="grid gap-1 text-xs font-bold sm:col-span-2">Notes<textarea value={draft.notes} onChange={(event) => updatePrice(priceEditor.item.id, priceEditor.supplier.id, { notes: event.target.value })} rows={2} placeholder="Quote number, pack size, pickup or delivery terms" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
              <p className="sm:col-span-2 text-xs text-slate-500">Prices are normalized to {priceEditor.item.comparison_quantity} {priceEditor.item.comparison_unit}. Save prices after closing this window.</p>
            </div>
          })()}
          <footer className="flex justify-end border-t border-slate-200 bg-slate-50 px-4 py-3"><button type="button" onClick={() => setPriceEditor(null)} className="min-h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white">Apply details</button></footer>
        </section>
      </div>, document.body) : null}
    </main>
  )
}
