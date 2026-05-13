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

type CartMap = Record<string, number>

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
    <main className="min-h-screen bg-white px-0 pb-24 text-slate-950 sm:px-4 sm:py-4 lg:px-8">
      <section className="mx-auto max-w-6xl bg-white sm:rounded-[18px] sm:border sm:border-slate-200 sm:shadow-sm">
        <div className="px-4 py-3 text-sm sm:px-6">
          <Link href="/shop" className="font-medium text-sky-700">
            ← Back to results
          </Link>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:px-6 lg:pb-8">
          <section className="border-y border-slate-200 bg-white px-4 py-4 sm:border sm:border-slate-200 sm:rounded-[16px] lg:border-none lg:px-0 lg:py-0">
            <div className="text-xs font-medium text-sky-700">{product.category} · {product.supplierName || "BuildFlow"}</div>
            <h1 className="mt-2 text-[1.55rem] font-normal leading-7 text-slate-950 sm:text-[1.8rem] sm:leading-8">{product.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-amber-500">{renderStars(product.rating)}</span>
              <span className="text-sky-700">{product.reviewLabel}</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600">{product.featuredLabel}</span>
            </div>

            <div className="mt-4 overflow-hidden rounded-[10px] border border-slate-200 bg-white">
              <img src={activeImage} alt={product.name} className="block h-[320px] w-full object-contain sm:h-[420px] lg:h-[520px]" />
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {product.gallery.map((image, index) => (
                <button
                  key={`${product.id}-image-${index}`}
                  type="button"
                  onClick={() => setActiveImage(image)}
                  className={`shrink-0 overflow-hidden rounded-md border bg-white ${activeImage === image ? "border-amber-500 ring-2 ring-amber-200" : "border-slate-200"}`}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} className="h-16 w-16 object-cover sm:h-20 sm:w-20" loading="lazy" />
                </button>
              ))}
            </div>

            <div className="mt-3 flex justify-center gap-1.5 lg:hidden">
              {product.gallery.map((image, index) => (
                <span key={`${image}-${index}`} className={`h-2 w-2 rounded-full ${activeImage === image ? "bg-slate-800" : "bg-slate-300"}`} />
              ))}
            </div>
          </section>

          <section className="px-4 py-4 sm:px-6 lg:px-0 lg:py-0">
            <div className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-[2rem] leading-none text-slate-950">
                <span className="align-top text-sm">$</span>
                <span className="font-normal">{product.price.toFixed(2)}</span>
              </div>
              <div className="mt-1 text-sm text-slate-600">{product.unit}</div>
              <div className="mt-3 text-sm text-emerald-700">In Stock — {product.availability}</div>
              <div className="mt-1 text-sm text-slate-600">{product.description}</div>

              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm text-slate-700">Qty:</span>
                <div className="flex items-center overflow-hidden rounded-full border border-slate-300 bg-slate-100">
                  <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="h-9 w-10 text-lg text-slate-700">−</button>
                  <span className="min-w-10 text-center text-sm font-medium text-slate-950">{quantity}</span>
                  <button type="button" onClick={() => setQuantity((current) => current + 1)} className="h-9 w-10 text-lg text-slate-700">+</button>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <button
                  onClick={addToCart}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#FFD814] px-4 text-sm font-medium text-slate-950 hover:bg-[#f7ca00]"
                >
                  {cartCount > 0 ? `Update cart · ${cartCount}` : "Add to cart"}
                </button>
                <button
                  onClick={() => setBuyOpen(true)}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#FFA41C] px-4 text-sm font-medium text-slate-950 hover:bg-[#f39200]"
                >
                  Buy Now
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-[12px] border border-slate-200 text-sm">
                <div className="grid grid-cols-[92px_1fr] border-b border-slate-200 px-3 py-2.5">
                  <span className="text-slate-500">Ships from</span>
                  <span>BuildFlow</span>
                </div>
                <div className="grid grid-cols-[92px_1fr] border-b border-slate-200 px-3 py-2.5">
                  <span className="text-slate-500">Sold by</span>
                  <span>{product.supplierName || "BuildFlow sample catalog"}</span>
                </div>
                <div className="grid grid-cols-[92px_1fr] border-b border-slate-200 px-3 py-2.5">
                  <span className="text-slate-500">Returns</span>
                  <span>30-day review / replacement</span>
                </div>
                <div className="grid grid-cols-[92px_1fr] px-3 py-2.5">
                  <span className="text-slate-500">Payment</span>
                  <span>Secure transaction</span>
                </div>
              </div>

              <button type="button" className="mt-3 text-sm font-medium text-sky-700">See more</button>

              <button
                type="button"
                onClick={toggleSaved}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900"
              >
                {saved ? "Added to List" : "Add to List"}
              </button>

              <button type="button" className="mt-3 text-sm text-sky-700">Report an issue with this product</button>

              <div className={`mt-4 rounded-[12px] border px-3 py-3 text-sm ${buyOpen ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                {buyOpen ? "Ready for checkout soon. This buy flow is local/visual only for now." : "Local cart is active. Checkout remains preview-only for now."}
              </div>
            </div>

            <div className="mt-4 rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-950">Product details</div>
              <div className="mt-3 grid gap-2 text-sm text-slate-700">
                <div><span className="font-medium text-slate-500">Spec:</span> {product.specLine}</div>
                <div><span className="font-medium text-slate-500">Best use:</span> {product.popularUse}</div>
                <div><span className="font-medium text-slate-500">Quote ref:</span> {product.quoteNumber || "Sample catalog reference"}</div>
              </div>
            </div>
          </section>
        </div>

        <section className="border-t border-slate-200 px-4 py-5 sm:px-6 lg:px-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">You might also like</h2>
            <Link href="/shop" className="text-sm text-sky-700">Back to shop</Link>
          </div>

          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {relatedProducts.map((related) => (
              <Link
                key={related.id}
                href={`/shop/${related.slug}`}
                className="w-[180px] shrink-0 rounded-[14px] border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="overflow-hidden rounded-[10px] border border-slate-200 bg-white">
                  <img src={related.image} alt={related.name} className="h-[140px] w-full object-contain" loading="lazy" />
                </div>
                <div className="mt-3 line-clamp-2 text-sm text-slate-900">{related.name}</div>
                <div className="mt-1 text-xs text-amber-500">{renderStars(related.rating)} <span className="text-slate-500">{related.reviewLabel}</span></div>
                <div className="mt-1 text-base font-medium text-slate-950">{formatCurrency(related.price)}</div>
                <div className="text-xs text-slate-500">{related.unit}</div>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
