"use client"

import { useRequestRefresh } from "@/lib/use-request-refresh"

const REQUEST_REFRESH_INTERVAL_MS = 10_000

export function RequestLiveSync() {
  useRequestRefresh(REQUEST_REFRESH_INTERVAL_MS)

  return null
}
