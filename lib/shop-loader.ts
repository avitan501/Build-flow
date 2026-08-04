import "server-only";

import { SHOP_ITEM_SELECT_FIELDS, type ShopItemRecord } from "@/lib/shop";
import { getLocalPublishedShopItems } from "@/lib/owner-materials-admin-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type LoadShopItemsOptions = {
  limit?: number;
};

const SHOP_ITEMS_REMOTE_TIMEOUT_MS = 1500;

function shopItemsTimeoutSignal() {
  if (typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(SHOP_ITEMS_REMOTE_TIMEOUT_MS);
  }

  const controller = new AbortController();
  setTimeout(() => controller.abort(), SHOP_ITEMS_REMOTE_TIMEOUT_MS);
  return controller.signal;
}

function isAbortResult(error: unknown) {
  if (!error) return false;
  const message = error instanceof Error ? error.message : typeof error === "object" && "message" in error ? String((error as { message?: unknown }).message ?? "") : String(error);
  return message.toLowerCase().includes("abort");
}

function mergeUniqueShopItems(primary: ShopItemRecord[] | null | undefined, fallback: ShopItemRecord[]) {
  const merged = [...fallback, ...(primary ?? [])];
  return merged.filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);
}

function emptyShopResult(data: ShopItemRecord[]) {
  return { data, error: null, count: null, status: 200, statusText: "OK" };
}

export async function loadShopItems({ limit = 24 }: LoadShopItemsOptions = {}) {
  const localItems = await getLocalPublishedShopItems();
  if (!hasSupabasePublicEnv()) {
    return emptyShopResult(localItems.slice(0, limit));
  }

  const supabase = await createClient();
  const publicResult = await supabase
    .from("shop_items")
    .select(SHOP_ITEM_SELECT_FIELDS)
    .order("created_at", { ascending: false })
    .limit(limit)
    .abortSignal(shopItemsTimeoutSignal())
    .returns<ShopItemRecord[]>();

  if (!publicResult.error && (publicResult.data?.length ?? 0) > 0) {
    return {
      ...publicResult,
      data: mergeUniqueShopItems(publicResult.data, localItems).slice(0, limit),
    };
  }

  if (isAbortResult(publicResult.error)) {
    console.warn("[shop-loader] shop_items public query timed out; using local catalog fallback.");
    return emptyShopResult(localItems.slice(0, limit));
  }

  try {
    const admin = createAdminClient();
    const adminResult = await admin
      .from("shop_items")
      .select(SHOP_ITEM_SELECT_FIELDS)
      .order("created_at", { ascending: false })
      .limit(limit)
      .abortSignal(shopItemsTimeoutSignal())
      .returns<ShopItemRecord[]>();

    if ((adminResult.data?.length ?? 0) > 0 || publicResult.error) {
      if (isAbortResult(adminResult.error)) {
        console.warn("[shop-loader] shop_items admin query timed out; using local catalog fallback.");
        return emptyShopResult(localItems.slice(0, limit));
      }

      return {
        ...adminResult,
        data: mergeUniqueShopItems(adminResult.data, localItems).slice(0, limit),
      };
    }
  } catch {
    if (localItems.length > 0) return emptyShopResult(localItems.slice(0, limit));
  }

  return {
    ...publicResult,
    data: localItems.slice(0, limit),
  };
}
