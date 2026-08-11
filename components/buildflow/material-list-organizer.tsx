"use client"

import { Check, ClipboardList, Copy, Download, Plus, Trash2, Upload } from "lucide-react"
import { useMemo, useState } from "react"

type MaterialRow = { id: string; quantity: string; item: string; notes: string }

function newId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
}

function parseLine(line: string): MaterialRow | null {
  const clean = line.replace(/^[-*•]+\s*/, "").trim()
  if (!clean || /^(qty|quantity)\s*[,|\t]/i.test(clean)) return null
  const csv = clean.split(/\t|\s*\|\s*|,(?=\s*[^,]+$)/).map((part) => part.trim()).filter(Boolean)
  if (csv.length >= 2 && /^\d+(?:\.\d+)?$/.test(csv[0])) return { id: newId(), quantity: csv[0], item: csv[1], notes: csv.slice(2).join("; ") }
  const leading = clean.match(/^(\d+(?:\.\d+)?)\s+(?:x\s+)?(.+)$/i)
  if (leading) return { id: newId(), quantity: leading[1], item: leading[2], notes: "" }
  const trailing = clean.match(/^(.+?)\s+(?:x|qty\.?|quantity)\s*(\d+(?:\.\d+)?)$/i)
  if (trailing) return { id: newId(), quantity: trailing[2], item: trailing[1], notes: "" }
  return { id: newId(), quantity: "", item: clean, notes: "" }
}

function parseList(value: string) {
  return value.split(/\r?\n/).map(parseLine).filter((row): row is MaterialRow => Boolean(row)).slice(0, 300)
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

const fieldClass = "min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"

export function MaterialListOrganizer() {
  const [source, setSource] = useState("")
  const [rows, setRows] = useState<MaterialRow[]>([])
  const [copied, setCopied] = useState(false)
  const organizedText = useMemo(() => rows.filter((row) => row.item.trim()).map((row, index) => `${index + 1}. ${row.quantity ? `${row.quantity} × ` : ""}${row.item.trim()}${row.notes.trim() ? ` — ${row.notes.trim()}` : ""}`).join("\n"), [rows])

  function organize() {
    setRows(parseList(source))
  }

  function update(id: string, key: keyof Omit<MaterialRow, "id">, value: string) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [key]: value } : row))
  }

  async function copy() {
    await navigator.clipboard.writeText(organizedText)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  function downloadCsv() {
    const csv = ["Quantity,Material / Specification,Notes", ...rows.map((row) => [row.quantity, row.item, row.notes].map(csvCell).join(","))].join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "avantia-material-list.csv"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function uploadText(file: File | null) {
    if (!file) return
    const text = await file.text()
    setSource(text.slice(0, 120000))
    setRows(parseList(text))
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(20rem,.72fr)_minmax(0,1.28fr)]">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3"><span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white"><ClipboardList className="h-5 w-5" /></span><div><h2 className="text-lg font-bold text-slate-950">Messy material list</h2><p className="mt-1 text-sm text-slate-500">Paste notes from a text, email, estimate, or field list.</p></div></div>
        <textarea value={source} onChange={(event) => setSource(event.target.value)} rows={16} maxLength={120000} placeholder={"Example:\n25 2x4x8 studs\n12 sheets 1/2 drywall\nJoint compound | 4 | lightweight"} className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm leading-6 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
        <div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"><Upload className="h-4 w-4" />Upload TXT or CSV<input type="file" accept=".txt,.csv,text/plain,text/csv" className="sr-only" onChange={(event) => uploadText(event.target.files?.[0] ?? null)} /></label><button type="button" disabled={!source.trim()} onClick={organize} className="min-h-11 rounded-lg bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-40">Organize list</button></div>
      </section>

      <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0066cc]">Organized output</p><h2 className="mt-1 text-lg font-bold text-slate-950">{rows.length} material {rows.length === 1 ? "line" : "lines"}</h2></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setRows((current) => [...current, { id: newId(), quantity: "", item: "", notes: "" }])} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700"><Plus className="h-4 w-4" />Add line</button><button type="button" disabled={!organizedText} onClick={copy} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 disabled:opacity-40">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied" : "Copy"}</button><button type="button" disabled={!rows.length} onClick={downloadCsv} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 disabled:opacity-40"><Download className="h-4 w-4" />CSV</button></div></div>
        {rows.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[42rem] border-separate border-spacing-y-2 text-left"><thead><tr className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500"><th className="w-24 px-2">Quantity</th><th className="px-2">Material / specification</th><th className="px-2">Notes</th><th className="w-12"><span className="sr-only">Remove</span></th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td className="px-1"><input aria-label="Material quantity" inputMode="decimal" value={row.quantity} onChange={(event) => update(row.id, "quantity", event.target.value)} className={fieldClass} /></td><td className="px-1"><input aria-label="Material description" value={row.item} onChange={(event) => update(row.id, "item", event.target.value)} className={fieldClass} /></td><td className="px-1"><input aria-label="Material notes" value={row.notes} onChange={(event) => update(row.id, "notes", event.target.value)} className={fieldClass} /></td><td><button type="button" onClick={() => setRows((current) => current.filter((entry) => entry.id !== row.id))} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-rose-200 hover:text-rose-700" aria-label="Remove material line"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div> : <div className="mt-4 flex min-h-80 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 text-center"><div><ClipboardList className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 text-sm font-semibold text-slate-700">Paste a list and select Organize list.</p><p className="mt-1 text-xs text-slate-500">You can edit every line before copying or downloading it.</p></div></div>}
      </section>
    </div>
  )
}
