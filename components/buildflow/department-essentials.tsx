"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Check, X } from "lucide-react"
import { useEffect, useState } from "react"

import type { CatalogEssentialItem, DepartmentEssentials as DepartmentEssentialsData } from "@/lib/department-essentials"

const SPRITE_POSITIONS = [
  "0% 0%",
  "33.333% 0%",
  "66.667% 0%",
  "100% 0%",
  "0% 100%",
  "33.333% 100%",
  "66.667% 100%",
  "100% 100%",
]

export function DepartmentEssentials({ data }: { data: DepartmentEssentialsData }) {
  const hasExtendedCatalog = data.items.length > 8
  const [selectedItem, setSelectedItem] = useState<CatalogEssentialItem | null>(null)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedItem) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedItem(null)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [selectedItem])

  return (
    <section aria-labelledby="department-essentials-heading" className="py-3 sm:py-5">
      <h2 id="department-essentials-heading" className="mb-4 text-lg font-semibold text-slate-950 sm:text-xl">Common materials</h2>

      <div
        className={hasExtendedCatalog
          ? "grid grid-cols-3 gap-x-4 gap-y-5 sm:grid-cols-5 sm:gap-x-6"
          : "grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-8 sm:gap-x-5"}
        data-testid="department-essentials"
      >
        {data.items.map((item, index) => {
          const name = typeof item === "string" ? item : item.name
          const imageUrl = typeof item === "string" ? data.spriteUrl : item.imageUrl
          const hasDetails = typeof item !== "string" && Boolean(item.description)
          const image = (
            <div
              role="img"
              aria-label={name}
              className={hasDetails
                ? "relative aspect-square w-full overflow-hidden rounded-md border border-slate-200 bg-white bg-no-repeat mix-blend-multiply shadow-sm transition group-hover:border-sky-300 group-hover:shadow-md"
                : "aspect-square w-full bg-white bg-no-repeat mix-blend-multiply"}
              style={{
                backgroundImage: `url(${imageUrl})`,
                backgroundPosition: typeof item === "string" ? SPRITE_POSITIONS[index] : "center",
                backgroundSize: typeof item === "string" ? "400% 200%" : "contain",
              }}
            />
          )
          const title = <h3 className="mt-2 line-clamp-2 text-[11px] font-semibold leading-[14px] text-slate-900 sm:text-xs sm:leading-4">{name}</h3>

          return (
            <article key={name} className="min-w-0 text-center">
              {hasDetails ? (
                <button
                  type="button"
                  onClick={() => {
                    const product = item as CatalogEssentialItem
                    setSelectedItem(product)
                    setSelectedImageUrl(product.imageUrls?.[0] ?? product.imageUrl)
                  }}
                  className="group w-full min-w-0 text-center"
                  aria-label={`View ${name}`}
                >
                  {image}
                  {title}
                </button>
              ) : (
                <>
                  {image}
                  {title}
                </>
              )}
            </article>
          )
        })}
      </div>

      {selectedItem ? (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelectedItem(null)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="essential-product-title"
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-white shadow-2xl sm:max-w-4xl sm:rounded-lg"
            data-testid="essential-product-dialog"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-sky-700">Avantia product details</p>
              <button type="button" onClick={() => setSelectedItem(null)} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:bg-slate-100" aria-label="Close product details">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="grid sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="border-b border-slate-200 bg-[#f7f8fa] sm:border-b-0 sm:border-r">
                <div className="relative min-h-64 sm:min-h-[430px]">
                  <Image src={selectedImageUrl ?? selectedItem.imageUrl} alt={selectedItem.name} fill sizes="(max-width: 640px) 100vw, 45vw" className="object-contain p-5 sm:p-8" />
                </div>
                {(selectedItem.imageUrls?.length ?? 0) > 1 ? (
                  <div className="flex gap-2 overflow-x-auto border-t border-slate-200 bg-white p-3" aria-label={`${selectedItem.name} photos`}>
                    {selectedItem.imageUrls?.map((imageUrl, index) => (
                      <button
                        key={imageUrl}
                        type="button"
                        onClick={() => setSelectedImageUrl(imageUrl)}
                        aria-label={`View photo ${index + 1} of ${selectedItem.name}`}
                        aria-pressed={(selectedImageUrl ?? selectedItem.imageUrl) === imageUrl}
                        className="relative aspect-square w-16 shrink-0 overflow-hidden rounded-md border-2 border-slate-200 bg-[#f7f8fa] transition aria-pressed:border-sky-600 sm:w-[72px]"
                      >
                        <Image src={imageUrl} alt="" fill sizes="72px" className="object-contain p-1" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="p-5 sm:p-8">
                <h2 id="essential-product-title" className="text-2xl font-semibold leading-tight text-slate-950 sm:text-3xl">{selectedItem.name}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{selectedItem.description}</p>

                {selectedItem.specifications?.length ? (
                  <dl className="mt-6 grid grid-cols-2 border-l border-t border-slate-200">
                    {selectedItem.specifications.map((specification) => (
                      <div key={specification.label} className="border-b border-r border-slate-200 p-3">
                        <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">{specification.label}</dt>
                        <dd className="mt-1 text-xs font-semibold leading-4 text-slate-900 sm:text-sm">{specification.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                {selectedItem.features?.length ? (
                  <ul className="mt-6 grid gap-3">
                    {selectedItem.features.map((feature) => (
                      <li key={feature} className="flex gap-3 text-sm leading-5 text-slate-700">
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Check className="h-3.5 w-3.5" aria-hidden="true" /></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {selectedItem.requestHref ? (
                  <Link href={selectedItem.requestHref} className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#0071e3] px-5 text-sm font-semibold text-white transition hover:bg-[#0068d1] sm:w-auto">
                    Request this item
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : null}
                <p className="mt-3 text-xs leading-5 text-slate-500">Final configuration, compatibility, availability, and pricing are confirmed with your Avantia quote.</p>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
