"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import type { ShopCatalogProduct } from "@/lib/shop-catalog"
import { SHOP_CART_UPDATED_EVENT, readShopCartMap, writeShopCartMap } from "@/lib/shop-cart"

type ShopCartExperienceProps = {
  products: ShopCatalogProduct[]
}

type CartLine = {
  product: ShopCatalogProduct
  quantity: number
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

export function ShopCartExperience({ products }: ShopCartExperienceProps) {
  const [cartMap, setCartMap] = useState<Record<string, number>>({})
  const [checkoutReady, setCheckoutReady] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const syncCart = () => setCartMap(readShopCartMap())
    syncCart()
    window.addEventListener("storage", syncCart)
    window.addEventListener(SHOP_CART_UPDATED_EVENT, syncCart as EventListener)

    return () => {
      window.removeEventListener("storage", syncCart)
      window.removeEventListener(SHOP_CART_UPDATED_EVENT, syncCart as EventListener)
    }
  }, [])

  const cartLines = useMemo<CartLine[]>(() => {
    return Object.entries(cartMap)
      .filter(([, quantity]) => quantity > 0)
      .map(([productId, quantity]) => ({ product: products.find((candidate) => candidate.id === productId), quantity }))
      .filter((line): line is CartLine => Boolean(line.product))
  }, [cartMap, products])

  const itemCount = cartLines.reduce((sum, line) => sum + line.quantity, 0)
  const subtotal = cartLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0)
  const estimatedFees = subtotal > 0 ? subtotal * 0.085 : 0
  const total = subtotal + estimatedFees

  function updateQuantity(productId: string, quantity: number) {
    const next = { ...readShopCartMap() }
    if (quantity <= 0) {
      delete next[productId]
    } else {
      next[productId] = quantity
    }
    setCartMap(next)
    writeShopCartMap(next)
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eaf4ff_0%,#f8fbff_42%,#ffffff_100%)] px-4 py-4 pb-28 text-slate-950 sm:px-8 sm:pb-10 lg:px-10 lg:pb-12">
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,247,255,0.95))] p-5 shadow-[0_18px_44px_rgba(148,163,184,0.14)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Client cart</div>
              <h1 className="mt-2 text-[1.7rem] font-semibold tracking-[-0.04em] text-slate-950">Review your order request</h1>
              <p className="mt-2 text-sm text-slate-600">Preview quantities, remove items, and send a clean order request when ready.</p>
            </div>
            <Link href="/shop" className="inline-flex items-center rounded-full border border-sky-100 bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              Continue shopping
            </Link>
          </div>
        </div>

        {cartLines.length === 0 ? (
          <section className="rounded-[28px] border border-dashed border-sky-200 bg-white/92 p-8 text-center shadow-[0_18px_42px_rgba(148,163,184,0.1)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-3xl">🛒</div>
            <h2 className="mt-4 text-xl font-semibold text-slate-950">Your cart is empty</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Add materials from the shop to build an order request preview.</p>
            <Link href="/shop" className="mt-5 inline-flex items-center rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(14,116,244,0.2)] transition hover:-translate-y-0.5 hover:bg-sky-700">
              Browse materials
            </Link>
          </section>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="space-y-4">
              {cartLines.map(({ product, quantity }, index) => {
                const lineSubtotal = product.price * quantity

                return (
                  <article
                    key={product.id}
                    className="rounded-[24px] border border-white/80 bg-white/96 p-4 shadow-[0_18px_42px_rgba(148,163,184,0.12)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_46px_rgba(148,163,184,0.16)]"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className="flex gap-4">
                      <Link href={`/shop/${product.slug}`} className="w-24 shrink-0 overflow-hidden rounded-[18px] border border-slate-100 bg-slate-50 sm:w-28">
                        <img src={product.image} alt={product.name} className="h-24 w-full object-cover transition duration-300 hover:scale-105 sm:h-28" loading="lazy" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/shop/${product.slug}`} className="line-clamp-2 text-base font-semibold text-slate-950 hover:text-sky-700">
                          {product.name}
                        </Link>
                        <div className="mt-1 text-sm text-slate-500">{product.unit}</div>
                        <div className="mt-2 text-lg font-semibold text-slate-950">{formatCurrency(product.price)}</div>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <div className="flex items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                            <button type="button" onClick={() => updateQuantity(product.id, quantity - 1)} className="h-10 w-10 text-lg text-slate-700">−</button>
                            <span className="min-w-10 text-center text-sm font-semibold text-slate-950">{quantity}</span>
                            <button type="button" onClick={() => updateQuantity(product.id, quantity + 1)} className="h-10 w-10 text-lg text-slate-700">+</button>
                          </div>
                          <button type="button" onClick={() => updateQuantity(product.id, 0)} className="text-sm font-semibold text-sky-700">
                            Remove
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Subtotal</div>
                        <div className="mt-1 text-base font-semibold text-slate-950">{formatCurrency(lineSubtotal)}</div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>

            <aside className="rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,247,255,0.95))] p-5 shadow-[0_18px_44px_rgba(148,163,184,0.14)] lg:sticky lg:top-24 lg:self-start">
              <h2 className="text-xl font-semibold text-slate-950">Order summary</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Items</span>
                  <span>{itemCount}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Estimated tax / fees</span>
                  <span>{formatCurrency(estimatedFees)}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 text-base font-semibold text-slate-950">
                  <div className="flex items-center justify-between">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCheckoutReady(true)}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#FFD814] px-4 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-[#f7ca00]"
              >
                Checkout preview — send order request
              </button>

              <div className={`mt-4 rounded-[18px] border px-4 py-3 text-sm ${checkoutReady ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white/80 text-slate-600"}`}>
                {checkoutReady ? "Order request ready. This is a preview flow only until live checkout is connected." : "This cart stays local for now. Finalizing prepares a clean order request, not a payment."}
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  )
}
