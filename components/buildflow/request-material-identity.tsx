import { requestItemFieldsFromMetadata } from "@/lib/request-item-fields"

export function RequestMaterialIdentity({ name, quantity, metadata }: {
  name: string
  quantity: string
  metadata?: Record<string, unknown> | null
}) {
  const fields = requestItemFieldsFromMetadata(metadata)
  const priority = ["dimensions", "length", "thickness", "model", "custom-section"]
  const specifications = priority.flatMap(id => fields.filter(field => field.id === id).map(field => field.value))
  return <div className="min-w-0">
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"><p className="min-w-0 break-words text-sm font-extrabold leading-5 text-slate-950">{name}</p><span className="shrink-0 text-[10px] font-bold text-slate-500">{quantity}</span></div>
    {specifications.length ? <p className="mt-0.5 break-words text-xs font-semibold leading-5 text-slate-600">{[...new Set(specifications)].join(" · ")}</p> : null}
  </div>
}
