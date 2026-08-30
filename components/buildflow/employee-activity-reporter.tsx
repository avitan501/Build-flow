"use client"

import { Eye } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect } from "react"

import { recordEmployeeActivityAction } from "@/app/admin/activity-actions"

const labels: Record<string, string> = {
  "/admin/build-map": "Dashboard",
  "/admin/users": "Customers",
  "/admin/vendors": "Suppliers",
  "/admin/supplier-quotes": "Supplier quotes",
  "/admin/catalog": "Material catalog",
  "/admin/quote-comparison": "Quote comparison",
  "/admin/communications": "Communications",
  "/admin/daily-summary": "Daily summary",
}

function pageLabel(path: string) {
  const entry = Object.entries(labels).find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))
  return entry?.[1] ?? "Manager portal"
}

export function EmployeeActivityReporter({ owner, compact = false }: { owner: boolean; compact?: boolean }) {
  const pathname = usePathname()
  useEffect(() => {
    if (owner) return
    const report = () => {
      if (document.visibilityState === "visible") void recordEmployeeActivityAction(pathname, pageLabel(pathname))
    }
    report()
    const timer = window.setInterval(report, 60_000)
    document.addEventListener("visibilitychange", report)
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", report) }
  }, [owner, pathname])
  if (owner) return null
  return <div className={`mt-2 flex items-center border-t border-slate-100 py-3 text-[11px] font-medium text-slate-500 ${compact ? "justify-center" : "gap-2 px-1"}`} title="The owner can see the current Avantia page and last active time. Screen contents are not recorded."><Eye className="h-3.5 w-3.5 shrink-0" /><span className={compact ? "sr-only" : undefined}>Activity status visible to owner</span></div>
}
