"use client"

import { useCallback, useState, useSyncExternalStore } from "react"

const memory = new Map<string, string>()
const eventName = "avantia-reply-draft"
const subscribe = (listener: () => void) => {
  window.addEventListener(eventName, listener)
  return () => window.removeEventListener(eventName, listener)
}

// Scoped to the signed-in account and this browser tab; files are never persisted.
export function useCommunicationDraft(scope: string, thread: string, fallback: string) {
  const key = `avantia:reply:v1:${scope}:${thread}`
  const [storageFailed, setStorageFailed] = useState(false)
  const read = useCallback(() => {
    if (memory.has(key)) return memory.get(key)!
    try { return sessionStorage.getItem(key) ?? fallback } catch { return fallback }
  }, [key, fallback])
  const draft = useSyncExternalStore(subscribe, read, () => fallback)
  const setDraft = useCallback((value: string) => {
    memory.set(key, value)
    try { sessionStorage.setItem(key, value); setStorageFailed(false) }
    catch { setStorageFailed(true) }
    window.dispatchEvent(new Event(eventName))
  }, [key])
  return [draft, setDraft, storageFailed] as const
}
