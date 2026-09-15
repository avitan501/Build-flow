import { Check, ChevronDown, Clock3, FileText, LockKeyhole, Truck } from "lucide-react"
import type { ReactNode } from "react"

export const FULFILLMENT_PHASES = ["Estimate", "Approval", "Payment", "Receipt", "Delivery"] as const

export function SavedClientPriceTotals({ amounts }: { amounts: { subtotal: number; delivery: number; tax: number; taxRate: number; total: number } }) {
  const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
  return <dl aria-label="Saved document totals" className="mt-3 grid gap-2 border-t border-slate-200 pt-3 text-xs">
    {[["Subtotal", amounts.subtotal], ["Delivery", amounts.delivery], [`Sales tax (${amounts.taxRate}%)`, amounts.tax], ["Total", amounts.total]].map(([label, amount]) => <div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-semibold tabular-nums">{money(Number(amount))}</dd></div>)}
  </dl>
}

export function RequestFulfillmentOverview({ phase, done, status, document, primaryAction, priceBreakdown, paymentDetails, deliveryDetails, deliveryLabel }: {
  phase: number
  done: boolean[]
  status: string
  document: { label: string; number: string; total: number; updated: string; href: string } | null
  primaryAction: ReactNode
  priceBreakdown: ReactNode
  paymentDetails: ReactNode
  deliveryDetails: ReactNode
  deliveryLabel: string
}) {
  const waiting = (phase === 1 || phase === 2) && !done[phase]
  return <div className="min-w-0" data-testid="fulfillment-overview">
    <p className="mb-2 text-xs font-medium text-slate-500 sm:hidden">{done.every(Boolean) ? "Delivery scheduled" : `${phase + 1} of 5 · ${FULFILLMENT_PHASES[phase]}`}</p>
    <ol aria-label="Client and delivery progress" className="mb-5 flex gap-1 sm:gap-3">{FULFILLMENT_PHASES.map((label, index) => <li key={label} aria-current={phase === index ? "step" : undefined} className="min-w-0 flex-1">
      <span className={`block h-1.5 rounded-full sm:hidden ${done[index] ? "bg-emerald-500" : phase === index ? "bg-amber-400" : "bg-slate-200"}`} />
      <span className="sr-only sm:hidden">{label}: {done[index] ? "Complete" : phase === index ? "Current" : index < phase ? "Not recorded" : "Pending"}</span>
      <div className="hidden items-center gap-2 sm:flex"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${done[index] ? "bg-emerald-600 text-white" : phase === index ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500"}`}>{done[index] ? <Check className="h-4 w-4" /> : index + 1}</span><span className={`text-xs ${phase === index ? "font-bold text-slate-950" : "text-slate-600"}`}>{label}</span>{index < FULFILLMENT_PHASES.length - 1 ? <span aria-hidden="true" className="h-px min-w-2 flex-1 bg-slate-200" /> : null}</div>
    </li>)}</ol>
    <section aria-label="Current client action" className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 sm:items-center sm:p-5">
      <div className="min-w-0">{document ? <><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{document.label} {document.number}</p><p className="mt-2 break-words text-4xl font-bold tracking-tight text-slate-950">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(document.total)}</p><p className="mt-2 text-xs text-slate-500">Updated {document.updated}</p></> : <><p className="text-sm font-bold text-slate-950">{phase === 0 ? "Prepare the client estimate" : FULFILLMENT_PHASES[phase]}</p><p className="mt-2 text-xs leading-5 text-slate-500">{phase === 0 ? "Your saved estimate will appear here." : "No saved client document."}</p></>}</div>
      <div className="min-w-0 sm:border-l sm:border-slate-200 sm:pl-5"><p className={`mb-3 flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold ${waiting ? "bg-amber-50 text-amber-800" : done.every(Boolean) ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-700"}`} role="status">{waiting ? <Clock3 className="h-3.5 w-3.5 shrink-0" /> : null}{status}</p>{primaryAction}{document ? <a href={document.href} target="_blank" rel="noreferrer" className="mt-2 flex min-h-11 items-center justify-center text-xs font-semibold text-[#0066cc] underline">View {document.label.toLowerCase()}</a> : null}</div>
    </section>
    <div className="mt-3 grid gap-2">{[
      { label: "Price breakdown", icon: FileText, content: priceBreakdown, detail: "" },
      { label: "Payment & receipt", icon: LockKeyhole, content: paymentDetails, detail: done[2] ? "Payment recorded" : !done[1] ? "After approval" : "" },
      { label: "Delivery details", icon: Truck, content: deliveryDetails, detail: deliveryLabel },
    ].map(({label,icon:Icon,content,detail}) => <details key={label} className="group/fulfillment-detail rounded-lg border border-slate-200 bg-white"><summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 text-xs font-semibold [&::-webkit-details-marker]:hidden"><Icon className="h-4 w-4 shrink-0 text-slate-600"/><span>{label}</span><span className="ml-auto text-[10px] font-normal text-slate-500">{detail}</span><ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open/fulfillment-detail:rotate-180"/></summary><div className="border-t border-slate-100 p-3">{content}</div></details>)}</div>
  </div>
}
