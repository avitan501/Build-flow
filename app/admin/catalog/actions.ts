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

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max)
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
  const unit = clean(input.unit, 40) || "each"
  if (!await validCategory(supabase, category)) return { ok: false, error: "Choose a catalog category." }
  if (!itemCode || !name) return { ok: false, error: "Item code and material name are required." }
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100_000_000) return { ok: false, error: "Enter a valid default quantity." }

  const record = {
    category,
    item_code: itemCode,
    name,
    description: clean(input.description, 2000),
    measurement: clean(input.measurement, 160),
    thickness: clean(input.thickness, 160),
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
  const { supabase } = await managerContext()
  if (!UUID_PATTERN.test(itemId)) return { ok: false, error: "This catalog item could not be identified." }
  const { error, count } = await supabase
    .from("material_catalog_items")
    .delete({ count: "exact" })
    .eq("id", itemId)
  if (error || count !== 1) return { ok: false, error: "The item was not deleted. Refresh and try again." }
  revalidatePath("/admin/catalog")
  return { ok: true, message: "Catalog item deleted." }
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
    .select("id,category")
    .in("id", itemIds)
    .returns<Array<{ id: string; category: string }>>()
  if (itemError) return { ok: false, error: "The catalog items could not be verified." }
  const itemDepartmentMap = new Map((itemData ?? []).map((item) => [item.id, normalizeMaterialCatalogDepartment(item.category)]))

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
    if (!UUID_PATTERN.test(input.itemId) || !supplier || !department) return { ok: false, error: "A catalog item or supplier is no longer available." }
    if (!hasRoutableSupplierTrust(supplier.trustLevel) || !supplierServesMaterialDepartment(supplier, department) || !supplierIsAddedToCatalogDepartment(supplier, department)) {
      return { ok: false, error: "This supplier is not added to that catalog department." }
    }
    if (price !== null && (!Number.isFinite(price) || price < 0 || price > 100_000_000)) return { ok: false, error: "Check the supplier prices before saving." }
    if (productUrl && !validRetailProductUrl(supplier.id, productUrl)) {
      return { ok: false, error: `Use an exact ${supplier.name} product page, not a search or category link.` }
    }
    if (supplier.id === "home-depot-retail-catalog" && price !== null && !productUrl) {
      return { ok: false, error: "Add the exact Home Depot product page before saving its snapshot price." }
    }
    const isHomeDepot = supplier.id === "home-depot-retail-catalog"
    const isHomeDepotSnapshot = isHomeDepot && price !== null && Boolean(productUrl)
    const existingPrice = existingPriceMap.get(`${input.itemId}:${supplier.id}`)
    const snapshotChanged = isHomeDepotSnapshot
      && (existingPrice?.product_url !== productUrl || Number(existingPrice?.unit_price) !== price)
    const preservedSnapshot = isHomeDepot ? null : existingPrice
    rows.push({
      item_id: input.itemId,
      supplier_id: supplier.id,
      supplier_name_snapshot: clean(supplier.name, 300),
      supplier_sku: clean(input.supplierSku, 120),
      product_url: productUrl || null,
      unit_price: price === null ? null : Math.round(price * 10000) / 10000,
      availability: ["available", "not_available", "unknown"].includes(input.availability) ? input.availability : "unknown",
      notes: clean(input.notes, 1000),
      retail_store_id: isHomeDepotSnapshot ? HOME_DEPOT_SNAPSHOT.storeId : preservedSnapshot?.retail_store_id ?? null,
      retail_store_name: isHomeDepotSnapshot ? HOME_DEPOT_SNAPSHOT.storeName : preservedSnapshot?.retail_store_name ?? null,
      retail_zip_code: isHomeDepotSnapshot ? HOME_DEPOT_SNAPSHOT.zipCode : preservedSnapshot?.retail_zip_code ?? null,
      price_observed_at: snapshotChanged
        ? new Date().toISOString()
        : isHomeDepotSnapshot ? existingPrice?.price_observed_at ?? null : preservedSnapshot?.price_observed_at ?? null,
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

export async function importMaterialCatalogPdfAction(formData: FormData): Promise<ActionResult<{ imported: number; skipped: number }>> {
  const { supabase, user } = await managerContext()
  const value = formData.get("catalogPdf")
  if (!(value instanceof File) || value.size === 0) return { ok: false, error: "Choose a material comparison PDF." }

  let extracted
  try {
    extracted = await extractMaterialCatalogItemsFromPdf(value)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The PDF could not be read." }
  }

  const { data: existing } = await supabase.from("material_catalog_items").select("category,name,item_code")
  const existingNames = new Set((existing ?? []).map((item) => `${item.category.toLowerCase()}::${item.name.toLowerCase()}`))
  const existingCodes = new Set((existing ?? []).map((item) => String(item.item_code).toUpperCase()))
  const rows = extracted.filter((item) => !existingNames.has(`${item.category.toLowerCase()}::${item.name.toLowerCase()}`))
  const now = new Date().toISOString()
  const insertRows = rows.map((item, index) => {
    let itemCode = item.itemCode
    let suffix = 1
    while (existingCodes.has(itemCode)) itemCode = `${item.itemCode}-${suffix++}`
    existingCodes.add(itemCode)
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
    const { error } = await supabase.from("material_catalog_items").insert(insertRows)
    if (error) return { ok: false, error: "The PDF was read, but its items could not be imported." }
  }
  revalidatePath("/admin/catalog")
  return {
    ok: true,
    data: { imported: insertRows.length, skipped: extracted.length - insertRows.length },
    message: `${insertRows.length} item${insertRows.length === 1 ? "" : "s"} imported; ${extracted.length - insertRows.length} duplicate${extracted.length - insertRows.length === 1 ? "" : "s"} skipped.`,
  }
}
