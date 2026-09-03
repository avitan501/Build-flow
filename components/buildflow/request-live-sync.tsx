"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useTransition } from "react"

const REQUEST_REFRESH_INTERVAL_MS = 10_000

export function RequestLiveSync() {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const refresh = useCallback(() => {
    if (!navigator.onLine || document.visibilityState !== "visible") return
    startTransition(() => router.refresh())
  }, [router])

  useEffect(() => {
    const timer = window.setInterval(refresh, REQUEST_REFRESH_INTERVAL_MS)
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh()
    }
    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", refreshWhenVisible)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener("focus", refresh)
      document.removeEventListener("visibilitychange", refreshWhenVisible)
    }
  }, [refresh])

  return null
}
