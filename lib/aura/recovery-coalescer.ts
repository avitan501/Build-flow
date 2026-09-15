/** Best-effort, process-local recovery throttling, not a distributed lock.
 * Keep only bounded result counters/promises, never provider message bodies.
 * Webhooks and explicit sends must not use this helper.
 */
export function createRecoveryCoalescer<T>({
  ttlMs = 15_000,
  maxEntries = 8,
  now = Date.now,
}: { ttlMs?: number; maxEntries?: number; now?: () => number } = {}) {
  type Entry = { promise: Promise<T> | null; value?: T; expiresAt: number }
  const entries = new Map<string, Entry>()
  return (key: string, work: () => Promise<T>, force = false): Promise<T> => {
    const time = now()
    for (const [oldKey, entry] of entries) {
      if (!entry.promise && entry.expiresAt <= time) entries.delete(oldKey)
    }
    const existing = entries.get(key)
    // Even an explicit refresh joins an active run instead of duplicating it.
    if (existing?.promise) return existing.promise
    if (existing && !force) return Promise.resolve(existing.value as T)
    if (!existing && entries.size >= maxEntries) {
      const idleKey = [...entries].find(([, entry]) => !entry.promise)?.[0]
      if (idleKey !== undefined) entries.delete(idleKey)
      // Do not evict an active run or let unusual configuration churn grow
      // memory without bound. Overflow still performs recovery without cache.
      else return Promise.resolve().then(work)
    }
    const entry: Entry = { promise: null, expiresAt: 0 }
    const promise = Promise.resolve().then(work).then(value => {
      entry.value = value
      entry.expiresAt = now() + ttlMs
      entry.promise = null
      return value
    }, error => {
      if (entries.get(key) === entry) entries.delete(key)
      throw error
    })
    entry.promise = promise
    entries.set(key, entry)
    return promise
  }
}
