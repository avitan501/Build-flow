"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionWithProfile } from "@/lib/auth"
import type { ShopActivityEventType } from "@/lib/shop-activity"

export async function recordShopActivity(input: {
  eventType: ShopActivityEventType
  sessionId?: string | null
  query?: string | null
  productSlug?: string | null
  productName?: string | null
  category?: string | null
  metadata?: Record<string, unknown> | null
}) {
  try {
    const { user } = await getSessionWithProfile()
    const admin = createAdminClient()

    await admin.from("shop_activity").insert({
      user_id: user?.id ?? null,
      session_id: input.sessionId?.trim() || null,
      event_type: input.eventType,
      query: input.query?.trim() || null,
      product_slug: input.productSlug?.trim() || null,
      product_name: input.productName?.trim() || null,
      category: input.category?.trim() || null,
      metadata: input.metadata ?? null,
    })

    return { ok: true }
  } catch {
    return { ok: false }
  }
}
