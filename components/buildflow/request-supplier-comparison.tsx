import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  PackageSearch,
  Truck,
} from "lucide-react";

import { formatSiteDate } from "@/lib/site-date-time";

export type RequestSupplierComparisonItem = {
  id: string;
  sourceRequestItemId?: string | null;
  quantity: number;
  unit: string;
  description: string;
  specification?: string | null;
};

export type RequestSupplierComparisonPrice = {
  itemId: string;
  unitPrice: number | null;
  available?: boolean;
  unit?: string | null;
  notes?: string | null;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
  checkedAt?: string | null;
};

export type RequestSupplierComparisonSupplier = {
  id: string;
  name: string;
  prices: RequestSupplierComparisonPrice[];
  deliveryCharge?: number | null;
  deliveryLabel?: string | null;
  quoteDate?: string | null;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
  checkedAt?: string | null;
  selected?: boolean;
};

export type RequestSupplierComparisonProps = {
  items: RequestSupplierComparisonItem[];
  suppliers: RequestSupplierComparisonSupplier[];
  currency?: string;
  emptyMessage?: string;
  onSelectSupplier?: (supplierId: string) => void;
  className?: string;
  headingId?: string;
};

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function displayDate(value?: string | null) {
  if (!value) return "Date not provided";
  return formatSiteDate(value, { month: "short", day: "numeric", year: "numeric" }, value);
}

function safeNumber(value: number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function sourceLink(
  label: string,
  url?: string | null,
  compact = false,
) {
  if (!url) return <span className="truncate text-[11px] font-medium text-slate-500">{label}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-full items-center gap-1 truncate text-[11px] font-bold text-[#0068c9] underline-offset-2 hover:underline"
      aria-label={`${label} source (opens in a new tab)`}
    >
      <span className="truncate">{compact ? "Source" : label}</span>
      <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" />
    </a>
  );
}

/**
 * A dense request-first comparison grid. The requested material remains visible
 * while each supplier is added as a horizontally scrollable column.
 */
export function RequestSupplierComparison({
  items,
  suppliers,
  currency = "USD",
  emptyMessage = "Add a supplier quote to compare it beside the request.",
  onSelectSupplier,
  className = "",
  headingId = "supplier-comparison-title",
}: RequestSupplierComparisonProps) {
  const pricesBySupplier = new Map(
    suppliers.map((supplier) => [
      supplier.id,
      new Map(supplier.prices.map((price) => [price.itemId, price])),
    ]),
  );

  const lowestByItem = new Map<string, number>();
  for (const item of items) {
    const prices = suppliers.flatMap((supplier) => {
      const observation = pricesBySupplier.get(supplier.id)?.get(item.id);
      return observation?.available !== false && observation?.unitPrice !== null && observation?.unitPrice !== undefined
        ? [safeNumber(observation.unitPrice)]
        : [];
    });
    if (prices.length) lowestByItem.set(item.id, Math.min(...prices));
  }

  if (!items.length) {
    return (
      <section className={`border border-dashed border-slate-300 bg-white px-5 py-10 text-center ${className}`}>
        <PackageSearch className="mx-auto h-7 w-7 text-slate-300" aria-hidden="true" />
        <p className="mt-3 text-sm font-bold text-slate-800">No materials to compare</p>
        <p className="mt-1 text-xs text-slate-500">Organize the client list first.</p>
      </section>
    );
  }

  const columns = `minmax(15rem, 1.25fr) repeat(${Math.max(suppliers.length, 1)}, minmax(13rem, 1fr))`;

  return (
    <section className={`overflow-hidden border border-slate-200 bg-white shadow-sm ${className}`} aria-labelledby={headingId}>
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 id={headingId} className="text-sm font-extrabold tracking-tight text-slate-950">Request and supplier quotes</h2>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-500">Same quantities. Supplier prices stay beside each item.</p>
        </div>
        <span className="text-[11px] font-bold tabular-nums text-slate-500">{items.length} item{items.length === 1 ? "" : "s"} · {suppliers.length} supplier{suppliers.length === 1 ? "" : "s"}</span>
      </div>

      {!suppliers.length ? (
        <div className="grid min-h-40 place-items-center px-5 py-8 text-center">
          <div>
            <PackageSearch className="mx-auto h-7 w-7 text-slate-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-bold text-slate-800">No supplier column yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">{emptyMessage}</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto overscroll-x-contain" tabIndex={0} aria-label="Scrollable supplier price comparison">
          <div className="grid min-w-max" style={{ gridTemplateColumns: columns }}>
            <div className="sticky left-0 z-20 border-b border-r border-slate-200 bg-slate-950 px-4 py-3 text-white shadow-[6px_0_10px_-10px_rgba(15,23,42,0.9)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300">Client request</p>
              <p className="mt-1 text-sm font-bold">Quantity + item</p>
            </div>
            {suppliers.map((supplier) => (
              <div key={supplier.id} className={`border-b border-r border-slate-200 px-4 py-3 last:border-r-0 ${supplier.selected ? "bg-sky-50" : "bg-slate-50"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-slate-950">{supplier.name}</p>
                    <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-slate-500"><CalendarDays className="h-3 w-3" aria-hidden="true" />{displayDate(supplier.quoteDate || supplier.checkedAt)}</div>
                  </div>
                  {supplier.selected ? <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Selected</span> : null}
                </div>
              </div>
            ))}

            {items.map((item, itemIndex) => (
              <div key={item.id} className="contents">
                <div className={`sticky left-0 z-10 border-r border-slate-200 px-4 py-3 shadow-[6px_0_10px_-10px_rgba(15,23,42,0.35)] ${itemIndex % 2 ? "bg-slate-50" : "bg-white"}`}>
                  <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
                    <div>
                      <p className="text-sm font-extrabold tabular-nums text-slate-950">{item.quantity.toLocaleString()}</p>
                      <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">{item.unit}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-5 text-slate-950">{item.description}</p>
                      {item.specification ? <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-500">{item.specification}</p> : null}
                    </div>
                  </div>
                </div>

                {suppliers.map((supplier) => {
                  const observation = pricesBySupplier.get(supplier.id)?.get(item.id);
                  const available = Boolean(observation && observation.available !== false && observation.unitPrice !== null);
                  const unitPrice = available ? safeNumber(observation?.unitPrice) : null;
                  const lowest = unitPrice !== null && lowestByItem.get(item.id) === unitPrice;
                  const sourceLabel = observation?.sourceLabel || supplier.sourceLabel || "Supplier quote";
                  const sourceUrl = observation?.sourceUrl || supplier.sourceUrl;
                  const checkedAt = observation?.checkedAt || supplier.checkedAt || supplier.quoteDate;

                  return (
                    <div key={supplier.id} className={`border-r border-t border-slate-100 px-4 py-3 last:border-r-0 ${lowest ? "bg-emerald-50/70" : itemIndex % 2 ? "bg-slate-50/55" : "bg-white"}`}>
                      {unitPrice === null ? (
                        <div className="flex min-h-16 flex-col justify-center">
                          <p className="text-xs font-bold text-amber-800">Not quoted</p>
                          <p className="mt-0.5 text-[10px] text-slate-500">Waiting for this item</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-base font-extrabold tabular-nums text-slate-950">{money(unitPrice, currency)}</p>
                            {lowest ? <span className="text-[9px] font-extrabold uppercase tracking-wide text-emerald-700">Lowest</span> : null}
                          </div>
                          <p className="mt-0.5 text-[10px] font-medium text-slate-500">per {observation?.unit || item.unit} · {money(unitPrice * safeNumber(item.quantity), currency)} line</p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            {sourceLink(sourceLabel, sourceUrl, true)}
                            <span className="shrink-0 text-[9px] text-slate-400">{displayDate(checkedAt)}</span>
                          </div>
                          {observation?.notes ? <p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-slate-500">{observation.notes}</p> : null}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            <div className="sticky left-0 z-10 border-r border-t border-slate-200 bg-slate-100 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Supplier terms</p>
              <p className="mt-1 text-xs font-bold text-slate-800">Delivery and source</p>
            </div>
            {suppliers.map((supplier) => {
              const delivery = safeNumber(supplier.deliveryCharge);
              const hasEveryPrice = items.every((item) => {
                const price = pricesBySupplier.get(supplier.id)?.get(item.id);
                return price?.available !== false && price?.unitPrice !== null && price?.unitPrice !== undefined;
              });
              return (
                <div key={supplier.id} className="border-r border-t border-slate-200 bg-slate-100 px-4 py-3 last:border-r-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800"><Truck className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />{supplier.deliveryLabel || (delivery > 0 ? `${money(delivery, currency)} delivery` : "Delivery not stated")}</div>
                  <div className="mt-1.5">{sourceLink(supplier.sourceLabel || "Supplier quote", supplier.sourceUrl)}</div>
                  {onSelectSupplier ? (
                    <button
                      type="button"
                      onClick={() => onSelectSupplier(supplier.id)}
                      disabled={!hasEveryPrice || supplier.selected}
                      className="mt-3 min-h-9 w-full border border-slate-900 bg-slate-950 px-3 text-xs font-bold text-white transition hover:bg-slate-800 disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500"
                    >
                      {supplier.selected ? "Selected" : hasEveryPrice ? "Choose supplier" : "Missing prices"}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
