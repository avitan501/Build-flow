"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

const REFRESH_INTERVAL_MS = 20_000

export function CarlosDashboardAutoRefresh() {
  const router = useRouter()

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") router.refresh()
    }
    const interval = window.setInterval(refreshIfVisible, REFRESH_INTERVAL_MS)
    window.addEventListener("focus", refreshIfVisible)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", refreshIfVisible)
    }
  }, [router])

  return null
}
