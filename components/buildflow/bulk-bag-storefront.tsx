"use client"

import Image from "next/image"
import { Minus, Plus } from "lucide-react"
import { useState } from "react"

import { AddToProjectButton } from "@/components/buildflow/add-to-project-button"

const BULK_BAGS = [
  {
    id: "one-yard-sand-bag",
    name: "1 Yard Sand Bag",
    description: "Clean construction sand for masonry, leveling, and general jobsite use.",
    imageUrl: "/images/materials/bulk-bags/one-yard-sand-bag.webp",
    imageAlt: "One cubic yard white bulk bag filled with construction sand",
    price: 89,
    details: "Sand material: $54. One-yard sack: $35. Delivery fee: $250 per delivery.",
  },
  {
    id: "one-yard-crushed-stone-bag",
    name: "1 Yard Crushed Stone Bag",
    description: "Common crushed stone for drainage, base preparation, and concrete work.",
    imageUrl: "/images/materials/bulk-bags/one-yard-crushed-stone-bag.webp",
    imageAlt: "One cubic yard white bulk bag filled with crushed stone",
    price: 0,
    details: "One cubic yard crushed stone bag. Final material price is confirmed before delivery.",
  },
  {
    id: "one-yard-mulch-bag",
    name: "1 Yard Mulch Bag",
    description: "Natural brown mulch for planting beds, landscaping, and site finishing.",
    imageUrl: "/images/materials/bulk-bags/one-yard-mulch-bag.webp",
    imageAlt: "One cubic yard white bulk bag filled with brown mulch",
    price: 0,
    details: "One cubic yard mulch bag. Final material price is confirmed before delivery.",
  },
] as const

const BAG_PRICE_DETAILS = [
  ["Sand material", "$54"],
  ["One-yard sack", "$35"],
  ["Delivery fee", "$250"],
] as const

const BAGGED_MATERIALS = [
  {
    id: "heidelberg-lehigh-portland-cement-type-i-ii-94-lb",
    name: "Heidelberg Materials Lehigh Portland Cement Type I/II",
    detail: "94 lb. bag",
    price: 16.45,
    imageUrl: "/images/materials/products-real/lehigh-portland-cement-type-i-ii.jpg",
    imageAlt: "Heidelberg Materials Lehigh Portland Cement Type I and II 94 pound bag",
  },
  {
    id: "mapei-keraflex-plus-gray-thinset-44-lb",
    name: "MAPEI Keraflex Plus Gray Thinset",
    detail: "44 lb. bag",
    price: 18,
    imageUrl: "/images/materials/products-real/mapei-ultraflex-thinset.jpg",
    imageAlt: "MAPEI gray thinset mortar bag",
  },
] as const

function BulkBagCard({ bag }: { bag: (typeof BULK_BAGS)[number] }) {
  const [quantity, setQuantity] = useState(1)

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-square bg-[#f5f6f7]">
        <Image src={bag.imageUrl} alt={bag.imageAlt} fill sizes="(min-width: 1024px) 32vw, (min-width: 640px) 50vw, 100vw" className="object-cover" loading="eager" />
        <span className="absolute left-3 top-3 rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700 shadow-sm">1 cubic yard</span>
      </div>

      <div className="p-4">
        <h2 className="text-lg font-bold text-slate-950">{bag.name}</h2>
        <p className="mt-1 min-h-10 text-sm leading-5 text-slate-600">{bag.description}</p>

        <div className="mt-4 flex items-center gap-2">
          <div className="grid h-12 shrink-0 grid-cols-[2.75rem_2.5rem_2.75rem] overflow-hidden rounded-full border border-slate-300 bg-white" aria-label={`Quantity for ${bag.name}`}>
            <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="inline-flex items-center justify-center text-slate-600 transition hover:bg-slate-50 disabled:text-slate-300" disabled={quantity === 1} aria-label={`Decrease ${bag.name} quantity`}><Minus className="h-4 w-4" /></button>
            <output className="inline-flex items-center justify-center border-x border-slate-200 text-sm font-bold tabular-nums text-slate-950" aria-live="polite">{quantity}</output>
            <button type="button" onClick={() => setQuantity((value) => Math.min(25, value + 1))} className="inline-flex items-center justify-center text-slate-600 transition hover:bg-slate-50" aria-label={`Increase ${bag.name} quantity`}><Plus className="h-4 w-4" /></button>
          </div>
          <AddToProjectButton
            product={{ id: bag.id, name: bag.name, category: "Concrete & Masonry", productType: "material", price: bag.price, unit: "1-yard bag" }}
            quantity={quantity}
            details={bag.details}
            label="Send One Yard Bag"
            className="min-w-0 flex-1 px-4"
          />
        </div>
      </div>
    </article>
  )
}

export function BulkBagStorefront() {
  return (
    <section aria-labelledby="bulk-bag-heading">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-orange-700">Jobsite bulk delivery</p>
          <h2 id="bulk-bag-heading" className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">Choose a one-yard bag</h2>
        </div>
        <p className="text-sm text-slate-500">Crushed stone and mulch pricing is confirmed before delivery.</p>
      </div>
      <div className="mb-4 grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-label="Sand bag price breakdown">
        {BAG_PRICE_DETAILS.map(([label, price], index) => (
          <div key={label} className={`${index ? "border-l border-slate-200" : ""} px-3 py-3 text-center`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
            <p className="mt-0.5 text-base font-bold tabular-nums text-slate-950">{price}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BULK_BAGS.map((bag) => <BulkBagCard key={bag.id} bag={bag} />)}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {BAGGED_MATERIALS.map((material) => (
          <article key={material.id} className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-[5.5rem_minmax(0,1fr)_auto]">
            <div className="relative aspect-square overflow-hidden rounded-md bg-slate-50">
              <Image src={material.imageUrl} alt={material.imageAlt} fill sizes="88px" className="object-contain p-1" loading="eager" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold leading-5 text-slate-950">{material.name}</h3>
              <p className="mt-0.5 text-xs text-slate-500">{material.detail}</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-slate-950">${material.price.toFixed(2)}</p>
            </div>
            <AddToProjectButton product={{ id: material.id, name: material.name, category: "Concrete & Masonry", productType: "material", price: material.price, unit: "bag" }} label="Add" className="col-span-2 w-full sm:col-span-1 sm:w-auto" />
          </article>
        ))}
      </div>
    </section>
  )
}
