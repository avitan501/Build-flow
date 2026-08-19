"use client"

import { useMemo, useState } from "react"

type TileSize = "mosaic" | "small" | "medium" | "large" | "large-format"
type TrowelSize = "quarter" | "three-eighths" | "half" | "three-quarter"

const TILE_SIZES: Array<{ value: TileSize; label: string; suggestedTrowel: TrowelSize }> = [
  { value: "mosaic", label: "Mosaic / up to 2 in.", suggestedTrowel: "quarter" },
  { value: "small", label: "Up to 8 x 8 in.", suggestedTrowel: "quarter" },
  { value: "medium", label: "Up to 12 x 12 in.", suggestedTrowel: "three-eighths" },
  { value: "large", label: "12 x 24 in.", suggestedTrowel: "half" },
  { value: "large-format", label: "Larger than 12 x 24 in.", suggestedTrowel: "three-quarter" },
]

const TROWELS: Array<{ value: TrowelSize; label: string; coverage: number }> = [
  { value: "quarter", label: "1/4 x 1/4 in. square notch", coverage: 80 },
  { value: "three-eighths", label: "1/4 x 3/8 in. square notch", coverage: 60 },
  { value: "half", label: "1/2 x 1/2 in. square notch", coverage: 45 },
  { value: "three-quarter", label: "3/4 in. U-notch", coverage: 30 },
]

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 })

function positiveNumber(value: string) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

export function ThinsetCalculator() {
  const [squareFeet, setSquareFeet] = useState("500")
  const [tileSize, setTileSize] = useState<TileSize>("large")
  const [trowelSize, setTrowelSize] = useState<TrowelSize>("half")
  const [bagCoverage, setBagCoverage] = useState("45")
  const [waste, setWaste] = useState("10")

  function updateTileSize(value: TileSize) {
    const suggested = TILE_SIZES.find((option) => option.value === value)?.suggestedTrowel ?? "half"
    const coverage = TROWELS.find((option) => option.value === suggested)?.coverage ?? 45
    setTileSize(value)
    setTrowelSize(suggested)
    setBagCoverage(String(coverage))
  }

  function updateTrowel(value: TrowelSize) {
    setTrowelSize(value)
    setBagCoverage(String(TROWELS.find((option) => option.value === value)?.coverage ?? 45))
  }

  const result = useMemo(() => {
    const area = positiveNumber(squareFeet)
    const coverage = positiveNumber(bagCoverage)
    const wastePercent = Math.min(50, Math.max(0, Number(waste) || 0))
    const adjustedArea = area * (1 + wastePercent / 100)
    return {
      area,
      adjustedArea,
      bags: area && coverage ? Math.ceil(adjustedArea / coverage) : 0,
    }
  }, [bagCoverage, squareFeet, waste])

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]" data-testid="thinset-calculator">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold text-slate-900">
            Square footage
            <input aria-label="Square footage" type="number" min="1" step="1" inputMode="decimal" value={squareFeet} onChange={(event) => setSquareFeet(event.target.value)} className="min-h-12 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold text-slate-900">
            Tile size
            <select aria-label="Tile size" value={tileSize} onChange={(event) => updateTileSize(event.target.value as TileSize)} className="min-h-12 rounded-md border border-slate-300 bg-white px-3 text-base outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100">
              {TILE_SIZES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <label className="grid gap-1.5 text-sm font-semibold text-slate-900 sm:col-span-2">
            Trowel size
            <select aria-label="Trowel size" value={trowelSize} onChange={(event) => updateTrowel(event.target.value as TrowelSize)} className="min-h-12 rounded-md border border-slate-300 bg-white px-3 text-base outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100">
              {TROWELS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <label className="grid gap-1.5 text-sm font-semibold text-slate-900">
            Bag coverage (sq. ft.)
            <input aria-label="Bag coverage" type="number" min="1" step="1" inputMode="decimal" value={bagCoverage} onChange={(event) => setBagCoverage(event.target.value)} className="min-h-12 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" />
            <span className="text-xs font-normal leading-5 text-slate-500">Use the coverage printed on your thinset bag when available.</span>
          </label>

          <label className="grid gap-1.5 text-sm font-semibold text-slate-900">
            Waste percentage
            <div className="relative">
              <input aria-label="Waste percentage" type="number" min="0" max="50" step="1" inputMode="decimal" value={waste} onChange={(event) => setWaste(event.target.value)} className="min-h-12 w-full rounded-md border border-slate-300 px-3 pr-10 text-base outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">%</span>
            </div>
          </label>
        </div>
      </div>

      <aside className="rounded-lg bg-[#0E2A4A] p-5 text-white shadow-sm sm:p-6" aria-live="polite">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-200">Material estimate</p>
        <div className="mt-5 flex items-end gap-3">
          <strong className="text-6xl font-bold tabular-nums">{result.bags}</strong>
          <span className="pb-1 text-lg font-semibold text-white/85">{result.bags === 1 ? "bag" : "bags"}</span>
        </div>
        <dl className="mt-6 grid gap-3 border-t border-white/20 pt-4 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-white/65">Tile area</dt><dd className="font-semibold tabular-nums">{NUMBER_FORMATTER.format(result.area)} sq. ft.</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-white/65">Area with waste</dt><dd className="font-semibold tabular-nums">{NUMBER_FORMATTER.format(result.adjustedArea)} sq. ft.</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-white/65">Coverage used</dt><dd className="font-semibold tabular-nums">{NUMBER_FORMATTER.format(positiveNumber(bagCoverage))} sq. ft./bag</dd></div>
        </dl>
        <p className="mt-5 text-xs leading-5 text-white/65">Estimate assumes a flat substrate and full mortar coverage. Uneven surfaces and back-buttering can require more material.</p>
      </aside>
    </section>
  )
}
