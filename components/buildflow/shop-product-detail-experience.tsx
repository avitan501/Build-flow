"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import type { ShopCatalogProduct } from "@/lib/shop-catalog"
import { readShopCartMap, readShopSavedIds, writeShopCartMap, writeShopSavedIds } from "@/lib/shop-cart"

type ShopProductDetailExperienceProps = {
  product: ShopCatalogProduct
  relatedProducts: ShopCatalogProduct[]
  buyMode?: boolean
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

function renderStars(rating: number) {
  const filledStars = Math.round(rating)
  return "★★★★★".slice(0, filledStars) + "☆☆☆☆☆".slice(0, 5 - filledStars)
}

export function ShopProductDetailExperience({ product, relatedProducts, buyMode = false }: ShopProductDetailExperienceProps) {
  const [quantity, setQuantity] = useState(1)
  const [saved, setSaved] = useState(() => readShopSavedIds().includes(product.id))
  const [buyOpen, setBuyOpen] = useState(buyMode)
  const [activeImage, setActiveImage] = useState(product.gallery[0] || product.image)
  const cartCount = useMemo(() => readShopCartMap()[product.id] || 0, [product.id, quantity, buyOpen, saved])

  function addToCart() {
    const current = readShopCartMap()
    writeShopCartMap({ ...current, [product.id]: quantity })
  }

  function toggleSaved() {
    const current = readShopSavedIds()
    const next = current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id]
    setSaved(next.includes(product.id))
    writeShopSavedIds(next)
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#f7fbff_32%,#ffffff_100%)] px-0 pb-24 text-slate-950 sm:px-4 sm:py-4 lg:px-8">
      <section className="mx-auto max-w-6xl bg-transparent sm:rounded-[24px] sm:border sm:border-white/80 sm:bg-white/80 sm:shadow-[0_18px_42px_rgba(148,163,184,0.12)] sm:backdrop-blur">
        <div className="px-4 py-3 text-sm sm:px-6">
          <Link href="/shop" className="font-medium text-sky-700">
            ← Back to shop
          </Link>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:px-6 lg:pb-8">
          <section className="border-y border-sky-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,248,255,0.92))] px-4 py-4 sm:rounded-[22px] sm:border sm:border-white/90 sm:shadow-[0_16px_34px_rgba(148,163,184,0.1)] lg:border-none lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              <span>{product.category}</span>
              <span className="text-slate-300">•</span>
              <span>{product.supplierName || "BuildFlow sample catalog"}</span>
            </div>
            <h1 className="mt-2 text-[1.6rem] font-semibold leading-7 tracking-[-0.04em] text-slate-950 sm:text-[1.9rem] sm:leading-8">{product.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-amber-500">{renderStars(product.rating)}</span>
              <span className="text-sky-700">{product.reviewLabel}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600">{product.featuredLabel}</span>
            </div>

            <div className="mt-4 overflow-hidden rounded-[20px] border border-sky-100 bg-white shadow-[0_18px_36px_rgba(148,163,184,0.12)]">
              <img src={activeImage} alt={product.name} className="block h-[320px] w-full object-contain bg-[linear-gradient(180deg,#ffffff_0%,#f5faff_100%)] sm:h-[420px] lg:h-[520px]" />
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {product.gallery.map((image, index) => (
                <button
                  key={`${product.id}-image-${index}`}
                  type="button"
                  onClick={() => setActiveImage(image)}
                  className={`shrink-0 overflow-hidden rounded-[12px] border bg-white shadow-sm transition ${activeImage === image ? "border-sky-400 ring-2 ring-sky-100" : "border-slate-200 hover:border-sky-200"}`}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} className="h-16 w-16 object-cover sm:h-20 sm:w-20" loading="lazy" />
                </button>
              ))}
            </div>

            <div className="mt-3 flex justify-center gap-1.5 lg:hidden">
              {product.gallery.map((image, index) => (
                <span key={`${image}-${index}`} className={`h-2 w-2 rounded-full ${activeImage === image ? "bg-sky-700" : "bg-sky-200"}`} />
              ))}
            </div>
          </section>

          <section className="px-4 py-4 sm:px-6 lg:px-0 lg:py-0">
            <div className="rounded-[22px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,246,255,0.94))] p-5 shadow-[0_18px_42px_rgba(148,163,184,0.14)]">
              <div className="flex items-end gap-2">
                <div className="text-[2.15rem] font-semibold leading-none tracking-[-0.04em] text-slate-950">{formatCurrency(product.price)}</div>
                <div className="pb-1 text-sm text-slate-500">{product.unit}</div>
              </div>
              <div className="mt-3 inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">Ready to quote</div>
              <div className="mt-3 text-sm leading-6 text-slate-600">{product.description}</div>

              <div className="mt-5 rounded-[18px] border border-sky-100 bg-white/90 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Quantity</div>
                    <div className="mt-1 text-sm text-slate-600">Local cart preview only</div>
                  </div>
                  <div className="flex items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                    <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="h-10 w-10 text-lg text-slate-700">−</button>
                    <span className="min-w-10 text-center text-sm font-semibold text-slate-950">{quantity}</span>
                    <button type="button" onClick={() => setQuantity((current) => current + 1)} className="h-10 w-10 text-lg text-slate-700">+</button>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <button
                  onClick={addToCart}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#103b66_0%,#0f2744_100%)] px-4 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(15,39,68,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(15,39,68,0.28)]"
                >
                  {cartCount > 0 ? `Update cart · ${cartCount}` : "Add to cart"}
                </button>
                <button
                  onClick={() => setBuyOpen(true)}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#d7b66a] bg-[linear-gradient(180deg,#fff6df_0%,#f3dfab_100%)] px-4 text-sm font-semibold text-[#6c5315] shadow-[0_14px_30px_rgba(215,182,106,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(215,182,106,0.22)]"
                >
                  Request this item
                </button>
              </div>

              <div className="mt-5 rounded-[18px] border border-sky-100 bg-white/90 p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                <div className="text-sm font-semibold text-slate-950">Supplier details</div>
                <div className="mt-3 grid gap-3 text-sm text-slate-700">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                    <span className="text-slate-500">Source</span>
                    <span className="text-right font-medium">{product.quoteNumber || "BuildFlow sample catalog"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                    <span className="text-slate-500">Supplier</span>
                    <span className="text-right font-medium">{product.supplierName || "BuildFlow sample catalog"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                    <span className="text-slate-500">Use</span>
                    <span className="text-right font-medium">Quote / order request</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-slate-500">Payment</span>
                    <span className="text-right font-medium">Not charged until approval</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleSaved}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-sky-100 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:border-sky-200 hover:text-sky-700"
              >
                {saved ? "Saved to list" : "Save to list"}
              </button>

              <button type="button" className="mt-3 text-sm font-medium text-sky-700">Report an issue with this product</button>

              <div className={`mt-4 rounded-[16px] border px-4 py-3 text-sm ${buyOpen ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-sky-100 bg-sky-50/70 text-slate-600"}`}>
                {buyOpen ? "Request ready. This stays local until your order is reviewed and approved." : "Add items to cart or request them now. Nothing is charged on this page."}
              </div>
            </div>

            <div className="mt-4 rounded-[22px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,246,255,0.94))] p-5 shadow-[0_18px_42px_rgba(148,163,184,0.12)]">
              <div className="text-sm font-semibold text-slate-950">Product specs</div>
              <div className="mt-3 grid gap-2 text-sm text-slate-700">
                <div><span className="font-medium text-slate-500">Spec:</span> {product.specLine}</div>
                <div><span className="font-medium text-slate-500">Best use:</span> {product.popularUse}</div>
                <div><span className="font-medium text-slate-500">Quote ref:</span> {product.quoteNumber || "Sample catalog reference"}</div>
              </div>
            </div>
          </section>
        </div>

        <section className="border-t border-sky-100 px-4 py-5 sm:px-6 lg:px-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">Related materials</h2>
            <Link href="/shop" className="text-sm text-sky-700">Back to shop</Link>
          </div>

          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {relatedProducts.map((related) => (
              <Link
                key={related.id}
                href={`/shop/${related.slug}`}
                className="w-[188px] shrink-0 rounded-[18px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,247,255,0.94))] p-3 shadow-[0_14px_30px_rgba(148,163,184,0.12)] transition hover:-translate-y-0.5"
              >
                <div className="overflow-hidden rounded-[14px] border border-sky-100 bg-white">
                  <img src={related.image} alt={related.name} className="h-[140px] w-full object-contain bg-[linear-gradient(180deg,#ffffff_0%,#f4f9ff_100%)]" loading="lazy" />
                </div>
                <div className="mt-3 line-clamp-2 text-sm font-semibold text-slate-900">{related.name}</div>
                <div className="mt-1 text-xs text-amber-500">{renderStars(related.rating)} <span className="text-slate-500">{related.reviewLabel}</span></div>
                <div className="mt-2 text-base font-semibold text-slate-950">{formatCurrency(related.price)}</div>
                <div className="text-xs text-slate-500">{related.unit}</div>
                <div className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">View details</div>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
