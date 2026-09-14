export type AutosaveResult =
  | { ok: true; revision: number }
  | { ok: false; error: string; conflict?: boolean };

export type AutosaveState = {
  status: "saved" | "unsaved" | "saving" | "error";
  dirty: boolean;
  error: string | null;
  conflict: boolean;
};

/** One mounted record, JSON-serializable snapshots. No draft is stored on disk. */
export class AutosaveQueue<T> {
  private saved: string;
  private latest: string;
  private revision: number;
  private uncertain = false;
  private paused = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<boolean> | undefined;
  private failure: { error: string; conflict: boolean } | undefined;
  private listeners = new Set<() => void>();
  private state: AutosaveState = { status: "saved", dirty: false, error: null, conflict: false };

  constructor(
    initialSnapshot: T,
    initialRevision: number,
    private persist: (snapshot: T, expectedRevision: number) => Promise<AutosaveResult>,
    private debounceMs = 650,
    private isValid: (snapshot: T) => boolean = () => true,
  ) {
    this.saved = this.latest = JSON.stringify(initialSnapshot);
    this.revision = initialRevision;
  }

  getState = () => this.state;
  getRevision = () => this.revision;

  setPersist(persist: (snapshot: T, expectedRevision: number) => Promise<AutosaveResult>) {
    this.persist = persist;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private publish() {
    const dirty = this.latest !== this.saved || this.uncertain || Boolean(this.running) || Boolean(this.failure);
    this.state = {
      status: this.failure ? "error" : this.running ? "saving" : dirty ? "unsaved" : "saved",
      dirty,
      error: this.failure?.error ?? null,
      conflict: this.failure?.conflict ?? false,
    };
    this.listeners.forEach((listener) => listener());
  }

  cancelScheduled = () => {
    clearTimeout(this.timer);
    this.timer = undefined;
  };

  /** Unmount stops queued follow-ups; it cannot cancel a request already received by the server. */
  pause = () => {
    this.paused = true;
    this.cancelScheduled();
  };

  /** Supports React Strict Mode effect replay without discarding the draft. */
  resume = () => {
    this.paused = false;
    if (!this.running && !this.failure && this.isValid(JSON.parse(this.latest) as T) && (this.latest !== this.saved || this.uncertain)) {
      this.timer = setTimeout(() => { void this.flush(); }, this.debounceMs);
    }
  };

  update(snapshot: T) {
    const serialized = JSON.stringify(snapshot);
    this.latest = serialized;
    this.cancelScheduled();
    this.publish();
    if (!this.paused && !this.failure && !this.running && this.isValid(snapshot) && this.latest !== this.saved) {
      this.timer = setTimeout(() => { void this.flush(); }, this.debounceMs);
    }
  }

  /** Waits for the newest queued snapshot, including edits made during an in-flight save. */
  flush = (): Promise<boolean> => {
    this.cancelScheduled();
    if (this.paused) return Promise.resolve(false);
    if (this.running) return this.running;
    if (this.failure) return Promise.resolve(false);
    if (!this.isValid(JSON.parse(this.latest) as T)) return Promise.resolve(false);
    if (this.latest === this.saved && !this.uncertain) return Promise.resolve(true);
    // Start in a microtask so running is assigned even if persist throws synchronously.
    this.running = Promise.resolve().then(async () => {
      while (this.latest !== this.saved || this.uncertain) {
        if (this.paused) return false;
        if (!this.isValid(JSON.parse(this.latest) as T)) return false;
        const submitted = this.latest;
        let result: AutosaveResult;
        try {
          result = await this.persist(JSON.parse(submitted) as T, this.revision);
        } catch {
          result = { ok: false, error: "Could not confirm the save. Your changes are still here. Retry before leaving." };
        }
        if (!result.ok) {
          this.uncertain = true;
          this.failure = { error: result.error, conflict: Boolean(result.conflict) };
          return false;
        }
        if (!Number.isSafeInteger(result.revision) || result.revision <= this.revision) {
          this.uncertain = true;
          this.failure = { error: "The save could not be verified. Reload and review before continuing.", conflict: true };
          return false;
        }
        this.saved = submitted;
        this.uncertain = false;
        this.revision = result.revision;
      }
      return !this.paused;
    }).finally(() => {
      this.running = undefined;
      this.publish();
    });
    this.publish();
    return this.running;
  };

  /** Conflicts require a reload/review, never a blind overwrite of the new server revision. */
  retry = (): Promise<boolean> => {
    if (this.failure?.conflict) return Promise.resolve(false);
    this.failure = undefined;
    this.publish();
    return this.flush();
  };
}
