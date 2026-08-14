"use client"

import { useMemo, useState } from "react"

type DrywallMaterialRow = {
  label: string
  quantity: string
  detail: string
}

function numberValue(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function roundUp(value: number) {
  return Math.max(0, Math.ceil(value))
}

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value)
}

function CalculatorIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8" />
      <path d="M8 11h2" />
      <path d="M12 11h2" />
      <path d="M16 11h.01" />
      <path d="M8 15h2" />
      <path d="M12 15h2" />
      <path d="M16 15h.01" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  )
}

export function DrywallCalculator() {
  const [length, setLength] = useState("20")
  const [width, setWidth] = useState("14")
  const [height, setHeight] = useState("8")
  const [openingArea, setOpeningArea] = useState("60")
  const [outsideCorners, setOutsideCorners] = useState("4")
  const [wastePercent, setWastePercent] = useState("10")
  const [sheetLength, setSheetLength] = useState("8")
  const [copyStatus, setCopyStatus] = useState("")

  const calculation = useMemo(() => {
    const roomLength = numberValue(length)
    const roomWidth = numberValue(width)
    const wallHeight = numberValue(height)
    const openings = numberValue(openingArea)
    const corners = numberValue(outsideCorners)
    const waste = Math.min(numberValue(wastePercent), 35)
    const boardLength = numberValue(sheetLength) || 8
    const sheetSqft = 4 * boardLength

    const wallArea = 2 * (roomLength + roomWidth) * wallHeight
    const netArea = Math.max(0, wallArea - openings)
    const orderArea = netArea * (1 + waste / 100)
    const sheets = roundUp(orderArea / sheetSqft)
    const screwCount = roundUp(sheets * 32)
    const screwBoxes = roundUp(screwCount / 1000)
    const tapeFeet = roundUp(orderArea * 0.35)
    const tapeRolls = roundUp(tapeFeet / 250)
    const compoundBuckets = roundUp(orderArea / 400)
    const cornerBeads = roundUp((corners * wallHeight) / 8)

    const rows: DrywallMaterialRow[] = [
      {
        label: "Drywall board",
        quantity: `${sheets} sheets`,
        detail: `5/8 in board, 4x${boardLength} sheets, ${formatNumber(sheetSqft)} sq ft each`,
      },
      {
        label: "Drywall screws",
        quantity: `${screwBoxes} boxes`,
        detail: `About ${formatNumber(screwCount)} screws, estimated at 1,000 per 5 lb box`,
      },
      {
        label: "Joint tape",
        quantity: `${tapeRolls} rolls`,
        detail: `About ${formatNumber(tapeFeet)} linear ft, estimated with 250 ft rolls`,
      },
      {
        label: "Joint compound",
        quantity: `${compoundBuckets} buckets`,
        detail: "Estimated with 4.5 gal buckets at about 400 sq ft each",
      },
      {
        label: "Corner bead",
        quantity: `${cornerBeads} pieces`,
        detail: `8 ft pieces for ${formatNumber(corners)} outside corners`,
      },
    ]

    return {
      wallArea,
      netArea,
      orderArea,
      sheetSqft,
      rows,
    }
  }, [height, length, openingArea, outsideCorners, sheetLength, wastePercent, width])

  async function copyMaterialList() {
    const text = calculation.rows.map((row) => `${row.label}: ${row.quantity} - ${row.detail}`).join("\n")

    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus("Material list copied")
    } catch {
      setCopyStatus("Copy failed")
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
      <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:p-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <CalculatorIcon />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-normal text-slate-950">Room takeoff</h2>
            <p className="text-sm leading-5 text-slate-500">Enter room dimensions and adjust waste before ordering.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Length ft
            <input value={length} onChange={(event) => setLength(event.target.value)} inputMode="decimal" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100" />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Width ft
            <input value={width} onChange={(event) => setWidth(event.target.value)} inputMode="decimal" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100" />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Wall height ft
            <input value={height} onChange={(event) => setHeight(event.target.value)} inputMode="decimal" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100" />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Door/window openings sq ft
            <input value={openingArea} onChange={(event) => setOpeningArea(event.target.value)} inputMode="decimal" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100" />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Outside corners
            <input value={outsideCorners} onChange={(event) => setOutsideCorners(event.target.value)} inputMode="numeric" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100" />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Waste percent
            <input value={wastePercent} onChange={(event) => setWastePercent(event.target.value)} inputMode="decimal" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100" />
          </label>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Board size
            <select value={sheetLength} onChange={(event) => setSheetLength(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100">
              <option value="8">4x8 standard</option>
              <option value="10">4x10</option>
              <option value="12">4x12</option>
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-slate-950">Material list</h2>
            <p className="text-sm leading-5 text-slate-500">Use this as a planning estimate before final field verification.</p>
          </div>
          <button type="button" onClick={copyMaterialList} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800">
            <CopyIcon />
            Copy list
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Net area</div>
            <div className="mt-1 text-lg font-bold text-slate-950">{formatNumber(calculation.netArea)} sq ft</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Order area</div>
            <div className="mt-1 text-lg font-bold text-slate-950">{formatNumber(calculation.orderArea)} sq ft</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Sheet area</div>
            <div className="mt-1 text-lg font-bold text-slate-950">{formatNumber(calculation.sheetSqft)} sq ft</div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-[18px] border border-slate-200">
          {calculation.rows.map((row) => (
            <div key={row.label} className="grid gap-1 border-b border-slate-100 p-3 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <div className="text-sm font-bold text-slate-950">{row.label}</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">{row.detail}</div>
              </div>
              <div className="text-base font-bold text-sky-700 sm:text-right">{row.quantity}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900">
          Confirm field conditions before ordering. Bathrooms should use moisture-resistant board, shower areas should use cement board, and garages usually need 5/8 Type X fire-rated board.
        </div>
        {copyStatus ? <div className="mt-3 text-sm font-semibold text-sky-700">{copyStatus}</div> : null}
      </div>
    </section>
  )
}
