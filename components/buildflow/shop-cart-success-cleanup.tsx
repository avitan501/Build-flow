"use client"

import { useEffect } from "react"

import { writeShopCartMap } from "@/lib/shop-cart"

type ShopCartSuccessCleanupProps = {
  shouldClear: boolean
}

export function ShopCartSuccessCleanup({ shouldClear }: ShopCartSuccessCleanupProps) {
  useEffect(() => {
    if (!shouldClear) return

    writeShopCartMap({})
  }, [shouldClear])

  return null
}
