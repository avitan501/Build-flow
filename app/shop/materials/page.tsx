import Image from "next/image"
import Link from "next/link"

import { buildShopProducts } from "@/lib/shop-catalog"
import { loadShopItems } from "@/lib/shop-loader"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export default async function ShopMaterialsPage() {
  const { data: itemsData, error } = await loadShopItems({ limit: 240 })
  const products = buildShopProducts(itemsData, error).filter((product) => product.productType !== "service")

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#f8fbff_45%,#eef4fb_100%)] px-4 py-4 pb-28 text-slate-900 sm:px-6 sm:py-5 sm:pb-10 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-4">
        <section className="rounded-[30px] border border-sky-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,248,255,0.94))] p-5 shadow-[0_18px_40px_rgba(148,163,184,0.12)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Shop</p>
              <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2.6rem]">Materials</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">All material items in one place.</p>
            </div>
            <Link
              href="/shop"
              prefetch={false}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_8px_18px_rgba(148,163,184,0.08)] transition hover:bg-slate-50"
            >
              Back to Shop
            </Link>
          </div>
        </section>

        {products.length === 0 ? (
          <section className="rounded-[28px] border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500 shadow-[0_14px_34px_rgba(148,163,184,0.08)]">
            Materials will appear here when available.
          </section>
        ) : (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-[24px] border border-sky-100 bg-white shadow-[0_12px_30px_rgba(148,163,184,0.10)]"
              >
                <Link href={`/shop/${product.slug}`} prefetch={false} className="block border-b border-slate-100 bg-slate-50/70 p-3">
                  <div className="relative aspect-[1.1/1] w-full overflow-hidden rounded-[18px] bg-white">
                    <Image
                      src={product.imageUrl}
                      alt={product.imageAlt}
                      fill
                      sizes="(min-width: 1280px) 24vw, (min-width: 640px) 42vw, 92vw"
                      className="object-contain p-3"
                    />
                  </div>
                </Link>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">{product.category}</div>
                      <h2 className="mt-1 line-clamp-2 text-[1rem] font-semibold leading-6 text-slate-950">{product.name}</h2>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-base font-bold text-slate-950">{formatCurrency(product.price)}</div>
                      <div className="mt-1 text-[11px] font-medium text-slate-500">{product.unit}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 text-sm text-slate-500">{product.supplierName || product.availability || "Available"}</div>
                    <Link
                      href={`/shop/${product.slug}`}
                      prefetch={false}
                      className="inline-flex items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                    >
                      View details
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </section>
    </main>
  )
}
