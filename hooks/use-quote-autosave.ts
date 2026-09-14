"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { AutosaveQueue, type AutosaveResult } from "@/lib/autosave-queue";

// A page may contain both comparison and client-quote drafts. Navigation must
// wait for every mounted draft, not whichever click listener runs first.
const mountedQueues = new Set<Pick<AutosaveQueue<unknown>, "getState" | "flush">>();

/** scopeKey must include authenticated actor and record; never reuse one across accounts. */
export function useQuoteAutosave<T>({ scopeKey, snapshot, initialSnapshot, initialRevision, persist, debounceMs = 650, isValid }: {
  scopeKey: string;
  snapshot: T;
  initialSnapshot: T;
  initialRevision: number;
  persist: (snapshot: T, expectedRevision: number) => Promise<AutosaveResult>;
  debounceMs?: number;
  isValid?: (snapshot: T) => boolean;
}) {
  // Server refreshes must not replace an actively edited baseline. A record/account change must.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const queue = useMemo(() => new AutosaveQueue(initialSnapshot, initialRevision, persist, debounceMs, isValid), [scopeKey]);
  useEffect(() => { queue.resume(); return () => queue.pause(); }, [queue]);
  useEffect(() => { queue.setPersist(persist); }, [queue, persist]);
  const state = useSyncExternalStore(queue.subscribe, queue.getState, queue.getState);
  // Snapshot identity may be new each render. Depend on content to avoid postponing saves.
  const serialized = JSON.stringify(snapshot);
  useEffect(() => { queue.update(JSON.parse(serialized) as T); }, [queue, serialized]);
  useEffect(() => {
    mountedQueues.add(queue);
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (![...mountedQueues].some((mounted) => mounted.getState().dirty)) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    const navigate = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (!["http:", "https:"].includes(destination.protocol)) return;
      if (destination.origin === window.location.origin && destination.pathname === window.location.pathname && destination.search === window.location.search && destination.hash) return;
      if (![...mountedQueues].some((mounted) => mounted.getState().dirty)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const originHref = window.location.href;
      const leavingQueues = [...mountedQueues];
      void Promise.all(leavingQueues.map((mounted) => mounted.flush())).then((saved) => {
        if (window.location.href === originHref && leavingQueues.every((mounted) => mountedQueues.has(mounted))
          && saved.every(Boolean) && ![...mountedQueues].some((mounted) => mounted.getState().dirty)) window.location.assign(destination.href);
      });
    };
    document.addEventListener("click", navigate, true);
    return () => {
      mountedQueues.delete(queue);
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", navigate, true);
    };
  }, [queue]);
  return { ...state, flush: queue.flush, retry: queue.retry, getRevision: queue.getRevision };
}
