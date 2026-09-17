'use client'

import { useRef, useState, type ReactNode } from 'react'
import type { ReceivedSupplierQuote, ReceivedSupplierQuoteLine } from './received-supplier-quote-table'
import { quoteWordingDifferences } from '@/lib/quote-wording-differences'

export function SupplierDifferenceWording({ wording, notes }: { wording: string; notes: string[] }) {
  return <>{quoteWordingDifferences(wording, notes).map((part, index) => part.different ? <mark key={index} className="bg-red-50 font-semibold text-red-700">{part.text}</mark> : <span key={index}>{part.text}</span>)}</>
}

export function QuoteMatchReview({ quote, request, originalRequest, lines, notes, approval }:  { quote: ReceivedSupplierQuote; request: string; originalRequest?:string; approval?:ReactNode; lines: ReceivedSupplierQuoteLine[]; notes: string[] }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [opened, setOpened] = useState(false)
  const sourceLines = [...new Map(lines.map(line => [line.line_number, quote.sourceItems?.find(source => source.line_number === line.line_number) || line])).values()]
  return <>
    <button type="button" className="mt-2 inline-flex min-h-11 items-center font-semibold text-sky-800" onClick={() => { setOpened(true); dialog.current?.showModal() }}>Review match</button>
    <dialog ref={dialog} onClose={() => setOpened(false)} aria-label="Review supplier match" className="m-auto max-h-[92dvh] w-[96vw] max-w-6xl overflow-auto rounded-xl p-4 backdrop:bg-slate-950/60">
      <header className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold">Review match · {quote.supplierName || quote.fileName}</h2><p className="break-all text-xs text-slate-500">{quote.fileName} · original uploaded document</p></div><button type="button" className="min-h-11 rounded-md border px-4" onClick={() => dialog.current?.close()}>Close</button></header>
      {opened ? <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="min-w-0"><h3 className="font-bold">Original PDF</h3><a href={`/api/admin/supplier-quotes/${quote.id}/document`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-sky-800">Open original document</a><iframe title={`Original uploaded quote: ${quote.fileName}`} src={`/api/admin/supplier-quotes/${quote.id}/document`} className="h-[60dvh] w-full rounded-md border" /></section>
        <section className="min-w-0 space-y-4"><div><h3 className="font-bold">Requested material</h3><p className="mt-2 text-xs font-semibold">Original request wording</p><p data-testid="review-original-request" className="mt-1 whitespace-pre-wrap break-words">{originalRequest||'Original request line is unavailable; verify the request source.'}</p><p className="mt-3 text-xs font-semibold">AI-organized material line</p><p data-testid="review-organized-request" className="mt-1 break-words">{request}</p></div><div><h3 className="font-bold">Extracted supplier wording</h3>{sourceLines.length ? sourceLines.map(line => <div key={line.line_number} className="mt-3 rounded-md border p-3"><p className="text-xs font-bold">Source line {line.line_number}</p><p className="mt-2 break-words"><SupplierDifferenceWording wording={`${line.description} · ${line.specification||''}`} notes={notes.filter(note=>!note.startsWith('Quantity:'))} /></p><p className="mt-2"><SupplierDifferenceWording wording={`${line.originalFeet ?? line.quantity} ${line.calculatedRate !== undefined ? 'lin. ft.' : line.unit}`} notes={notes.filter(note=>note.startsWith('Quantity:'))} /></p></div>) : <p className="mt-2">No matched source line. Review the original PDF before assigning a line.</p>}</div><div><h3 className="font-bold">Differences / checks</h3>{notes.map(note => <p key={note} className={'mt-2 break-words ' + (/^(Quantity:|Measurement differs:|Length differs:|Sheet dimensions differ:)/.test(note) ? 'font-semibold text-red-700' : /substitut|different.*(?:manufacturer|series)|Mount differs:/i.test(note) ? 'text-orange-700' : 'text-slate-600')}>{note}</p>)}</div><section aria-label="Approve reviewed match" className="rounded-lg border border-slate-200 p-3"><h3 className="font-bold">Review and approve</h3><p className="mt-1 text-xs text-slate-600">Accepting includes the displayed cost for this item only. It does not change the original quote, certify compatibility or place an order.</p>{approval||<p className="mt-2 text-sm">Assign this source and save its price before confirming the match.</p>}<a href={`/admin/supplier-quotes/${quote.id}`} className="inline-flex min-h-11 items-center font-semibold text-sky-800">Assign or correct source match</a></section><p className="text-xs text-slate-500">Extracted line numbers are not PDF page numbers. No approval is saved by opening this window.</p></section>
      </div> : null}
    </dialog>
  </>
}
