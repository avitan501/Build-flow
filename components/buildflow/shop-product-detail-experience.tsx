"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import type { ShopCatalogProduct } from "@/lib/shop-catalog"

type ShopProductDetailExperienceProps = {
  product: ShopCatalogProduct
  relatedProducts: ShopCatalogProduct[]
  buyMode?: boolean
}

type CartMap = Record<string, number>

const SHOP_CART_STORAGE_KEY = "buildflow-shop-cart"
const SHOP_SAVE_STORAGE_KEY = "buildflow-shop-save"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

function readCartMap(): CartMap {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(SHOP_CART_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as CartMap) : {}
  } catch {
    return {}
  }
}

function readSavedIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(SHOP_SAVE_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []
  } catch {
    return []
  }
}

export function ShopProductDetailExperience({ product, relatedProducts, buyMode = false }: ShopProductDetailExperienceProps) {
  const [quantity, setQuantity] = useState(1)
  const [saved, setSaved] = useState(() => readSavedIds().includes(product.id))
  const [buyOpen, setBuyOpen] = useState(buyMode)
  const cartCount = useMemo(() => readCartMap()[product.id] || 0, [product.id, quantity, buyOpen, saved])

  function persistCart(next: CartMap) {
    if (typeof window === "undefined") return
    window.localStorage.setItem(SHOP_CART_STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event("buildflow-shop-cart-updated"))
  }

  function persistSaved(next: string[]) {
    if (typeof window === "undefined") return
    window.localStorage.setItem(SHOP_SAVE_STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event("buildflow-shop-save-updated"))
  }

  function addToCart() {
    const current = readCartMap()
    persistCart({ ...current, [product.id]: quantity })
  }

  function toggleSaved() {
    const current = readSavedIds()
    const next = current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id]
    setSaved(next.includes(product.id))
    persistSaved(next)
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#edf5fb_0%,#f8fbff_36%,#eef5fb_100%)] px-4 py-4 pb-28 text-slate-900 sm:px-8 sm:pb-10 lg:px-10 lg:pb-12">
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/shop" className="font-medium text-sky-700">Shop</Link>
          <span>/</span>
          <span>{product.category}</span>
        </div>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="overflow-hidden rounded-[30px] border border-slate-100 bg-white shadow-[0_18px_42px_rgba(148,163,184,0.12)]">
            <div className="h-[320px] bg-cover bg-center sm:h-[420px]" style={{ backgroundImage: `url(${product.image})` }} />
          </div>

          <div className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-[0_18px_42px_rgba(148,163,184,0.12)] sm:p-6">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">{product.category}</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{product.availability}</span>
            </div>
            <h1 className="mt-3 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950">{product.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span>{product.reviewLabel}</span>
              <span>•</span>
              <span>{product.featuredLabel}</span>
            </div>
            <div className="mt-4 flex items-end gap-3">
              <div className="text-[2rem] font-semibold tracking-[-0.04em] text-slate-950">{formatCurrency(product.price)}</div>
              <div className="pb-1 text-sm text-slate-500">{product.unit}</div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">{product.description}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Spec</div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{product.specLine}</div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Supplier / source</div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{product.supplierName || "BuildFlow sample catalog"}</div>
                <div className="mt-1 text-xs text-slate-500">{product.quoteNumber || "Sample catalog reference"}</div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Fulfillment</div>
                <div className="mt-1 text-sm font-semibold text-slate-950">Quote-ready / pickup planning</div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Use case</div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{product.popularUse}</div>
              </div>
            </div>

            <div className="mt-5 rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#f9fbff_0%,#f3f8ff_100%)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Quantity</div>
                  <div className="mt-1 text-sm text-slate-600">Local cart only</div>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1">
                  <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="h-8 w-8 rounded-full text-lg font-semibold text-slate-600">-</button>
                  <span className="min-w-8 text-center text-sm font-semibold text-slate-950">{quantity}</span>
                  <button type="button" onClick={() => setQuantity((current) => current + 1)} className="h-8 w-8 rounded-full text-lg font-semibold text-slate-600">+</button>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <button onClick={addToCart} className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_30px_rgba(220,168,69,0.22)]">{cartCount > 0 ? `Update cart · ${cartCount}` : "Add to cart"}</button>
              <button onClick={() => setBuyOpen(true)} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Buy now</button>
              <button onClick={toggleSaved} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">{saved ? "Saved" : "Save"}</button>
            </div>

            <div className={`mt-4 rounded-[22px] border px-4 py-3 text-sm ${buyOpen ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
              {buyOpen ? "Ready for checkout soon. This buy flow is local/visual only for now." : "Quote-ready / local cart only. Checkout is coming soon."}
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-[0_18px_42px_rgba(148,163,184,0.12)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[1.3rem] font-semibold tracking-[-0.04em] text-slate-950">Related products</h2>
            <Link href="/shop" className="text-sm font-semibold text-sky-700">Back to shop</Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {relatedProducts.map((related) => (
              <Link key={related.id} href={`/shop/${related.slug}`} className="overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-[0_12px_28px_rgba(148,163,184,0.1)]">
                <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${related.image})` }} />
                <div className="p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">{related.category}</div>
                  <div className="mt-2 line-clamp-2 text-sm font-semibold text-slate-950">{related.name}</div>
                  <div className="mt-2 text-sm font-semibold text-slate-950">{formatCurrency(related.price)}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
