"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { formatSiteTime } from "@/lib/site-date-time";

const REFRESH_INTERVAL_MS = 20_000;

export function CustomerRequestLiveRefresh() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastChecked, setLastChecked] = useState(() => new Date());

  const refresh = useCallback(() => {
    if (!navigator.onLine || document.visibilityState !== "visible") return;
    startTransition(() => {
      router.refresh();
      setLastChecked(new Date());
    });
  }, [router]);

  useEffect(() => {
    const timer = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  return (
    <div
      className="flex flex-wrap items-center gap-2 text-xs text-slate-500"
      aria-live="polite"
    >
      <span>
        {isPending
          ? "Checking…"
          : `Last checked ${formatSiteTime(lastChecked, { hour: "numeric", minute: "2-digit" })}`}
      </span>
      <button
        type="button"
        onClick={refresh}
        disabled={isPending}
        className="min-h-9 rounded-full border border-slate-300 bg-white px-3 font-semibold text-slate-700 disabled:opacity-60"
      >
        Refresh
      </button>
    </div>
  );
}
