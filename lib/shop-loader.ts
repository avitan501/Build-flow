import "server-only";

import { SHOP_ITEM_SELECT_FIELDS, type ShopItemRecord } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type LoadShopItemsOptions = {
  limit?: number;
};

export async function loadShopItems({ limit = 24 }: LoadShopItemsOptions = {}) {
  const supabase = await createClient();
  const publicResult = await supabase
    .from("shop_items")
    .select(SHOP_ITEM_SELECT_FIELDS)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<ShopItemRecord[]>();

  if (!publicResult.error) {
    return publicResult;
  }

  const admin = createAdminClient();
  return admin
    .from("shop_items")
    .select(SHOP_ITEM_SELECT_FIELDS)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<ShopItemRecord[]>();
}
