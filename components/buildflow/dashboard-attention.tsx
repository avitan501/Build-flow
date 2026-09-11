import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { groupDashboardAttention, type DashboardAttentionItem } from "@/lib/dashboard-attention";
import { formatSiteDateTime } from "@/lib/site-date-time";

export function DashboardAttention({ items, unavailable = false }: { items: DashboardAttentionItem[]; unavailable?: boolean }) {
  return (
    <section aria-labelledby="attention-heading" className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <h2 id="attention-heading" className="text-base font-semibold text-slate-950">Needs Attention</h2>
        <span className="text-xs text-slate-500">{items.length} shown</span>
      </header>
      {unavailable ? <p role="alert" className="px-4 pb-3 text-sm text-amber-800">Some alerts could not load. Refresh to check.</p> : null}
      {groupDashboardAttention(items).map((group) => (
        <details key={group.id} className="group border-t border-slate-100">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-2 focus-visible:outline-sky-500 [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${group.id === "delivery" ? "bg-rose-500" : group.id === "unread" ? "bg-sky-500" : "bg-amber-500"}`} />
            <span className="flex-1 text-sm font-semibold text-slate-900">{group.label}</span>
            <span className="text-sm tabular-nums text-slate-600">{group.items.length}</span>
            <ChevronDown aria-hidden="true" className="h-4 w-4 text-slate-500 group-open:rotate-180" />
          </summary>
          <ul className="border-t border-slate-100">
            {group.items.map((item) => (
              <li key={item.key} className="border-b border-slate-100 last:border-0">
                <Link href={item.href} prefetch={false} className="flex min-h-16 items-center gap-3 px-4 py-3 focus-visible:outline-2 focus-visible:outline-sky-500">
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm text-slate-900">{item.title}</strong>
                    <span className="block break-all text-xs text-slate-600">{item.detail}</span>
                    {item.occurredAt && Number.isFinite(Date.parse(item.occurredAt)) ? <time dateTime={item.occurredAt} className="block text-xs text-slate-500">{formatSiteDateTime(item.occurredAt)}</time> : null}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-sky-700">Review →</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ))}
      {!items.length && !unavailable ? <p className="px-4 pb-4 text-sm text-slate-600">No alerts to review.</p> : null}
    </section>
  );
}
