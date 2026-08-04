"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"

import { createQuoteFromCartAction } from "@/app/cart/actions"
import type { ProjectRecord } from "@/lib/projects"
import type { ShopCatalogProduct } from "@/lib/shop-catalog"
import { calculateShopCartTax } from "@/lib/shop-checkout"
import {
  SHOP_CART_UPDATED_EVENT,
  readShopCartDetailsMap,
  readShopCartMap,
  readShopCustomCartItems,
  removeShopCartItemDetails,
  removeShopCustomCartItem,
  writeShopCartMap,
  type ShopCartItemDetails,
  type ShopCustomCartItem,
} from "@/lib/shop-cart"

type ShopCartExperienceProps = {
  products: ShopCatalogProduct[]
  projects: Pick<ProjectRecord, "id" | "name" | "address" | "status">[]
  isSignedIn: boolean
  feedbackCode: string | null
  feedbackTone: "success" | "error" | null
}

type CartLine = {
  product: ShopCatalogProduct
  quantity: number
  details?: ShopCartItemDetails
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

const cartStatusMessages = {
  "project-required": { tone: "error", text: "Choose a project before sending the quote request." },
  "project-not-found": { tone: "error", text: "We could not confirm that project for your account." },
  "cart-empty": { tone: "error", text: "Add at least one item before requesting a quote." },
  "cart-items-load-failed": { tone: "error", text: "Cart items could not be checked. Please try again." },
  "cart-items-invalid": { tone: "error", text: "The cart items are no longer available in the shop catalog." },
  "cart-total-invalid": { tone: "error", text: "The cart must include at least one valid material or service request." },
  "cart-quote-create-failed": { tone: "error", text: "The quote could not be created. Please try again." },
  "cart-quote-items-create-failed": { tone: "error", text: "The quote was not completed because its items could not be saved." },
} as const

export function ShopCartExperience({ products, projects, isSignedIn, feedbackCode, feedbackTone }: ShopCartExperienceProps) {
  const [cartMap, setCartMap] = useState<Record<string, number>>({})
  const [cartDetailsMap, setCartDetailsMap] = useState<Record<string, ShopCartItemDetails>>({})
  const [customCartItems, setCustomCartItems] = useState<ShopCustomCartItem[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "")

  useEffect(() => {
    if (typeof window === "undefined") return

    const syncCart = () => {
      setCartMap(readShopCartMap())
      setCartDetailsMap(readShopCartDetailsMap())
      setCustomCartItems(readShopCustomCartItems())
    }
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
      .flatMap(([productId, quantity]) => {
        const product = products.find((candidate) => candidate.id === productId)
        return product ? [{ product, quantity, details: cartDetailsMap[productId] }] : []
      })
  }, [cartDetailsMap, cartMap, products])

  const itemCount = cartLines.reduce((sum, line) => sum + line.quantity, 0) + customCartItems.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cartLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0) + customCartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const estimatedFees = subtotal > 0 ? calculateShopCartTax(subtotal) : 0
  const total = subtotal + estimatedFees
  const cartLinesPayload = JSON.stringify(cartLines.map((line) => ({ productId: line.product.id, quantity: line.quantity })))
  const cartDetailsPayload = JSON.stringify(cartLines.map((line) => line.details).filter(Boolean))
  const customLinesPayload = JSON.stringify(customCartItems)
  const feedback: { tone: "success" | "error"; text: string } | null =
    feedbackCode && feedbackTone
      ? cartStatusMessages[feedbackCode as keyof typeof cartStatusMessages] || { tone: feedbackTone, text: feedbackTone === "success" ? "Saved successfully." : "The request could not be completed." }
      : null

  function updateQuantity(productId: string, quantity: number) {
    const next = { ...readShopCartMap() }
    if (quantity <= 0) {
      delete next[productId]
      removeShopCartItemDetails(productId)
    } else {
      next[productId] = quantity
    }
    setCartMap(next)
    writeShopCartMap(next)
  }

  function qualificationLabel(status: ShopCartItemDetails["qualificationStatus"]) {
    if (status === "answered") return "Questions answered"
    if (status === "skipped") return "Questions skipped"
    if (status === "pending") return "Questions pending"
    return "No questions needed"
  }

  function AnswerSummary({ details }: { details?: Pick<ShopCartItemDetails, "qualificationStatus" | "answers"> | null }) {
    if (!details) return null
    return (
      <div className="mt-3 rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{qualificationLabel(details.qualificationStatus)}</div>
        {details.answers.length > 0 ? (
          <dl className="mt-2 grid gap-2 text-xs leading-5 text-slate-600">
            {details.answers.map((answer) => (
              <div key={answer.questionId}>
                <dt className="font-semibold text-slate-800">{answer.label}</dt>
                <dd>{answer.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eaf4ff_0%,#f8fbff_42%,#ffffff_100%)] px-4 py-4 pb-28 text-slate-950 sm:px-8 sm:pb-10 lg:px-10 lg:pb-12">
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        {cartLines.length === 0 && customCartItems.length === 0 ? (
          <section className="rounded-[28px] border border-dashed border-sky-200 bg-white/92 p-8 text-center shadow-[0_18px_42px_rgba(148,163,184,0.1)]">
            <h1 className="text-xl font-semibold text-slate-950">Your cart is empty</h1>
            <Link href="/shop/materials" className="mt-5 inline-flex items-center rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(14,116,244,0.2)] transition hover:-translate-y-0.5 hover:bg-sky-700">
              Browse materials
            </Link>
          </section>
        ) : (
          <>
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
                        <Image src={product.imageUrl} alt={product.imageAlt} width={240} height={240} className="h-24 w-full object-contain transition duration-300 hover:scale-105 sm:h-28" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/shop/${product.slug}`} className="line-clamp-2 text-base font-semibold text-slate-950 hover:text-sky-700">
                          {product.name}
                        </Link>
                        <div className="mt-1 text-sm text-slate-500">{product.unit}</div>
                        <div className="mt-2 text-lg font-semibold text-slate-950">{formatCurrency(product.price)}</div>
                        <AnswerSummary details={cartDetailsMap[product.id]} />

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

              {customCartItems.map((item) => (
                <article key={item.id} className="rounded-[24px] border border-white/80 bg-white/96 p-4 shadow-[0_18px_42px_rgba(148,163,184,0.12)]">
                  <div className="flex gap-4">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[18px] border border-slate-100 bg-slate-50 text-slate-500 sm:w-28">
                      <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 3h12l4 4v14H4z" />
                        <path d="M16 3v5h5" />
                        <path d="M8 13h8" />
                        <path d="M8 17h5" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-base font-semibold text-slate-950">{item.name}</div>
                      <div className="mt-1 text-sm text-slate-500">{item.fileName || item.category}</div>
                      <div className="mt-2 text-lg font-semibold text-slate-950">Get pricing</div>
                      <AnswerSummary details={item} />
                      <button type="button" onClick={() => removeShopCustomCartItem(item.id)} className="mt-3 text-sm font-semibold text-sky-700">
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <aside className="rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,247,255,0.95))] p-5 shadow-[0_18px_44px_rgba(148,163,184,0.14)] lg:sticky lg:top-24 lg:self-start">
              <h2 className="text-xl font-semibold text-slate-950">Order summary</h2>

              {feedback ? (
                <div className={`mt-4 rounded-[18px] border px-4 py-3 text-sm ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-900"}`}>
                  {feedback.text}
                </div>
              ) : null}

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

              <form action={createQuoteFromCartAction} className="mt-5 grid gap-4">
                <input type="hidden" name="cartLines" value={cartLinesPayload} />
                <input type="hidden" name="cartDetails" value={cartDetailsPayload} />
                <input type="hidden" name="customLines" value={customLinesPayload} />

                {isSignedIn ? (
                  projects.length > 0 ? (
                    <label className="grid gap-2 text-sm font-semibold text-slate-900">
                      <span>Project</span>
                      <select
                        name="projectId"
                        value={selectedProjectId}
                        onChange={(event) => setSelectedProjectId(event.target.value)}
                        className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                      >
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <Link href="/projects/new?next=%2Fcart" className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-sky-200 bg-white px-4 text-sm font-semibold text-sky-700">
                      Create project first
                    </Link>
                  )
                ) : (
                  <Link href="/login?next=%2Fcart" className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-sky-200 bg-white px-4 text-sm font-semibold text-sky-700">
                    Sign in to request quote
                  </Link>
                )}

                <button
                  type="submit"
                  disabled={!isSignedIn || projects.length === 0 || itemCount === 0}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#FFD814] px-4 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-[#f7ca00] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
                >
                  Request quote
                </button>
              </form>

              <div className="mt-4 rounded-[18px] border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
                Request quote saves this cart as a draft project quote. After approval, it can become an order with a saved PDF.
              </div>
            </aside>
          </div>
          </>
        )}
      </section>
    </main>
  )
}
