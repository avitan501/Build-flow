"use client"

import { startTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createRequestRefreshCoordinator } from "@/lib/request-refresh-coordinator"

// Client-only router identities; never store request data or sessions here.
const coordinators = new WeakMap<object, ReturnType<typeof createRequestRefreshCoordinator>>()

export function useRequestRefresh(delay: number | null) {
  const router = useRouter()
  useEffect(() => {
    if (delay === null) return
    let coordinator = coordinators.get(router)
    if (!coordinator) {
      coordinator = createRequestRefreshCoordinator(() => startTransition(() => router.refresh()), {
        now: () => performance.now(),
        available: () => navigator.onLine && document.visibilityState === "visible",
        interval: (callback, milliseconds) => {
          const timer = window.setInterval(callback, milliseconds)
          return () => window.clearInterval(timer)
        },
        onWake: callback => {
          window.addEventListener("focus", callback)
          window.addEventListener("online", callback)
          document.addEventListener("visibilitychange", callback)
          return () => {
            window.removeEventListener("focus", callback)
            window.removeEventListener("online", callback)
            document.removeEventListener("visibilitychange", callback)
          }
        },
      })
      coordinators.set(router, coordinator)
    }
    return coordinator.subscribe(delay)
  }, [router, delay])
}
