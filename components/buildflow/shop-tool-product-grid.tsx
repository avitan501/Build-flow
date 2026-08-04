"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

import { QualifyingQuestionsModal } from "@/components/buildflow/qualifying-questions-modal"
import { isManagerAddOnProductId } from "@/lib/manager-add-ons"
import type { ShopCatalogProduct } from "@/lib/shop-catalog"
import {
  readShopCartCount,
  readShopCartMap,
  readShopCustomCartItems,
  upsertShopCartItemDetails,
  upsertShopCustomCartItem,
  type ShopCartQualificationStatus,
  type ShopCartQuestionAnswer,
  writeShopCartMap,
} from "@/lib/shop-cart"
import { getQualificationSettingForProduct, type QualifyingQuestion } from "@/lib/shop-qualification"

type ShopToolProductGridProps = {
  products: ShopCatalogProduct[]
}

function formatCurrency(value: number) {
  const [dollars, cents] = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value).split(".")

  return { dollars, cents: cents ?? "00" }
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

export function ShopToolProductGrid({ products }: ShopToolProductGridProps) {
  const [message, setMessage] = useState<string | null>(null)
  const [qualificationTarget, setQualificationTarget] = useState<{
    product: ShopCatalogProduct
    customItemId?: string
    questions: QualifyingQuestion[]
  } | null>(null)

  function saveQualification(status: ShopCartQualificationStatus, answers: ShopCartQuestionAnswer[] = []) {
    if (!qualificationTarget) return

    if (qualificationTarget.customItemId) {
      const item = readShopCustomCartItems().find((entry) => entry.id === qualificationTarget.customItemId)
      if (item) {
        upsertShopCustomCartItem({ ...item, qualificationStatus: status, answers, updatedAt: new Date().toISOString() })
      }
      setQualificationTarget(null)
      return
    }

    upsertShopCartItemDetails({
      productId: qualificationTarget.product.id,
      productName: qualificationTarget.product.name,
      category: qualificationTarget.product.category,
      itemType: qualificationTarget.product.productType === "service" ? "service" : qualificationTarget.product.price <= 0 ? "custom-priced" : "material",
      qualificationStatus: status,
      answers,
      updatedAt: new Date().toISOString(),
    })
    setQualificationTarget(null)
  }

  function addToCart(product: ShopCatalogProduct) {
    const qualification = getQualificationSettingForProduct(product)
    const shouldAskQuestions = qualification.enabled && qualification.questions.length > 0 && (product.productType === "service" || product.price <= 0)

    if (isManagerAddOnProductId(product.id)) {
      const existing = readShopCustomCartItems().find((item) => item.id === product.id)
      const quantity = (existing?.quantity || 0) + 1
      const customItem = {
        id: product.id,
        name: product.name,
        category: product.category,
        quantity,
        unit: product.unit,
        unitPrice: product.price,
        qualificationStatus: shouldAskQuestions ? "pending" : (existing?.qualificationStatus ?? "not_required"),
        answers: existing?.answers ?? [],
        updatedAt: new Date().toISOString(),
      }
      upsertShopCustomCartItem(customItem)
      if (shouldAskQuestions) {
        setQualificationTarget({ product, customItemId: customItem.id, questions: qualification.questions })
      }
    } else {
      const current = readShopCartMap()
      const quantity = (current[product.id] || 0) + 1
      writeShopCartMap({ ...current, [product.id]: quantity })
      upsertShopCartItemDetails({
        productId: product.id,
        productName: product.name,
        category: product.category,
        itemType: product.productType === "service" ? "service" : product.price <= 0 ? "custom-priced" : "material",
        qualificationStatus: shouldAskQuestions ? "pending" : "not_required",
        answers: [],
        updatedAt: new Date().toISOString(),
      })
      if (shouldAskQuestions) {
        setQualificationTarget({ product, questions: qualification.questions })
      }
    }

    const count = readShopCartCount()
    setMessage(`${product.name} added to cart. Cart now has ${count} item${count === 1 ? "" : "s"}.`)
  }

  return (
    <section className="grid gap-3">
      {message ? (
        <div className="flex flex-col gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 shadow-[0_10px_28px_rgba(16,185,129,0.12)] sm:flex-row sm:items-center sm:justify-between">
          <span>{message}</span>
          <Link href="/cart" className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-white px-4 text-sm font-bold text-emerald-800 shadow-sm">
            View cart
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
        {products.map((product) => {
          const price = formatCurrency(product.price)
          const localOnly = isManagerAddOnProductId(product.id)

          return (
            <article
              key={product.id}
              className="flex h-full min-h-[244px] touch-manipulation flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition duration-200 active:scale-[0.99] active:border-sky-300"
            >
              {localOnly ? (
                <div className="block border-b border-slate-100 bg-slate-50/70 p-2.5 sm:p-3">
                  <div className="relative aspect-square w-full overflow-hidden rounded-[18px] bg-white">
                    <Image
                      src={product.imageUrl}
                      alt={product.imageAlt}
                      fill
                      sizes="(min-width: 1280px) 18vw, (min-width: 768px) 24vw, 42vw"
                      className="object-contain p-2"
                    />
                  </div>
                </div>
              ) : (
                <Link href={`/shop/${product.slug}`} className="block border-b border-slate-100 bg-slate-50/70 p-2.5 sm:p-3">
                  <div className="relative aspect-square w-full overflow-hidden rounded-[18px] bg-white">
                    <Image
                      src={product.imageUrl}
                      alt={product.imageAlt}
                      fill
                      sizes="(min-width: 1280px) 18vw, (min-width: 768px) 24vw, 42vw"
                      className="object-contain p-2"
                    />
                  </div>
                </Link>
              )}

              <div className="flex flex-1 flex-col p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {product.price > 0 ? (
                      <div className="flex items-start gap-0.5 text-slate-950">
                        <span className="text-[1.15rem] font-bold leading-none">{price.dollars}</span>
                        <span className="pt-0.5 text-[11px] font-bold leading-none">.{price.cents}</span>
                      </div>
                    ) : (
                      <div className="text-[1.05rem] font-bold leading-none text-slate-950">Get pricing</div>
                    )}
                    <div className="mt-0.5 text-[11px] font-medium text-slate-500">{product.unit}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_12px_24px_rgba(34,197,94,0.28)] transition hover:bg-emerald-600"
                    aria-label={`Add ${product.name} to cart`}
                  >
                    <PlusIcon />
                  </button>
                </div>

                {localOnly ? (
                  <div className="mt-2.5 block text-[0.92rem] font-semibold leading-5 text-slate-900">
                    <span className="line-clamp-2">{product.name}</span>
                  </div>
                ) : (
                  <Link href={`/shop/${product.slug}`} className="mt-2.5 block text-[0.92rem] font-semibold leading-5 text-slate-900">
                    <span className="line-clamp-2">{product.name}</span>
                  </Link>
                )}

                <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-slate-600">{product.shortDescription || product.description}</p>

                <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                  <div className="min-w-0 truncate text-[11px] font-medium text-slate-500">{product.supplierName || product.availability || "Available"}</div>
                  {localOnly ? (
                    <span className="shrink-0 text-[11px] font-semibold text-sky-700">Manager item</span>
                  ) : (
                    <Link href={`/shop/${product.slug}`} className="shrink-0 text-[11px] font-semibold text-sky-700">
                      Details
                    </Link>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <QualifyingQuestionsModal
        open={Boolean(qualificationTarget)}
        title={qualificationTarget?.product.name || "Service questions"}
        questions={qualificationTarget?.questions || []}
        onClose={() => saveQualification("skipped")}
        onSave={(answers) => saveQualification("answered", answers)}
        onSkip={() => saveQualification("skipped")}
      />
    </section>
  )
}
