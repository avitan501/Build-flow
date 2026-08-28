"use client"

import Image from "next/image"
import Link from "next/link"

import { AddToProjectButton } from "@/components/buildflow/add-to-project-button"
import { isManagerAddOnProductId } from "@/lib/manager-add-ons"
import type { ShopCatalogProduct } from "@/lib/shop-catalog"

type ShopToolProductGridProps = {
  products: ShopCatalogProduct[]
  questionnaireDepartment?: string
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

export function ShopToolProductGrid({ products, questionnaireDepartment }: ShopToolProductGridProps) {
  return (
    <section className="grid gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
        {products.map((product) => {
          const price = formatCurrency(product.price)
          const localOnly = isManagerAddOnProductId(product.id)

          return (
            <article
              key={product.id}
              className="flex h-full min-h-[244px] touch-manipulation flex-col overflow-hidden rounded-[28px] border border-white bg-white shadow-[0_16px_36px_rgba(0,0,0,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_46px_rgba(0,0,0,0.12)] active:scale-[0.99] active:border-sky-300"
            >
              {localOnly ? (
                <div className="block border-b border-slate-100 bg-[#f5f5f7] p-2.5 sm:p-3">
                  <div className="relative aspect-square w-full overflow-hidden rounded-[24px] bg-white">
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
                <Link href={`/shop/${product.slug}`} prefetch={false} className="block border-b border-slate-100 bg-[#f5f5f7] p-2.5 sm:p-3">
                  <div className="relative aspect-square w-full overflow-hidden rounded-[24px] bg-white">
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
                    {product.bulkPrice ? (
                      <div className="mt-1 text-[11px] font-bold text-red-600">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(product.bulkPrice)} bulk · {product.bulkMinimum}
                      </div>
                    ) : null}
                  </div>
                  <AddToProjectButton product={product} compact questionnaireDepartment={questionnaireDepartment} />
                </div>

                {localOnly ? (
                  <div className="mt-2.5 block text-[0.92rem] font-semibold leading-5 text-slate-900">
                    <span className="line-clamp-2">{product.name}</span>
                  </div>
                ) : (
                  <Link href={`/shop/${product.slug}`} prefetch={false} className="mt-2.5 block text-[0.92rem] font-semibold leading-5 text-slate-900">
                    <span className="line-clamp-2">{product.name}</span>
                  </Link>
                )}

                <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-slate-600">{product.shortDescription || product.description}</p>

                <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                  <div className="min-w-0 truncate text-[11px] font-medium text-slate-500">{product.supplierName || product.availability || "Available"}</div>
                  {localOnly ? (
                    <span className="shrink-0 text-[11px] font-semibold text-sky-700">Manager item</span>
                  ) : (
                    <Link href={`/shop/${product.slug}`} prefetch={false} className="shrink-0 text-[11px] font-semibold text-sky-700">
                      Details
                    </Link>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>

    </section>
  )
}
