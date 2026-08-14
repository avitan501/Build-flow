import "server-only"

import { cookies } from "next/headers"

import { parseShopLanguage, SHOP_LANGUAGE_COOKIE } from "@/lib/shop-i18n"

export async function getRequestedShopLanguage() {
  const cookieStore = await cookies()
  return parseShopLanguage(cookieStore.get(SHOP_LANGUAGE_COOKIE)?.value)
}
