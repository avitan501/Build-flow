type RefreshRuntime = {
  now: () => number
  available: () => boolean
  interval: (callback: () => void, delay: number) => () => void
  onWake: (callback: () => void) => () => void
}

/** One page refresh timer even when several source files are being organized. */
export function createRequestRefreshCoordinator(refresh: () => void, runtime: RefreshRuntime) {
  const subscribers = new Map<symbol, number>()
  let stopTimer: (() => void) | undefined
  let stopWake: (() => void) | undefined
  let lastRefresh = runtime.now()
  const minimum = () => Math.min(...subscribers.values())
  function tick(wake = false) {
    if (!subscribers.size || !runtime.available()) return
    const now = runtime.now()
    if (now - lastRefresh < (wake ? 500 : minimum())) return
    lastRefresh = now
    refresh()
  }
  function reschedule() {
    stopTimer?.()
    stopTimer = subscribers.size ? runtime.interval(() => tick(), minimum()) : undefined
    if (!subscribers.size) { stopWake?.(); stopWake = undefined }
    else if (!stopWake) stopWake = runtime.onWake(() => tick(true))
  }
  return {
    subscribe(delay: number) {
      if (!Number.isFinite(delay) || delay < 500) throw new Error("Invalid refresh interval")
      const id = Symbol()
      subscribers.set(id, delay)
      reschedule()
      return () => { subscribers.delete(id); reschedule() }
    },
  }
}
