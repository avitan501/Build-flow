"use client";

export type EditableOwnerMaterialRow = {
  id: number;
  qty: number;
  itemNo: string;
  sku: string;
  description: string;
  category: string;
  unit: string;
  supplier: string;
  supplierUnitPrice: number;
  markupPercent: number;
  markupDollar: number;
  finalUnitPrice: number;
  duplicateKey: string;
  publishStatus: "Blocked" | "Published";
  reviewStatus: "Prep only" | "Needs review";
  photoCount: number;
  imageAlt: string;
  imageSource: string;
  imageLicense: string;
  imageCredit: string;
  imageCategory: string;
  galleryCount: number;
};

type OwnerMaterialsAdminTableProps = {
  rows: EditableOwnerMaterialRow[];
  selectedRowIds: number[];
  onToggleSelectedRow: (rowId: number) => void;
  onToggleSelectAll: () => void;
  allVisibleSelected: boolean;
  onMarkupChange: (index: number, patch: Partial<EditableOwnerMaterialRow>) => void;
  onFinalPriceChange: (index: number, nextFinal: number) => void;
  onEditRow: (rowId: number) => void;
  editingRowId: number | null;
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function numberInput(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

export function OwnerMaterialsAdminTable({
  rows,
  selectedRowIds,
  onToggleSelectedRow,
  onToggleSelectAll,
  allVisibleSelected,
  onMarkupChange,
  onFinalPriceChange,
  onEditRow,
  editingRowId,
}: OwnerMaterialsAdminTableProps) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-[#d7e2f2] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-950">Material table</div>
            <p className="mt-1 text-sm text-slate-600">Compact product-style admin rows with pricing, image placeholders, and blocked publish controls.</p>
          </div>
          <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">More actions</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1880px] text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-4 font-semibold">
                <input type="checkbox" checked={allVisibleSelected} onChange={onToggleSelectAll} className="h-4 w-4 rounded border-slate-300" aria-label="Select all visible materials" />
              </th>
              {[
                "Status",
                "Image",
                "Item no / SKU",
                "Material name / description",
                "Category",
                "Supplier",
                "Qty",
                "Unit",
                "Cost / unit price",
                "Markup / sell price",
                "Publish status",
                "Actions",
              ].map((label) => (
                <th key={label} className="px-4 py-4 font-semibold">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const extendedClientPrice = row.qty * row.finalUnitPrice;
              const isSelected = selectedRowIds.includes(row.id);
              const isEditing = editingRowId === row.id;

              return (
                <tr key={`${row.itemNo}-${row.id}`} className={`border-t border-slate-100 align-top ${isEditing ? "bg-sky-50/40" : "bg-white"}`}>
                  <td className="px-4 py-4">
                    <input type="checkbox" checked={isSelected} onChange={() => onToggleSelectedRow(row.id)} className="h-4 w-4 rounded border-slate-300" aria-label={`Select ${row.itemNo}`} />
                  </td>
                  <td className="px-4 py-4">
                    <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${row.reviewStatus === "Needs review" ? "border border-rose-200 bg-rose-50 text-rose-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                      {row.reviewStatus}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-[11px] font-medium text-slate-500">No image</div>
                      <div>
                        <button type="button" className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">Add photo</button>
                        <div className="mt-2 text-xs text-slate-500">{row.photoCount} photos · gallery {row.galleryCount}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-950">{row.itemNo}</div>
                    <div className="mt-1 text-xs text-slate-500">{row.sku}</div>
                  </td>
                  <td className="min-w-[280px] px-4 py-4">
                    <div className="font-medium text-slate-950">{row.description}</div>
                    <div className="mt-1 text-xs text-slate-500">{row.duplicateKey}</div>
                  </td>
                  <td className="px-4 py-4">{row.category}</td>
                  <td className="px-4 py-4">{row.supplier}</td>
                  <td className="px-4 py-4">{row.qty}</td>
                  <td className="px-4 py-4">{row.unit}</td>
                  <td className="px-4 py-4">
                    <div className="space-y-2">
                      <input
                        type="number"
                        step="0.01"
                        value={numberInput(row.supplierUnitPrice)}
                        onChange={(event) => onMarkupChange(row.id, { supplierUnitPrice: Number(event.target.value || 0) })}
                        className="w-28 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900"
                      />
                      <div className="text-xs text-slate-500">Supplier cost</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="grid gap-2">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={numberInput(row.markupPercent)}
                          onChange={(event) => onMarkupChange(row.id, { markupPercent: Number(event.target.value || 0) })}
                          className="w-24 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={numberInput(row.markupDollar)}
                          onChange={(event) => onMarkupChange(row.id, { markupDollar: Number(event.target.value || 0) })}
                          className="w-24 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900"
                        />
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={numberInput(row.finalUnitPrice)}
                        onChange={(event) => onFinalPriceChange(row.id, Number(event.target.value || 0))}
                        className="w-32 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900"
                      />
                      <div className="text-xs text-slate-500">Extended {money(extendedClientPrice)}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Blocked</div>
                    <p className="mt-2 max-w-[180px] text-xs leading-5 text-slate-500">Publishing will be enabled after protected shop write action is connected.</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex min-w-[170px] flex-col gap-2">
                      <button type="button" onClick={() => onEditRow(row.id)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">Edit</button>
                      <button type="button" disabled className="cursor-not-allowed rounded-xl bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-500">Publish</button>
                      <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">More</button>
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
