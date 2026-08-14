"use client"

import { Check, Minus, Plus, X, ZoomIn } from "lucide-react"
import { useMemo, useState } from "react"
import { createPortal } from "react-dom"

import { AddToProjectButton } from "@/components/buildflow/add-to-project-button"
import { ShopTranslationBoundary } from "@/components/buildflow/shop-language-provider"

const accessories: ReadonlyArray<{ id: string; name: string; unit: string; image: string; position?: string }> = [
  { id: "compound", name: "All-purpose joint compound", unit: "pails", image: "/images/materials/products-real/usg-all-purpose-joint-compound.webp" },
  { id: "tape", name: "Paper joint tape", unit: "rolls", image: "/images/materials/products-real/usg-paper-joint-tape.webp" },
  { id: "screws", name: "Drywall screws", unit: "boxes", image: "/images/department-essentials/drywall-grid.webp", position: "33.333% 100%" },
  { id: "corner", name: "10 ft. corner bead", unit: "pieces", image: "/images/department-essentials/drywall-grid.webp", position: "0% 100%" },
] as const

export function SheetRockProductConfigurator() {
  const [drywallType, setDrywallType] = useState("Regular")
  const [size, setSize] = useState("4 ft. x 12 ft.")
  const [thickness, setThickness] = useState("1/2 in.")
  const [quantity, setQuantity] = useState(1)
  const [selectedAccessories, setSelectedAccessories] = useState<Record<string, number>>({ compound: 1, tape: 1 })
  const [imageOpen, setImageOpen] = useState(false)

  const productName = `${drywallType} drywall board`
  const productImage = "/images/department-essentials/drywall-grid.webp"
  const imagePosition = drywallType === "Regular" ? "0% 0%" : drywallType === "Moisture resistant" ? "33.333% 0%" : "66.667% 0%"
  const details = useMemo(() => {
    const lines = [`Product: ${drywallType} drywall board`, `Size: ${size}`, `Thickness: ${thickness}`, `Quantity: ${quantity} sheets`]
    const selected = accessories.filter((item) => (selectedAccessories[item.id] ?? 0) > 0)
    if (selected.length) lines.push("Accessories:", ...selected.map((item) => `- ${selectedAccessories[item.id]} ${item.unit} ${item.name}`))
    return lines.join("\n")
  }, [drywallType, quantity, selectedAccessories, size, thickness])

  function updateAccessory(id: string, next: number) {
    setSelectedAccessories((current) => {
      const copy = { ...current }
      if (next <= 0) delete copy[id]
      else copy[id] = Math.min(next, 9999)
      return copy
    })
  }

  return (
    <ShopTranslationBoundary><section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="sheet-rock-configurator-heading">
      <div className="min-w-0 p-4 sm:p-5">
          <div className="grid grid-cols-[minmax(0,1fr)_4rem] items-start gap-3 sm:grid-cols-[minmax(0,1fr)_5rem] sm:gap-5">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0066cc]">Configure exact material</p><h2 id="sheet-rock-configurator-heading" className="mt-1 text-xl font-bold">{productName}</h2><p className="mt-1 text-sm text-slate-500">Choose the board, size, thickness, quantity, and accessories before requesting supplier pricing.</p><span className="mt-2 inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">Price by quote</span></div>
          <button type="button" onClick={() => setImageOpen(true)} className="group relative block h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm sm:h-20 sm:w-20" aria-label="Enlarge product image">
            <span className="absolute inset-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${productImage})`, backgroundPosition: imagePosition, backgroundSize: "400% 200%" }} />
            <span className="absolute bottom-1 right-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/85 text-white shadow"><ZoomIn className="h-3.5 w-3.5" /></span>
          </button>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div className="grid content-start gap-4">
              <OptionGroup label="Board type" value={drywallType} options={["Regular", "Moisture resistant", "Fire-rated Type X"]} onChange={setDrywallType} />
              <OptionGroup label="Sheet size" value={size} options={["4 ft. x 8 ft.", "4 ft. x 10 ft.", "4 ft. x 12 ft."]} onChange={setSize} />
              <OptionGroup label="Thickness" value={thickness} options={["3/8 in.", "1/2 in.", "5/8 in."]} onChange={setThickness} />
              <fieldset><legend className="text-xs font-bold text-slate-700">Quantity</legend><div className="mt-1.5"><QuantityStepper value={quantity} onChange={setQuantity} ariaLabel="Drywall sheet quantity" /></div></fieldset>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Add the matching materials</p>
              <div className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200">
                {accessories.map((item) => {
                  const count = selectedAccessories[item.id] ?? 0
                  return <div key={item.id} className={`grid grid-cols-[minmax(0,1fr)_2.75rem_auto] items-center gap-2 px-2 py-2 ${count ? "bg-orange-50/60" : ""}`}>
                    <button type="button" onClick={() => updateAccessory(item.id, count ? 0 : 1)} className="min-w-0 text-left"><span className="block text-sm font-bold leading-tight">{item.name}</span><span className="block text-[10px] text-slate-500">{count ? "Selected" : "Tap to add"}</span></button>
                    <span className="h-10 w-10 rounded-md border border-slate-200 bg-white bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${item.image})`, backgroundPosition: item.position, backgroundSize: item.position ? "400% 200%" : undefined }} />
                    <QuantityStepper value={count} onChange={(value) => updateAccessory(item.id, value)} compact ariaLabel={`${item.name} quantity`} />
                  </div>
                })}
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end border-t border-slate-200 pt-4">
            <AddToProjectButton product={{ id: "sheet-rock-drywall", name: productName, category: "Sheet rock", productType: "material", price: 0, unit: "sheets" }} quantity={quantity} details={details} label="Add configured item" className="rounded-lg" />
          </div>
      </div>

      {imageOpen && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[160] grid place-items-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-label={`${productName} image`} onClick={() => setImageOpen(false)}><div className="relative h-[min(72vh,36rem)] w-[min(92vw,44rem)] rounded-lg bg-white p-6" onClick={(event) => event.stopPropagation()}><span className="absolute inset-6 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${productImage})`, backgroundPosition: imagePosition, backgroundSize: "400% 200%" }} /><button type="button" onClick={() => setImageOpen(false)} className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-white" aria-label="Close image"><X className="h-5 w-5" /></button></div></div>, document.body) : null}
    </section></ShopTranslationBoundary>
  )
}

function OptionGroup({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <ShopTranslationBoundary><fieldset><legend className="text-xs font-bold text-slate-700">{label}</legend><div className="mt-1.5 flex flex-wrap gap-2">{options.map((option) => <button key={option} type="button" onClick={() => onChange(option)} className={`inline-flex min-h-9 items-center gap-1 rounded-md border px-3 text-xs font-semibold ${value === option ? "border-orange-500 bg-orange-50 text-slate-950" : "border-slate-300 bg-white text-slate-700"}`}>{value === option ? <Check className="h-3 w-3 text-orange-600" /> : null}{option}</button>)}</div></fieldset></ShopTranslationBoundary>
}

function QuantityStepper({ value, onChange, compact = false, ariaLabel }: { value: number; onChange: (value: number) => void; compact?: boolean; ariaLabel: string }) {
  const height = compact ? "h-8" : "h-10"
  return <div role="group" aria-label={ariaLabel} className={`inline-grid grid-cols-[2rem_2.25rem_2rem] overflow-hidden rounded-md border border-slate-300 bg-white ${height}`}><button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="inline-flex items-center justify-center text-slate-500" aria-label={`Decrease ${ariaLabel}`}><Minus className="h-3.5 w-3.5" /></button><span className="inline-flex items-center justify-center border-x border-slate-200 text-xs font-bold tabular-nums">{value}</span><button type="button" onClick={() => onChange(Math.min(9999, value + 1))} className="inline-flex items-center justify-center text-slate-700" aria-label={`Increase ${ariaLabel}`}><Plus className="h-3.5 w-3.5" /></button></div>
}
