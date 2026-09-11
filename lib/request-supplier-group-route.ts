export type SupplierRouteMode = "item" | "batch" | "group" | "reset"
export type SupplierGroupRoute = { names: string[]; entries: Array<{ supplier_id: string; name: string }>; notes: Record<string, string> }

export function requestSupplierRouteGroupKey(item: { name: string; department: string | null }) {
  const department = item.department?.trim()
  if (department) return department.toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim()
  const name = item.name.toLowerCase()
  const groups = [
    ["plumbing", ["valve", "meter", "pipe", "fitting", "faucet", "toilet", "drain", "strainer", "pressure zone"]],
    ["electrical", ["wire", "breaker", "outlet", "switch", "panel", "fixture"]],
    ["flooring", ["floor", "vinyl", "tile", "carpet", "underlayment"]],
    ["framing", ["lumber", "stud", "joist", "plywood", "osb"]],
    ["drywall", ["drywall", "sheetrock", "compound", "corner bead"]],
    ["paint", ["paint", "primer", "stain", "coating"]],
  ] as const
  return groups.find(([, words]) => words.some((word) => name.includes(word)))?.[0] ?? "other materials"
}

export function supplierRouteRevision(metadata: Record<string, unknown> | null | undefined) {
  const value = metadata?.supplier_route_revision
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0
}

export function hasSupplierRouteOverride(metadata: Record<string, unknown> | null | undefined) {
  if (metadata?.supplier_route_mode === "override") return true
  if (metadata?.supplier_route_mode === "group") return false
  return (Array.isArray(metadata?.supplier_route_names) && metadata.supplier_route_names.some((name) => typeof name === "string" && Boolean(name.trim())))
    || (Array.isArray(metadata?.supplier_route_entries) && metadata.supplier_route_entries.length > 0)
}

export function supplierGroupRouteDefault(metadata: Record<string, unknown> | null | undefined, groupKey?: string): SupplierGroupRoute | null {
  if (groupKey && metadata?.supplier_route_group_key !== groupKey) return null
  const route = metadata?.supplier_route_group_default
  if (!route || typeof route !== "object" || Array.isArray(route)) return null
  const value = route as Partial<SupplierGroupRoute>
  if (!Array.isArray(value.names) || !value.names.every((name) => typeof name === "string") || !Array.isArray(value.entries) || !value.entries.every((entry) => entry && typeof entry.supplier_id === "string" && typeof entry.name === "string") || !value.notes || typeof value.notes !== "object" || Array.isArray(value.notes)) return null
  return value as SupplierGroupRoute
}

/** Pure reference for the atomic RPC behavior, also used by display/tests. */
export function supplierRouteMetadataPatch(metadata: Record<string, unknown> | null, route: SupplierGroupRoute, mode: SupplierRouteMode, groupKey: string) {
  const current = metadata ?? {}
  const override = mode === "group" && hasSupplierRouteOverride(current)
  return {
    ...current,
    ...(mode === "group" || mode === "reset" ? { supplier_route_group_key: groupKey, supplier_route_group_default: route } : {}),
    ...(override ? {} : { supplier_route_names: route.names, supplier_route_entries: route.entries, supplier_route_notes: route.notes, supplier_route_note: null }),
    supplier_route_mode: mode === "item" || mode === "batch" || override ? "override" : "group",
    supplier_route_revision: supplierRouteRevision(metadata) + 1,
  }
}
