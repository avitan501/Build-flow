export function createAutosaveVersionGuard() {
  let currentVersion = 0
  return {
    current: () => currentVersion,
    next: () => {
      currentVersion += 1
      return currentVersion
    },
    isCurrent: (version: number) => version === currentVersion,
    invalidate: () => {
      currentVersion += 1
    },
  }
}
