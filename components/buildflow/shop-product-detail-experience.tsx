"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"

import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup"
import { AddToProjectButton } from "@/components/buildflow/add-to-project-button"
import { ShopTranslationBoundary } from "@/components/buildflow/shop-language-provider"
import { recordShopActivity } from "@/app/shop/actions"
import type { ShopCatalogProduct } from "@/lib/shop-catalog"
import { getShopActivitySessionId, writeLocalShopActivity } from "@/lib/shop-activity"
import {
  SHOP_SAVE_UPDATED_EVENT,
  readShopSavedIds,
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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
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
  const isService = product.productType === "service"
  const [activeImage, setActiveImage] = useState(product.gallery[0]?.imageUrl || product.imageUrl)
  const galleryScrollRef = useRef<HTMLDivElement>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const sync = () => {
      setSaved(readShopSavedIds().includes(product.id))
    }

    sync()

    writeLocalShopActivity({ eventType: "product_view", productSlug: product.slug, productName: product.name, category: product.category })
    void recordShopActivity({
      eventType: "product_view",
      sessionId: getShopActivitySessionId(),
      productSlug: product.slug,
      productName: product.name,
      category: product.category,
      metadata: { productType: product.productType || "material" },
    })
    window.addEventListener(SHOP_SAVE_UPDATED_EVENT, sync)
    return () => {
      window.removeEventListener(SHOP_SAVE_UPDATED_EVENT, sync)
    }
  }, [product.category, product.id, product.name, product.productType, product.slug])

  function toggleSaved() {
    const current = readShopSavedIds()
    const next = current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id]
    writeShopSavedIds(next)
    setSaved(next.includes(product.id))
  }

  const price = formatCurrencyParts(product.price)
  const infoTitle = isService ? "Service information" : "Product information"
  const relatedTitle = isService ? "Related shop items" : "Related materials"
  const quoteHref = product.quoteNumber?.startsWith("http") ? product.quoteNumber : null

  function scrollToImage(index: number) {
    const container = galleryScrollRef.current
    if (!container) return
    const target = container.children[index] as HTMLElement | undefined
    target?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })
  }

  return (
    <ShopTranslationBoundary>
    <main className="min-h-screen bg-[#f4f7fb] pb-28 text-slate-950">
      <section className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
        <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_16px_44px_rgba(15,23,42,0.08)] sm:rounded-[30px]">
          <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Link href="/shop" prefetch={false} className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm">
                  Back
                </Link>
                <Link href="/shop" prefetch={false} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm" aria-label="Search products">
                  <SearchIcon />
                </Link>
              </div>
              <AvantiaBuildLockup compact />
              <Link href="/account" prefetch={false} className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                Account
              </Link>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[0.94fr_1.06fr]">
            <section className="border-b border-slate-100 bg-[#fbfdff] p-4 sm:p-6 lg:border-b-0 lg:border-r">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">{product.category}</div>
                  <div className="mt-2 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">{isService ? "Professional service" : "New catalog item"}</div>
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

              <div
                ref={galleryScrollRef}
                className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:rounded-[28px] sm:p-4"
                onScroll={(event) => {
                  const container = event.currentTarget
                  const children = Array.from(container.children) as HTMLElement[]
                  const next = children.reduce(
                    (closest, child, index) => {
                      const delta = Math.abs(child.offsetLeft - container.scrollLeft)
                      return delta < closest.delta ? { index, delta } : closest
                    },
                    { index: 0, delta: Number.POSITIVE_INFINITY },
                  )
                  setActiveImage(product.gallery[next.index]?.imageUrl || product.imageUrl)
                }}
              >
                {product.gallery.map((image, index) => (
                  <div key={`${product.id}-slide-${index}`} className="relative h-[240px] w-full shrink-0 snap-center overflow-hidden rounded-[20px] bg-white sm:h-[320px] lg:h-[420px]">
                    <Image src={image.imageUrl} alt={image.imageAlt} fill sizes="(min-width: 1024px) 42vw, 100vw" className="object-contain" priority={index === 0} />
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-3">
                {product.gallery.map((image, index) => (
                  <button
                    key={`${product.id}-image-${index}`}
                    type="button"
                    onClick={() => {
                      setActiveImage(image.imageUrl)
                      scrollToImage(index)
                    }}
                    className={`shrink-0 overflow-hidden rounded-xl border bg-white p-1 shadow-sm transition sm:rounded-2xl sm:p-1.5 ${activeImage === image.imageUrl ? "border-sky-400 ring-2 ring-sky-100" : "border-slate-200 hover:border-sky-200"}`}
                  >
                    <Image src={image.imageUrl} alt={image.imageAlt} width={180} height={180} className="h-12 w-12 object-contain sm:h-16 sm:w-16 lg:h-20 lg:w-20" />
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
              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
                <h1 className="text-[1.45rem] font-bold leading-7 text-slate-950 sm:text-[2.1rem] sm:leading-9">{product.name}</h1>
                <div className="mt-2 text-sm text-slate-500">
                  <span>{product.unit}</span>
                </div>

                {product.price > 0 ? (
                  <div className="mt-4 flex items-end gap-1 text-slate-950">
                    <span className="text-[2.4rem] font-bold leading-none tracking-[-0.05em]">{price.dollars}</span>
                    <span className="pb-1 text-sm font-bold leading-none">.{price.cents}</span>
                  </div>
                ) : (
                  <div className="mt-4 text-[2rem] font-bold leading-none text-slate-950">Get pricing</div>
                )}

                <div className="mt-4 rounded-[20px] bg-slate-50 p-4 text-sm leading-6 text-slate-700 sm:rounded-[24px]">{product.description}</div>

                {product.detailBullets && product.detailBullets.length > 0 ? (
                  <div className="mt-4 rounded-[20px] border border-slate-200 bg-white p-4 sm:rounded-[24px]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">What is included</div>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                      {product.detailBullets.map((bullet) => (
                        <li key={bullet} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-sky-500" /> <span>{bullet}</span></li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {product.price > 0 ? (
                  <>
                    <div className="mt-4 rounded-[20px] border border-slate-200 bg-[#f8fbff] p-4 sm:rounded-[24px]">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Quantity</div>
                          <div className="mt-1 text-sm text-slate-600">Adjust before adding to the project</div>
                        </div>
                        <div className="flex items-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
                          <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="h-11 w-11 text-lg text-slate-700" aria-label="Decrease quantity">−</button>
                          <span className="min-w-10 text-center text-sm font-semibold text-slate-950">{quantity}</span>
                          <button type="button" onClick={() => setQuantity((current) => current + 1)} className="h-11 w-11 text-lg text-slate-700" aria-label="Increase quantity">+</button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <AddToProjectButton product={product} quantity={quantity} className="min-h-14 w-full text-base" />
                    </div>
                  </>
                ) : (
                  <div className="mt-4 rounded-[20px] border border-sky-100 bg-sky-50 p-4 sm:rounded-[24px]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">Custom priced service</div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">This service is quoted by project scope, property type, deliverables, and timeline.</p>
                    {quoteHref ? (
                      <a href={quoteHref} className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full border border-sky-200 bg-white px-5 text-sm font-semibold text-sky-700 transition hover:bg-sky-50">
                        View service source
                      </a>
                    ) : null}
                    <AddToProjectButton product={product} className="mt-3 w-full" />
                  </div>
                )}
              </div>

              <div className="mt-4 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <details open>
                  <summary className="cursor-pointer list-none px-5 py-4 text-base font-semibold text-slate-950">{infoTitle}</summary>
                  <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-700">
                    <div className="leading-6">{product.description}</div>
                    <div className="mt-4 grid gap-2">
                      <div><span className="font-medium text-slate-500">{isService ? "Service scope:" : "Product specs:"}</span> {product.specLine}</div>
                      <div><span className="font-medium text-slate-500">Unit:</span> {product.unit}</div>
                      <div><span className="font-medium text-slate-500">Best use:</span> {product.popularUse}</div>
                      {product.category !== "Liquidation" ? <div><span className="font-medium text-slate-500">Supplier:</span> {product.supplierName || "Avantia Build sample catalog"}</div> : null}
                      {product.category !== "Liquidation" ? <div><span className="font-medium text-slate-500">Source:</span> {product.quoteNumber || "Catalog reference"}</div> : null}
                    </div>
                  </div>
                </details>
              </div>

            </section>
          </div>

          <section className="border-t border-slate-100 bg-[#fbfdff] px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">{relatedTitle}</h2>
              <Link href="/shop" prefetch={false} className="text-sm font-semibold text-sky-700">Back to shop</Link>
            </div>

            <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-4 lg:overflow-visible">
              {relatedProducts.map((related) => {
                const relatedPrice = related.price > 0 ? formatCurrencyParts(related.price) : null
                return (
                  <Link
                    key={related.id}
                    href={`/shop/${related.slug}`}
                    prefetch={false}
                    className="w-[176px] shrink-0 rounded-[20px] border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:w-[188px] lg:w-auto"
                  >
                    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-2">
                      <Image src={related.imageUrl} alt={related.imageAlt} width={320} height={320} className="h-[116px] w-full object-contain bg-white sm:h-[140px]" />
                    </div>
                    <div className="mt-3 line-clamp-2 text-sm font-semibold text-slate-900">{related.name}</div>
                    {relatedPrice ? (
                      <div className="mt-2 flex items-start gap-0.5 text-slate-950">
                        <span className="text-base font-bold">{relatedPrice.dollars}</span>
                        <span className="pt-0.5 text-[10px] font-bold">.{relatedPrice.cents}</span>
                      </div>
                    ) : (
                      <div className="mt-2 text-base font-bold text-slate-950">Get pricing</div>
                    )}
                    <div className="text-xs text-slate-500">{related.unit}</div>
                    <div className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">View details</div>
                  </Link>
                )
              })}
            </div>
          </section>
        </div>
      </section>

    </main>
    </ShopTranslationBoundary>
  )
}
