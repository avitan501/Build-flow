"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"

import type { ShopCatalogProduct } from "@/lib/shop-catalog"
import {
  SHOP_CART_UPDATED_EVENT,
  SHOP_SAVE_UPDATED_EVENT,
  readShopCartCount,
  readShopCartMap,
  readShopSavedIds,
  writeShopCartMap,
  writeShopSavedIds,
} from "@/lib/shop-cart"

type ShopProductDetailExperienceProps = {
  product: ShopCatalogProduct
  relatedProducts: ShopCatalogProduct[]
  buyMode?: boolean
}

function formatCurrencyParts(value: number) {
  const [dollars, cents] = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value).split(".")

  return { dollars, cents: cents ?? "00" }
}

function renderStars(rating: number) {
  const filledStars = Math.round(rating)
  return "★★★★★".slice(0, filledStars) + "☆☆☆☆☆".slice(0, 5 - filledStars)
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.69L22 7H6" />
    </svg>
  )
}

function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export function ShopProductDetailExperience({ product, relatedProducts }: ShopProductDetailExperienceProps) {
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(product.gallery[0]?.imageUrl || product.imageUrl)
  const [cartCount, setCartCount] = useState(0)
  const [saved, setSaved] = useState(false)
  const [addedMessage, setAddedMessage] = useState<string | null>(null)

  useEffect(() => {
    const sync = () => {
      setCartCount(readShopCartCount())
      setSaved(readShopSavedIds().includes(product.id))
    }

    sync()
    window.addEventListener(SHOP_CART_UPDATED_EVENT, sync)
    window.addEventListener(SHOP_SAVE_UPDATED_EVENT, sync)
    return () => {
      window.removeEventListener(SHOP_CART_UPDATED_EVENT, sync)
      window.removeEventListener(SHOP_SAVE_UPDATED_EVENT, sync)
    }
  }, [product.id])

  function addToCart() {
    const current = readShopCartMap()
    writeShopCartMap({ ...current, [product.id]: quantity })
    setCartCount(readShopCartCount())
    setAddedMessage(`Added ${quantity} to cart`)
  }

  function toggleSaved() {
    const current = readShopSavedIds()
    const next = current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id]
    writeShopSavedIds(next)
    setSaved(next.includes(product.id))
  }

  const price = formatCurrencyParts(product.price)

  return (
    <main className="min-h-screen bg-[#f4f7fb] pb-28 text-slate-950">
      <section className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
        <div className="overflow-hidden rounded-[30px] bg-white shadow-[0_16px_44px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Link href="/shop" className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm">
                  Back
                </Link>
                <Link href="/shop" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm" aria-label="Search products">
                  <SearchIcon />
                </Link>
              </div>
              <div className="text-sm font-semibold tracking-[0.16em] text-slate-900">BUILDFLOW</div>
              <Link href="/cart" className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm">
                <CartIcon />
                <span>{cartCount}</span>
              </Link>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.02fr_0.98fr]">
            <section className="border-b border-slate-100 bg-[#fbfdff] p-4 sm:p-6 lg:border-b-0 lg:border-r">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">{product.category}</div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <span className="font-medium text-amber-500">{renderStars(product.rating)}</span>
                    <span>{product.reviewLabel}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleSaved}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full border shadow-sm ${saved ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}`}
                  aria-label={saved ? "Remove from saved" : "Save product"}
                >
                  <BookmarkIcon filled={saved} />
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                <Image src={activeImage} alt={product.imageAlt} width={1200} height={1200} className="block h-[320px] w-full object-contain bg-white sm:h-[420px] lg:h-[520px]" priority />
              </div>

              <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {product.gallery.map((image, index) => (
                  <button
                    key={`${product.id}-image-${index}`}
                    type="button"
                    onClick={() => setActiveImage(image.imageUrl)}
                    className={`shrink-0 overflow-hidden rounded-2xl border bg-white p-1.5 shadow-sm transition ${activeImage === image.imageUrl ? "border-sky-400 ring-2 ring-sky-100" : "border-slate-200 hover:border-sky-200"}`}
                  >
                    <Image src={image.imageUrl} alt={image.imageAlt} width={180} height={180} className="h-16 w-16 object-contain sm:h-20 sm:w-20" />
                  </button>
                ))}
              </div>

              <div className="mt-3 flex justify-center gap-1.5">
                {product.gallery.map((image, index) => (
                  <span key={`${image.imageUrl}-${index}`} className={`h-2 w-2 rounded-full ${activeImage === image.imageUrl ? "bg-sky-700" : "bg-sky-200"}`} />
                ))}
              </div>
            </section>

            <section className="p-4 sm:p-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <h1 className="text-[1.8rem] font-bold leading-8 text-slate-950 sm:text-[2.1rem] sm:leading-9">{product.name}</h1>
                <div className="mt-2 text-sm text-slate-500">{product.unit} • {product.supplierName || "BuildFlow sample catalog"}</div>

                <div className="mt-5 flex items-end gap-1 text-slate-950">
                  <span className="text-[2.4rem] font-bold leading-none tracking-[-0.05em]">{price.dollars}</span>
                  <span className="pb-1 text-sm font-bold leading-none">.{price.cents}</span>
                </div>

                <div className="mt-4 rounded-[24px] bg-slate-50 p-4 text-sm leading-6 text-slate-700">{product.description}</div>

                <div className="mt-5 rounded-[24px] border border-slate-200 bg-[#f8fbff] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Quantity</div>
                      <div className="mt-1 text-sm text-slate-600">Adjust before adding to cart</div>
                    </div>
                    <div className="flex items-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
                      <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="h-11 w-11 text-lg text-slate-700" aria-label="Decrease quantity">−</button>
                      <span className="min-w-10 text-center text-sm font-semibold text-slate-950">{quantity}</span>
                      <button type="button" onClick={() => setQuantity((current) => current + 1)} className="h-11 w-11 text-lg text-slate-700" aria-label="Increase quantity">+</button>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <button
                    type="button"
                    onClick={addToCart}
                    className="inline-flex min-h-14 items-center justify-center rounded-full bg-emerald-500 px-5 text-base font-semibold text-white shadow-[0_18px_34px_rgba(34,197,94,0.28)] transition hover:bg-emerald-600"
                  >
                    Add to cart
                  </button>
                  <Link href="/cart" className="inline-flex min-h-14 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-base font-semibold text-slate-800 shadow-sm">
                    View cart
                  </Link>
                </div>

                <div className={`mt-4 rounded-[18px] border px-4 py-3 text-sm ${addedMessage ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-sky-100 bg-sky-50 text-slate-600"}`}>
                  {addedMessage ?? "Ready to add to cart. Saved items appear in the shop saved section."}
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <details open>
                  <summary className="cursor-pointer list-none px-5 py-4 text-base font-semibold text-slate-950">Product information</summary>
                  <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-700">
                    <div className="leading-6">{product.description}</div>
                    <div className="mt-4 grid gap-2">
                      <div><span className="font-medium text-slate-500">Spec:</span> {product.specLine}</div>
                      <div><span className="font-medium text-slate-500">Category:</span> {product.category}</div>
                      <div><span className="font-medium text-slate-500">Best use:</span> {product.popularUse}</div>
                      <div><span className="font-medium text-slate-500">Supplier:</span> {product.supplierName || "BuildFlow sample catalog"}</div>
                      <div><span className="font-medium text-slate-500">Source:</span> {product.quoteNumber || "Catalog reference"}</div>
                      <div><span className="font-medium text-slate-500">Image source:</span> {product.imageSource}</div>
                    </div>
                  </div>
                </details>
              </div>

              <div className="mt-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-base font-semibold text-slate-950">Quality snapshot</div>
                <div className="mt-2 text-sm text-slate-600">{product.rating.toFixed(1)} average rating based on current catalog presentation. Use this page to compare finish, unit, supplier, and intended use.</div>
              </div>
            </section>
          </div>

          <section className="border-t border-slate-100 bg-[#fbfdff] px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">Related materials</h2>
              <Link href="/shop" className="text-sm font-semibold text-sky-700">Back to shop</Link>
            </div>

            <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {relatedProducts.map((related) => {
                const relatedPrice = formatCurrencyParts(related.price)
                return (
                  <Link
                    key={related.id}
                    href={`/shop/${related.slug}`}
                    className="w-[188px] shrink-0 rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-2">
                      <Image src={related.imageUrl} alt={related.imageAlt} width={320} height={320} className="h-[140px] w-full object-contain bg-white" />
                    </div>
                    <div className="mt-3 line-clamp-2 text-sm font-semibold text-slate-900">{related.name}</div>
                    <div className="mt-1 text-xs text-amber-500">{renderStars(related.rating)} <span className="text-slate-500">{related.reviewLabel}</span></div>
                    <div className="mt-2 flex items-start gap-0.5 text-slate-950">
                      <span className="text-base font-bold">{relatedPrice.dollars}</span>
                      <span className="pt-0.5 text-[10px] font-bold">.{relatedPrice.cents}</span>
                    </div>
                    <div className="text-xs text-slate-500">{related.unit}</div>
                    <div className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">View details</div>
                  </Link>
                )
              })}
            </div>
          </section>
        </div>
      </section>

      {cartCount > 0 ? (
        <Link href="/cart" className="fixed bottom-4 left-1/2 z-40 inline-flex -translate-x-1/2 items-center gap-3 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_rgba(15,23,42,0.28)]">
          <CartIcon />
          <span>{cartCount} item{cartCount === 1 ? "" : "s"} in cart</span>
        </Link>
      ) : null}
    </main>
  )
}
