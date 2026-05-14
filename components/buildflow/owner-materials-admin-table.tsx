"use client";

export type EditableOwnerMaterialRow = {
  id: number;
  qty: number;
  itemNo: string;
  description: string;
  unit: string;
  supplier: string;
  supplierUnitPrice: number;
  markupPercent: number;
  markupDollar: number;
  finalUnitPrice: number;
  duplicateKey: string;
  publishStatus: "Blocked" | "Ready";
};

type OwnerMaterialsAdminTableProps = {
  rows: EditableOwnerMaterialRow[];
  onMarkupChange: (index: number, patch: Partial<EditableOwnerMaterialRow>) => void;
  onFinalPriceChange: (index: number, nextFinal: number) => void;
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function numberInput(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

export function OwnerMaterialsAdminTable({ rows, onMarkupChange, onFinalPriceChange }: OwnerMaterialsAdminTableProps) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-[#d7e2f2] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="text-sm font-semibold text-slate-950">Material rows</div>
        <p className="mt-1 text-sm text-slate-600">Pricing controls stay editable. Publishing remains blocked until protected shop write action is connected.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1680px] text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-500">
            <tr>
              {[
                "Select",
                "Status",
                "Image",
                "Item No.",
                "Description",
                "Supplier",
                "Qty",
                "Unit",
                "Supplier Unit Price",
                "Markup %",
                "Markup $",
                "Final Client/Shop Price",
                "Extended Client Price",
                "Publish Status",
                "Actions",
              ].map((label) => (
                <th key={label} className="px-4 py-4 font-semibold">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const extendedClientPrice = row.qty * row.finalUnitPrice;

              return (
                <tr key={`${row.itemNo}-${row.id}`} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-4">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" aria-label={`Select ${row.itemNo}`} />
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Prep only
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center text-[11px] font-medium text-slate-500">
                      <span>Photo</span>
                      <span>placeholder</span>
                    </div>
                    <button type="button" className="mt-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">
                      Add photo
                    </button>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-950">{row.itemNo}</td>
                  <td className="px-4 py-4 min-w-[280px]">
                    <div className="font-medium text-slate-950">{row.description}</div>
                    <div className="mt-1 text-xs text-slate-500">{row.duplicateKey}</div>
                  </td>
                  <td className="px-4 py-4">{row.supplier}</td>
                  <td className="px-4 py-4">{row.qty}</td>
                  <td className="px-4 py-4">{row.unit}</td>
                  <td className="px-4 py-4">
                    <input
                      type="number"
                      step="0.01"
                      value={numberInput(row.supplierUnitPrice)}
                      onChange={(event) => onMarkupChange(row.id, { supplierUnitPrice: Number(event.target.value || 0) })}
                      className="w-28 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="number"
                      step="0.01"
                      value={numberInput(row.markupPercent)}
                      onChange={(event) => onMarkupChange(row.id, { markupPercent: Number(event.target.value || 0) })}
                      className="w-24 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="number"
                      step="0.01"
                      value={numberInput(row.markupDollar)}
                      onChange={(event) => onMarkupChange(row.id, { markupDollar: Number(event.target.value || 0) })}
                      className="w-24 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="number"
                      step="0.01"
                      value={numberInput(row.finalUnitPrice)}
                      onChange={(event) => onFinalPriceChange(row.id, Number(event.target.value || 0))}
                      className="w-32 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900"
                    />
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-950">{money(extendedClientPrice)}</td>
                  <td className="px-4 py-4">
                    <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                      Blocked
                    </div>
                    <p className="mt-2 max-w-[180px] text-xs leading-5 text-slate-500">Publishing will be enabled after protected shop write action is connected.</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                        Edit pricing
                      </button>
                      <button type="button" disabled className="cursor-not-allowed rounded-xl bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-500">
                        Publish blocked
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
