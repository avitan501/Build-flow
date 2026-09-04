"use client"

import { useEffect } from "react"

import { recordClientDocumentViewAction } from "./view-actions"

export function ClientDocumentViewTracker({
  token,
  documentVersion,
  managerPreviewToken,
}: {
  token: string
  documentVersion: number
  managerPreviewToken?: string | null
}) {
  useEffect(() => {
    const storageKey = `avantia-client-document-view:${token}:${documentVersion}`
    let cancelled = false
    let timeoutId: number | undefined

    const recordVisibleView = () => {
      if (cancelled || document.visibilityState !== "visible") return
      try {
        const recentlyRecordedAt = Number(window.sessionStorage.getItem(storageKey))
        if (Number.isFinite(recentlyRecordedAt) && Date.now() - recentlyRecordedAt < 10_000) return
        window.sessionStorage.setItem(storageKey, String(Date.now()))
      } catch {
        // Tracking still works when storage is disabled.
      }
      void recordClientDocumentViewAction({ token, documentVersion, managerPreviewToken })
        .then((result) => {
          if (!result.ok) {
            try { window.sessionStorage.removeItem(storageKey) } catch {}
          }
        })
    }

    const schedule = () => {
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(recordVisibleView, 1200)
    }
    schedule()
    document.addEventListener("visibilitychange", schedule)
    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
      document.removeEventListener("visibilitychange", schedule)
    }
  }, [documentVersion, managerPreviewToken, token])

  return null
}
