"use server"

import { revalidatePath } from "next/cache"
import type { SupabaseClient } from "@supabase/supabase-js"

import { requireManagerPortalProfile, requireStaffProfile } from "@/lib/auth"
import {
  MATERIAL_CATALOG_CATEGORIES,
  hasRoutableSupplierTrust,
  normalizeMaterialCatalogDepartment,
  supplierIsAddedToCatalogDepartment,
  supplierServesMaterialDepartment,
  type CatalogSupplier,
} from "@/lib/material-catalog"
import { extractMaterialCatalogItemsFromPdf } from "@/lib/material-catalog-pdf"
import { detectSupplierMatch } from "@/lib/supplier-quote-supplier"

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true; message: string } | { ok: false; error: string }
  : { ok: true; data: T; message: string } | { ok: false; error: string }

type CatalogItemInput = {
  id?: string
  category: string
  itemCode: string
  name: string
  description?: string
  measurement?: string
  thickness?: string
  brand?: string
  manufacturerModelNumber?: string
  upc?: string
  adminNotes?: string
  packageQuantity: number
  packageUnit: string
  comparisonQuantity: number
  comparisonUnit: string
  reviewStatus: "ready" | "needs_review" | "ambiguous" | "discontinued"
  qualityNotes?: string
  defaultQuantity: number
  unit: string
  imageUrl?: string
  status: "active" | "inactive"
}

type CatalogPriceInput = {
  itemId: string
  supplierId: string
  unitPrice: number | null
  availability: "available" | "not_available" | "unknown"
  supplierSku?: string
  productUrl?: string
  notes?: string
  priceType?: "retail" | "supplier_quote" | "contractor" | "estimated"
  verificationStatus?: "verified_today" | "recently_verified" | "supplier_quote" | "stale" | "unavailable" | "possible_match" | "unverified"
  deliveryPrice?: number | null
  minimumOrder?: number
}

type CatalogSupplierMembershipInput = {
  department: string
  supplierIds: string[]
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const HOME_DEPOT_SNAPSHOT = {
  storeId: "1216",
  storeName: "Valley Stream",
  zipCode: "11516",
} as const
const LOWES_SNAPSHOT = {
  storeId: null,
  storeName: null,
  zipCode: "11516",
} as const

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max)
}

function importedSupplierId(name: string) {
  const slug = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120)
  return `pdf-${slug || "supplier"}-${crypto.randomUUID().slice(0, 8)}`
}

function quoteDateTime(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00.000Z` : null
}

function validRetailProductUrl(supplierId: string, value: string) {
  if (!value) return true
  try {
    const url = new URL(value)
    if (url.protocol !== "https:") return false
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "")
    const hasProductId = /\/\d+\/?$/.test(url.pathname)
    if (supplierId === "lowes-retail-catalog") return hostname === "lowes.com" && url.pathname.startsWith("/pd/") && hasProductId
    if (supplierId === "home-depot-retail-catalog") return hostname === "homedepot.com" && url.pathname.startsWith("/p/") && hasProductId
    return false
  } catch {
    return false
  }
}

async function validCategory(supabase: SupabaseClient, value: string) {
  if ((MATERIAL_CATALOG_CATEGORIES as readonly string[]).includes(value)) return true
  const [{ data: existing }, { data: settings }] = await Promise.all([
    supabase.from("material_catalog_items").select("id").eq("category", value).limit(1).maybeSingle<{ id: string }>(),
    supabase
      .from("workflow_manager_settings")
      .select("state")
      .eq("id", "singleton")
      .maybeSingle<{ state: { addOns?: { categories?: Array<{ label?: string }> } } }>(),
  ])
  return Boolean(existing) || (settings?.state?.addOns?.categories ?? []).some((category) => category.label?.trim() === value)
}

async function managerContext() {
  const session = await requireManagerPortalProfile()
  if (!session.supabase || !session.user) throw new Error("Manager sign-in is required.")
  return session
}

export async function saveMaterialCatalogItemAction(input: CatalogItemInput): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await managerContext()
  const category = clean(input.category, 100)
  const itemCode = clean(input.itemCode, 60).toUpperCase()
  const name = clean(input.name, 300)
  const quantity = Number(input.defaultQuantity)
  const packageQuantity = Number(input.packageQuantity)
  const comparisonQuantity = Number(input.comparisonQuantity)
  const unit = clean(input.unit, 40) || "each"
  if (!await validCategory(supabase, category)) return { ok: false, error: "Choose a catalog category." }
  if (!itemCode || !name) return { ok: false, error: "Item code and material name are required." }
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100_000_000) return { ok: false, error: "Enter a valid default quantity." }
  if (!Number.isFinite(packageQuantity) || packageQuantity <= 0 || packageQuantity > 100_000_000) return { ok: false, error: "Enter a valid package quantity." }
  if (!Number.isFinite(comparisonQuantity) || comparisonQuantity <= 0 || comparisonQuantity > 100_000_000) return { ok: false, error: "Enter a valid comparison quantity." }

  const record = {
    category,
    item_code: itemCode,
    name,
    description: clean(input.description, 2000),
    measurement: clean(input.measurement, 160),
    thickness: clean(input.thickness, 160),
    brand: clean(input.brand, 160),
    manufacturer_model_number: clean(input.manufacturerModelNumber, 160),
    upc: clean(input.upc, 80),
    admin_notes: clean(input.adminNotes, 4000),
    package_quantity: Math.round(packageQuantity * 10000) / 10000,
    package_unit: clean(input.packageUnit, 40) || unit,
    comparison_quantity: Math.round(comparisonQuantity * 10000) / 10000,
    comparison_unit: clean(input.comparisonUnit, 40) || unit,
    review_status: ["ready", "needs_review", "ambiguous", "discontinued"].includes(input.reviewStatus) ? input.reviewStatus : "needs_review",
    quality_notes: clean(input.qualityNotes, 1000),
    default_quantity: Math.round(quantity * 100) / 100,
    unit,
    image_url: clean(input.imageUrl, 1000) || null,
    status: input.status === "inactive" ? "inactive" : "active",
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }

  if (input.id) {
    if (!UUID_PATTERN.test(input.id)) return { ok: false, error: "This catalog item could not be identified." }
    const { data, error } = await supabase
      .from("material_catalog_items")
      .update(record)
      .eq("id", input.id)
      .select("id")
      .maybeSingle<{ id: string }>()
    if (error || !data) {
      if (error?.code === "23505") return { ok: false, error: "That item code or material name is already in this category." }
      return { ok: false, error: "The catalog item could not be saved." }
    }
    revalidatePath("/admin/catalog")
    return { ok: true, data, message: "Catalog item updated." }
  }

  const { data, error } = await supabase
    .from("material_catalog_items")
    .insert({ ...record, source: "manual", created_by: user.id })
    .select("id")
    .single<{ id: string }>()
  if (error || !data) {
    if (error?.code === "23505") return { ok: false, error: "That item code or material name already exists." }
    return { ok: false, error: "The catalog item could not be added." }
  }
  revalidatePath("/admin/catalog")
  return { ok: true, data, message: "Catalog item added." }
}

export async function deleteMaterialCatalogItemAction(itemId: string): Promise<ActionResult> {
  const { supabase, user } = await managerContext()
  if (!UUID_PATTERN.test(itemId)) return { ok: false, error: "This catalog item could not be identified." }
  const { error, count } = await supabase
    .from("material_catalog_items")
    .update({
      status: "inactive",
      review_status: "discontinued",
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, { count: "exact" })
    .eq("id", itemId)
  if (error || count !== 1) return { ok: false, error: "The item was not archived. Refresh and try again." }
  revalidatePath("/admin/catalog")
  return { ok: true, message: "Catalog item archived. Its pricing history was preserved." }
}

export async function saveMaterialCatalogPricesAction(inputs: CatalogPriceInput[]): Promise<ActionResult<{ saved: number }>> {
  const { supabase, user } = await managerContext()
  if (!Array.isArray(inputs) || inputs.length === 0) return { ok: false, error: "No supplier prices were changed." }
  if (inputs.length > 2000) return { ok: false, error: "Save no more than 2,000 price cells at one time." }

  const { data: supplierData, error: supplierError } = await supabase.rpc("staff_load_catalog_suppliers")
  const suppliers = Array.isArray(supplierData) ? supplierData as CatalogSupplier[] : []
  if (supplierError) return { ok: false, error: "The Supplier Directory could not be loaded." }
  const supplierMap = new Map(suppliers.map((supplier) => [supplier.id, supplier]))
  const itemIds = [...new Set(inputs.map((input) => input.itemId))]
  if (itemIds.some((id) => !UUID_PATTERN.test(id))) return { ok: false, error: "A catalog item or supplier is no longer available." }
  const { data: itemData, error: itemError } = await supabase
    .from("material_catalog_items")
    .select("id,category,package_quantity,comparison_quantity")
    .in("id", itemIds)
    .returns<Array<{ id: string; category: string; package_quantity: number; comparison_quantity: number }>>()
  if (itemError) return { ok: false, error: "The catalog items could not be verified." }
  const itemDepartmentMap = new Map((itemData ?? []).map((item) => [item.id, normalizeMaterialCatalogDepartment(item.category)]))
  const itemMap = new Map((itemData ?? []).map((item) => [item.id, item]))

  const supplierIds = [...new Set(inputs.map((input) => input.supplierId))]
  const { data: existingPriceData, error: existingPriceError } = await supabase
    .from("material_catalog_supplier_prices")
    .select("item_id,supplier_id,product_url,unit_price,retail_store_id,retail_store_name,retail_zip_code,price_observed_at")
    .in("item_id", itemIds)
    .in("supplier_id", supplierIds)
    .returns<Array<{
      item_id: string
      supplier_id: string
      product_url: string | null
      unit_price: number | null
      retail_store_id: string | null
      retail_store_name: string | null
      retail_zip_code: string | null
      price_observed_at: string | null
    }>>()
  if (existingPriceError) return { ok: false, error: "The saved supplier prices could not be verified." }
  const existingPriceMap = new Map((existingPriceData ?? []).map((row) => [`${row.item_id}:${row.supplier_id}`, row]))

  const rows = []
  for (const input of inputs) {
    const supplier = supplierMap.get(input.supplierId)
    const department = itemDepartmentMap.get(input.itemId)
    const price = input.unitPrice === null || input.unitPrice === undefined ? null : Number(input.unitPrice)
    const productUrl = clean(input.productUrl, 1200)
    const deliveryPrice = input.deliveryPrice === null || input.deliveryPrice === undefined ? null : Number(input.deliveryPrice)
    const minimumOrder = Number(input.minimumOrder ?? 1)
    if (!UUID_PATTERN.test(input.itemId) || !supplier || !department) return { ok: false, error: "A catalog item or supplier is no longer available." }
    if (!hasRoutableSupplierTrust(supplier.trustLevel) || !supplierServesMaterialDepartment(supplier, department) || !supplierIsAddedToCatalogDepartment(supplier, department)) {
      return { ok: false, error: "This supplier is not added to that catalog department." }
    }
    if (price !== null && (!Number.isFinite(price) || price < 0 || price > 100_000_000)) return { ok: false, error: "Check the supplier prices before saving." }
    if (deliveryPrice !== null && (!Number.isFinite(deliveryPrice) || deliveryPrice < 0 || deliveryPrice > 100_000_000)) return { ok: false, error: "Check the delivery prices before saving." }
    if (!Number.isFinite(minimumOrder) || minimumOrder <= 0 || minimumOrder > 100_000_000) return { ok: false, error: "Check the minimum order before saving." }
    if (productUrl && !validRetailProductUrl(supplier.id, productUrl)) {
      return { ok: false, error: `Use an exact ${supplier.name} product page, not a search or category link.` }
    }
    const retailSnapshot = supplier.id === "home-depot-retail-catalog"
      ? HOME_DEPOT_SNAPSHOT
      : supplier.id === "lowes-retail-catalog" ? LOWES_SNAPSHOT : null
    if (retailSnapshot && price !== null && !productUrl) {
      return { ok: false, error: `Add the exact ${supplier.name} product page before saving its snapshot price.` }
    }
    const isRetailSnapshot = Boolean(retailSnapshot && price !== null && productUrl)
    const item = itemMap.get(input.itemId)
    if (!item) return { ok: false, error: "A catalog item is no longer available." }
    const priceType = retailSnapshot
      ? "retail"
      : ["supplier_quote", "contractor", "estimated"].includes(input.priceType ?? "") ? input.priceType! : "supplier_quote"
    const requestedVerificationStatus = ["recently_verified", "supplier_quote", "stale", "unavailable", "possible_match", "unverified"]
      .includes(input.verificationStatus ?? "") ? input.verificationStatus! : "supplier_quote"
    const verificationStatus = price === null
      ? (input.availability === "not_available" ? "unavailable" : "unverified")
      : isRetailSnapshot
        ? "verified_today"
        : requestedVerificationStatus
    const comparisonPrice = price === null
      ? null
      : Math.round((((price + (deliveryPrice ?? 0)) / Number(item.package_quantity)) * Number(item.comparison_quantity)) * 10000) / 10000
    const existingPrice = existingPriceMap.get(`${input.itemId}:${supplier.id}`)
    const snapshotChanged = isRetailSnapshot
      && (existingPrice?.product_url !== productUrl || Number(existingPrice?.unit_price) !== price)
    const preservedSnapshot = retailSnapshot ? null : existingPrice
    rows.push({
      item_id: input.itemId,
      supplier_id: supplier.id,
      supplier_name_snapshot: clean(supplier.name, 300),
      supplier_sku: clean(input.supplierSku, 120),
      product_url: productUrl || null,
      unit_price: price === null ? null : Math.round(price * 10000) / 10000,
      availability: ["available", "not_available", "unknown"].includes(input.availability) ? input.availability : "unknown",
      notes: clean(input.notes, 1000),
      price_type: priceType,
      verification_status: verificationStatus,
      delivery_price: deliveryPrice === null ? null : Math.round(deliveryPrice * 10000) / 10000,
      minimum_order: Math.round(minimumOrder * 100) / 100,
      verified_at: price === null ? null : new Date().toISOString(),
      expires_at: priceType === "supplier_quote" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      comparison_price: comparisonPrice,
      retail_store_id: isRetailSnapshot ? retailSnapshot?.storeId ?? null : preservedSnapshot?.retail_store_id ?? null,
      retail_store_name: isRetailSnapshot ? retailSnapshot?.storeName ?? null : preservedSnapshot?.retail_store_name ?? null,
      retail_zip_code: isRetailSnapshot ? retailSnapshot?.zipCode ?? null : preservedSnapshot?.retail_zip_code ?? null,
      price_observed_at: snapshotChanged
        ? new Date().toISOString()
        : isRetailSnapshot ? existingPrice?.price_observed_at ?? null : preservedSnapshot?.price_observed_at ?? null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
  }

  const { error } = await supabase.from("material_catalog_supplier_prices").upsert(rows, { onConflict: "item_id,supplier_id" })
  if (error) return { ok: false, error: "The supplier prices could not be saved." }
  revalidatePath("/admin/catalog")
  return { ok: true, data: { saved: rows.length }, message: `${rows.length} supplier price ${rows.length === 1 ? "cell" : "cells"} saved.` }
}

export async function saveCatalogDepartmentSuppliersAction(
  input: CatalogSupplierMembershipInput,
): Promise<ActionResult<{ supplierIds: string[] }>> {
  const { supabase } = await requireStaffProfile("suppliers")
  const department = normalizeMaterialCatalogDepartment(clean(input.department, 100))
  if (!await validCategory(supabase, department)) return { ok: false, error: "Choose a catalog department." }

  const supplierIds = [...new Set((input.supplierIds ?? []).map((id) => clean(id, 160)).filter(Boolean))]
  if (supplierIds.length > 100) return { ok: false, error: "Add no more than 100 suppliers to one department." }

  const { data, error } = await supabase.rpc("staff_load_catalog_suppliers")
  const suppliers = Array.isArray(data) ? data as CatalogSupplier[] : []
  if (error) return { ok: false, error: "The Supplier Directory could not be loaded." }

  const eligibleIds = new Set(suppliers
    .filter((supplier) => hasRoutableSupplierTrust(supplier.trustLevel) && supplierServesMaterialDepartment(supplier, department))
    .map((supplier) => supplier.id))
  if (supplierIds.some((id) => !eligibleIds.has(id))) {
    return { ok: false, error: "One selected supplier is not eligible for this department. Refresh and try again." }
  }

  const selectedIds = new Set(supplierIds)
  for (const supplier of suppliers) {
    const shouldBeSelected = selectedIds.has(supplier.id)
    if (supplierIsAddedToCatalogDepartment(supplier, department) === shouldBeSelected) continue
    const currentDepartments = (supplier.catalogEnabledDepartments ?? []).map(normalizeMaterialCatalogDepartment)
    const nextDepartments = shouldBeSelected
      ? [...new Set([...currentDepartments, department])]
      : currentDepartments.filter((entry) => entry !== department)

    const { error: saveError } = await supabase.rpc("staff_upsert_supplier_directory_entry", {
      p_supplier: { ...supplier, catalogEnabledDepartments: nextDepartments },
      p_create: false,
    })
    if (saveError) return { ok: false, error: "The catalog supplier selection could not be saved. Refresh and try again." }
  }

  revalidatePath("/admin/catalog")
  revalidatePath("/admin/vendors")
  return {
    ok: true,
    data: { supplierIds },
    message: supplierIds.length
      ? `${supplierIds.length} supplier${supplierIds.length === 1 ? "" : "s"} added to ${department}.`
      : `All supplier columns removed from ${department}.`,
  }
}

export async function importMaterialCatalogPdfAction(formData: FormData): Promise<ActionResult<{
  imported: number
  matched: number
  prices: number
  category: string
  supplierId: string
  supplierName: string
  quoteDate: string
}>> {
  const { supabase, user } = await managerContext()
  const value = formData.get("catalogPdf")
  const category = clean(formData.get("category"), 100)
  if (!(value instanceof File) || value.size === 0) return { ok: false, error: "Choose a material comparison PDF." }
  if (!await validCategory(supabase, category)) return { ok: false, error: "Choose the catalog category for this PDF." }

  let extracted
  try {
    extracted = await extractMaterialCatalogItemsFromPdf(value, category)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The PDF could not be read." }
  }

  const { items, metadata, detectedSupplierName, category: importCategory } = extracted
  const { data: existing, error: existingError } = await supabase
    .from("material_catalog_items")
    .select("id,category,name,item_code,package_quantity,comparison_quantity")
    .returns<Array<{ id: string; category: string; name: string; item_code: string; package_quantity: number; comparison_quantity: number }>>()
  if (existingError) return { ok: false, error: "The PDF was read, but the existing catalog could not be checked." }
  const itemKey = (itemCategory: string, itemName: string) => `${itemCategory.toLowerCase()}::${itemName.toLowerCase()}`
  const existingByName = new Map((existing ?? []).map((item) => [itemKey(item.category, item.name), item]))
  const existingCodes = new Set((existing ?? []).map((item) => String(item.item_code).toUpperCase()))
  const newItems = items.filter((item) => !existingByName.has(itemKey(item.category, item.name)))
  const now = new Date().toISOString()
  const insertRows = newItems.map((item, index) => {
    let itemCode = item.itemCode
    let suffix = 1
    while (existingCodes.has(itemCode.toUpperCase())) itemCode = `${item.itemCode}-${suffix++}`
    existingCodes.add(itemCode.toUpperCase())
    return {
      category: item.category,
      item_code: itemCode,
      name: item.name,
      default_quantity: item.defaultQuantity,
      unit: item.unit,
      source: value.name.slice(0, 240),
      sort_order: item.sortOrder + index,
      created_by: user.id,
      updated_by: user.id,
      updated_at: now,
    }
  })

  if (insertRows.length) {
    const { data: inserted, error } = await supabase
      .from("material_catalog_items")
      .insert(insertRows)
      .select("id,category,name,item_code,package_quantity,comparison_quantity")
      .returns<Array<{ id: string; category: string; name: string; item_code: string; package_quantity: number; comparison_quantity: number }>>()
    if (error || !inserted) return { ok: false, error: "The PDF was read, but its items could not be imported." }
    for (const item of inserted) existingByName.set(itemKey(item.category, item.name), item)
  }

  const pricedItems = items.filter((item) => item.unitPrice !== null)
  let supplier: CatalogSupplier | null = null
  if (pricedItems.length && detectedSupplierName) {
    const { data: supplierData, error: supplierError } = await supabase.rpc("staff_load_catalog_suppliers")
    if (supplierError) return { ok: false, error: "The items were imported, but the Supplier Directory could not be checked for their prices." }
    const suppliers = Array.isArray(supplierData) ? supplierData as CatalogSupplier[] : []
    supplier = detectSupplierMatch(suppliers, detectedSupplierName, detectedSupplierName)

    if (!supplier && metadata.supplierName) {
      const candidate: CatalogSupplier & Record<string, unknown> = {
        id: importedSupplierId(metadata.supplierName),
        name: clean(metadata.supplierName, 160),
        email: "",
        phone: "",
        whatsapp: "",
        portalUrl: "",
        materials: importCategory,
        trustLevel: "first-time",
        catalogDepartments: [importCategory],
        catalogEnabledDepartments: [importCategory],
        contactLabel: "Imported supplier quote",
        contactName: "",
        preferredDeliveryMethod: "manual",
        deliveryNotes: "",
        notes: `Created from imported PDF ${clean(value.name, 180)}. Review contact details before sending a request.`,
        address: "",
      }
      const { data: created, error: createError } = await supabase.rpc("staff_upsert_supplier_directory_entry", {
        p_supplier: candidate,
        p_create: true,
      })
      if (createError || !created) return { ok: false, error: "The items were imported, but the detected supplier could not be added for pricing." }
      supplier = created as CatalogSupplier
    } else if (supplier) {
      const catalogDepartments = [...new Set([...(supplier.catalogDepartments ?? []), importCategory])]
      const catalogEnabledDepartments = [...new Set([...(supplier.catalogEnabledDepartments ?? []), importCategory])]
      if (catalogDepartments.length !== (supplier.catalogDepartments ?? []).length || catalogEnabledDepartments.length !== (supplier.catalogEnabledDepartments ?? []).length) {
        const { data: updated, error: updateError } = await supabase.rpc("staff_upsert_supplier_directory_entry", {
          p_supplier: { ...supplier, catalogDepartments, catalogEnabledDepartments },
          p_create: false,
        })
        if (updateError || !updated) return { ok: false, error: "The items were imported, but the supplier could not be added to this catalog category." }
        supplier = updated as CatalogSupplier
      }
    }
  }

  let savedPrices = 0
  if (supplier && pricedItems.length) {
    const observedAt = quoteDateTime(metadata.quoteDate)
    const expiresAt = quoteDateTime(metadata.expiresOn)
    const priceRows = pricedItems.flatMap((item) => {
      const catalogItem = existingByName.get(itemKey(item.category, item.name))
      if (!catalogItem || item.unitPrice === null) return []
      const packageQuantity = Number(catalogItem.package_quantity) || 1
      const comparisonQuantity = Number(catalogItem.comparison_quantity) || 1
      return [{
        item_id: catalogItem.id,
        supplier_id: supplier.id,
        supplier_name_snapshot: clean(supplier.name, 300),
        supplier_sku: clean(item.supplierSku, 120),
        unit_price: Math.round(item.unitPrice * 10_000) / 10_000,
        availability: "available",
        notes: clean(`Imported from ${metadata.quoteNumber ? `quote ${metadata.quoteNumber}` : value.name}${metadata.quoteDate ? ` dated ${metadata.quoteDate}` : ""}.`, 1000),
        price_type: "supplier_quote",
        verification_status: "supplier_quote",
        delivery_price: null,
        minimum_order: 1,
        comparison_price: Math.round(((item.unitPrice / packageQuantity) * comparisonQuantity) * 10_000) / 10_000,
        verified_at: observedAt ?? now,
        expires_at: expiresAt,
        price_observed_at: observedAt,
        updated_by: user.id,
        updated_at: now,
      }]
    })
    if (priceRows.length) {
      const { error: priceError } = await supabase.from("material_catalog_supplier_prices").upsert(priceRows, { onConflict: "item_id,supplier_id" })
      if (priceError) return { ok: false, error: "The items were imported, but their supplier prices could not be saved." }
      savedPrices = priceRows.length
    }
  }

  const matched = items.length - insertRows.length
  const priceMessage = savedPrices
    ? ` ${savedPrices} price${savedPrices === 1 ? "" : "s"} saved for ${supplier?.name}${metadata.quoteDate ? ` from ${metadata.quoteDate}` : ""}.`
    : pricedItems.length && !supplier
      ? ` Prices were found, but ${detectedSupplierName || "the supplier"} needs to be confirmed in the Supplier Directory.`
      : " No dependable supplier prices were found in the PDF."
  revalidatePath("/admin/catalog")
  revalidatePath("/admin/vendors")
  return {
    ok: true,
    data: {
      imported: insertRows.length,
      matched,
      prices: savedPrices,
      category: importCategory,
      supplierId: supplier?.id ?? "",
      supplierName: supplier?.name ?? detectedSupplierName,
      quoteDate: metadata.quoteDate,
    },
    message: `${insertRows.length} new item${insertRows.length === 1 ? "" : "s"} imported into ${importCategory}; ${matched} existing item${matched === 1 ? "" : "s"} matched.${priceMessage}`,
  }
}
