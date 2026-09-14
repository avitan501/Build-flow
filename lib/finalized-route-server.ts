import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"
import type { FinalizedProcurementRoute, FinalizedRouteItem, FinalizedRouteSupplier } from "@/lib/finalized-procurement-route"

export async function loadFinalizedProcurementRoute(supabase: SupabaseClient, comparisonId: string, routeId?: string | null) {
  if (!routeId) return { route: null, error: null }
  const { data, error } = await supabase.from("quote_comparison_routes").select("*,quote_comparison_route_items(*),quote_comparison_route_suppliers(*)").eq("comparison_id", comparisonId).eq("id", routeId).maybeSingle()
  if (error || !data) return { route: null, error: "Saved supplier route could not be loaded. Retry before continuing." }
  const route: FinalizedProcurementRoute = { ...data, items: data.quote_comparison_route_items as FinalizedRouteItem[], suppliers: data.quote_comparison_route_suppliers as FinalizedRouteSupplier[] }
  const checked = await createAdminClient().rpc("quote_finalized_route_is_current", { p_comparison_id: comparisonId, p_route_id: routeId })
  return { route, error: checked.error || checked.data !== true ? "Products, prices or source evidence changed. Reopen and review the supplier route before continuing." : null }
}
