import "server-only"

import { getSessionWithProfile } from "@/lib/auth"
import type { ShopActivityEvent } from "@/lib/shop-activity"

export async function loadShopActivityForCurrentUser(limit = 24): Promise<ShopActivityEvent[]> {
  const { supabase, user } = await getSessionWithProfile()
  if (!user) return []

  const { data, error } = await supabase
    .from("shop_activity")
    .select("event_type, query, product_slug, product_name, category, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map((row) => ({
    eventType: row.event_type,
    query: row.query,
    productSlug: row.product_slug,
    productName: row.product_name,
    category: row.category,
    createdAt: row.created_at,
  }))
}
