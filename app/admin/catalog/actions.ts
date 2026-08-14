"use server"

import { revalidatePath } from "next/cache"

import { requireManagerPortalProfile } from "@/lib/auth"
import { MATERIAL_CATALOG_CATEGORIES, type CatalogSupplier } from "@/lib/material-catalog"
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
  notes?: string
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max)
}

function validCategory(value: string) {
  return (MATERIAL_CATALOG_CATEGORIES as readonly string[]).includes(value)
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
  if (!validCategory(category)) return { ok: false, error: "Choose a catalog category." }
  if (!itemCode || !name) return { ok: false, error: "Item code and material name are required." }
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100_000_000) return { ok: false, error: "Enter a valid default quantity." }

  const record = {
    category,
    item_code: itemCode,
    name,
    description: clean(input.description, 2000),
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

  const rows = []
  for (const input of inputs) {
    const supplier = supplierMap.get(input.supplierId)
    const price = input.unitPrice === null || input.unitPrice === undefined ? null : Number(input.unitPrice)
    if (!UUID_PATTERN.test(input.itemId) || !supplier) return { ok: false, error: "A catalog item or supplier is no longer available." }
    if (price !== null && (!Number.isFinite(price) || price < 0 || price > 100_000_000)) return { ok: false, error: "Check the supplier prices before saving." }
    rows.push({
      item_id: input.itemId,
      supplier_id: supplier.id,
      supplier_name_snapshot: clean(supplier.name, 300),
      supplier_sku: clean(input.supplierSku, 120),
      unit_price: price === null ? null : Math.round(price * 10000) / 10000,
      availability: ["available", "not_available", "unknown"].includes(input.availability) ? input.availability : "unknown",
      notes: clean(input.notes, 1000),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
  }

  const { error } = await supabase.from("material_catalog_supplier_prices").upsert(rows, { onConflict: "item_id,supplier_id" })
  if (error) return { ok: false, error: "The supplier prices could not be saved." }
  revalidatePath("/admin/catalog")
  return { ok: true, data: { saved: rows.length }, message: `${rows.length} supplier price ${rows.length === 1 ? "cell" : "cells"} saved.` }
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
