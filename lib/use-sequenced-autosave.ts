"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { createAutosaveVersionGuard } from "@/lib/autosave-version"

export type AutosaveResult = { ok: true; version?: number } | { ok: false; error: string; version?: number }
export type AutosaveState = { status: "idle" | "saving" | "saved" | "error"; error: string }

export function useSequencedAutosave<T>({
  delay = 650,
  save,
  onSaved,
}: {
  delay?: number
  save: (value: T, version: number) => Promise<AutosaveResult>
  onSaved?: (value: T) => void
}) {
  const [state, setState] = useState<AutosaveState>({ status: "idle", error: "" })
  const [versionGuard] = useState(createAutosaveVersionGuard)
  const settledVersionRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestValueRef = useRef<T | null>(null)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const saveRef = useRef(save)
  const onSavedRef = useRef(onSaved)

  useEffect(() => {
    saveRef.current = save
    onSavedRef.current = onSaved
  })

  const run = useCallback((value: T, version: number) => {
    let saved = false
    const task = saveQueueRef.current.then(async () => {
      if (!versionGuard.isCurrent(version)) return
      let result: AutosaveResult
      try {
        result = await saveRef.current(value, version)
      } catch {
        result = { ok: false, error: "Not saved. Check the connection and retry.", version }
      }
      if (!versionGuard.isCurrent(version)) return
      if (!result.ok) {
        setState({ status: "error", error: result.error })
        return
      }
      settledVersionRef.current = version
      setState({ status: "saved", error: "" })
      onSavedRef.current?.(value)
      saved = true
    })
    saveQueueRef.current = task.catch(() => undefined)
    return task.then(() => saved)
  }, [versionGuard])

  const queue = useCallback((value: T) => {
    latestValueRef.current = value
    const version = versionGuard.next()
    if (timerRef.current) clearTimeout(timerRef.current)
    setState({ status: "saving", error: "" })
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void run(value, version)
    }, delay)
  }, [delay, run, versionGuard])

  const retry = useCallback(() => {
    const value = latestValueRef.current
    if (value === null) return
    const version = versionGuard.next()
    if (timerRef.current) clearTimeout(timerRef.current)
    setState({ status: "saving", error: "" })
    void run(value, version)
  }, [run, versionGuard])

  const flush = useCallback(async () => {
    const value = latestValueRef.current
    if (value === null || settledVersionRef.current === versionGuard.current()) return true
    const version = versionGuard.next()
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setState({ status: "saving", error: "" })
    return run(value, version)
  }, [run, versionGuard])

  const cancelPending = useCallback(() => {
    versionGuard.invalidate()
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setState({ status: "idle", error: "" })
  }, [versionGuard])

  useEffect(() => () => {
    versionGuard.invalidate()
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [versionGuard])

  return { ...state, queue, retry, flush, cancelPending }
}
