"use client";

import type { OwnerMaterialRowState } from "@/lib/owner-materials-admin-data";
import type { ShopCategoryName } from "@/lib/shop";

export type EditableOwnerMaterialRow = OwnerMaterialRowState;

type OwnerMaterialsAdminTableProps = {
  rows: EditableOwnerMaterialRow[];
  selectedRowIds: string[];
  onToggleRow: (rowId: string) => void;
  onToggleAll: () => void;
  onEditRow: (rowId: string) => void;
  onPublishRow: (rowId: string) => void;
  onUnpublishRow: (rowId: string) => void;
  onDuplicateRow: (rowId: string) => void;
  onRemoveRow: (rowId: string) => void;
  onAddPhoto: (rowId: string) => void;
  onRemovePhoto: (rowId: string) => void;
  editingRowId: string | null;
  categoryOptions: readonly ShopCategoryName[];
  onChangeCategory: (rowId: string, category: ShopCategoryName) => void;
};

function statusTone(status: EditableOwnerMaterialRow["publishStatus"] | EditableOwnerMaterialRow["reviewStatus"]) {
  switch (status) {
    case "Published":
    case "Ready":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Needs review":
    case "Missing image":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

export function OwnerMaterialsAdminTable(props: OwnerMaterialsAdminTableProps) {
  const allSelected = props.rows.length > 0 && props.rows.every((row) => props.selectedRowIds.includes(row.id));

  return (
    <div className="space-y-4">
      <div className="hidden overflow-hidden rounded-[24px] border border-slate-200 lg:block">
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-[1120px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3"><input type="checkbox" checked={allSelected} onChange={props.onToggleAll} /></th>
                <th className="px-4 py-3">Item no</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Unit price</th>
                <th className="px-4 py-3">Photo</th>
                <th className="px-4 py-3">Publish</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {props.rows.map((row) => (
                <tr key={row.id} className={`border-t border-slate-100 ${props.editingRowId === row.id ? "bg-sky-50/60" : "bg-white"}`}>
                  <td className="px-4 py-4 align-top"><input type="checkbox" checked={props.selectedRowIds.includes(row.id)} onChange={() => props.onToggleRow(row.id)} /></td>
                  <td className="px-4 py-4 align-top">
                    <div className="font-semibold text-slate-950">{row.itemNo || "—"}</div>
                    <div className="text-xs text-slate-500">{row.supplier}</div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="font-medium text-slate-950">{row.description}</div>
                    {row.error ? <div className="mt-1 text-xs text-rose-600">{row.error}</div> : null}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <select
                      value={row.category}
                      onChange={(event) => props.onChangeCategory(row.id, event.target.value as ShopCategoryName)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900"
                    >
                      {props.categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-4 align-top">{row.unit}</td>
                  <td className="px-4 py-4 align-top">${row.finalUnitPrice.toFixed(2)}</td>
                  <td className="px-4 py-4 align-top">
                    <div className="space-y-2">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone(row.photoCount > 0 ? "Ready" : "Missing image")}`}>
                        {row.photoCount > 0 ? `${row.photoCount} photo` : "Missing image"}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => props.onAddPhoto(row.id)} className="rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">{row.photoCount > 0 ? "Replace" : "Add"}</button>
                        {row.photoCount > 0 ? <button type="button" onClick={() => props.onRemovePhoto(row.id)} className="rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">Remove</button> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone(row.publishStatus)}`}>{row.publishStatus}</span>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => props.onEditRow(row.id)} className="rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">Edit</button>
                      {row.publishStatus === "Published" ? (
                        <button type="button" onClick={() => props.onUnpublishRow(row.id)} className="rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">Unpublish</button>
                      ) : (
                        <button type="button" onClick={() => props.onPublishRow(row.id)} className="rounded-xl bg-slate-950 px-2.5 py-1 text-xs font-medium text-white">Publish</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 lg:hidden">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <label className="flex items-center gap-3 font-medium text-slate-700">
            <input type="checkbox" checked={allSelected} onChange={props.onToggleAll} />
            Select all visible
          </label>
          <span className="text-slate-500">{props.rows.length} items</span>
        </div>

        {props.rows.map((row) => (
          <article key={row.id} className={`rounded-[24px] border p-4 shadow-sm ${props.editingRowId === row.id ? "border-sky-300 bg-sky-50/60" : "border-slate-200 bg-white"}`}>
            <div className="flex items-start justify-between gap-3">
              <label className="flex items-start gap-3">
                <input type="checkbox" checked={props.selectedRowIds.includes(row.id)} onChange={() => props.onToggleRow(row.id)} className="mt-1" />
                <div>
                  <div className="text-sm font-semibold text-slate-950">{row.description}</div>
                  <div className="text-xs text-slate-500">{row.itemNo || "—"} • {row.sku}</div>
                </div>
              </label>
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone(row.publishStatus)}`}>{row.publishStatus}</span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Category</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  <select
                    value={row.category}
                    onChange={(event) => props.onChangeCategory(row.id, event.target.value as ShopCategoryName)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900"
                  >
                    {props.categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </dd>
              </div>
              <div><dt className="text-xs uppercase tracking-wide text-slate-500">Supplier</dt><dd className="mt-1 font-medium text-slate-900">{row.supplier}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-slate-500">Unit</dt><dd className="mt-1 font-medium text-slate-900">{row.unit}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-slate-500">Unit price</dt><dd className="mt-1 font-medium text-slate-900">${row.finalUnitPrice.toFixed(2)}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-slate-500">Photo</dt><dd className="mt-1 font-medium text-slate-900">{row.photoCount > 0 ? `${row.photoCount} photo` : "Missing image"}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-slate-500">Review</dt><dd className="mt-1 font-medium text-slate-900">{row.reviewStatus}</dd></div>
            </dl>

            {row.error ? <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{row.error}</div> : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => props.onEditRow(row.id)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">Edit</button>
              {row.publishStatus === "Published" ? (
                <button type="button" onClick={() => props.onUnpublishRow(row.id)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">Unpublish</button>
              ) : (
                <button type="button" onClick={() => props.onPublishRow(row.id)} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-medium text-white">Publish</button>
              )}
              <button type="button" onClick={() => props.onAddPhoto(row.id)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">{row.photoCount > 0 ? "Replace photo" : "Add photo"}</button>
              {row.photoCount > 0 ? <button type="button" onClick={() => props.onRemovePhoto(row.id)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">Remove photo</button> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
