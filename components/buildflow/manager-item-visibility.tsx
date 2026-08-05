"use client"

import { useEffect, useState, type ReactNode } from "react"

import { MANAGER_ADD_ONS_UPDATED_EVENT, isManagerItemHidden, readManagerAddOns } from "@/lib/manager-add-ons"

export function ManagerItemVisibility({ itemId, children }: { itemId: string; children: ReactNode }) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const sync = () => setHidden(isManagerItemHidden(readManagerAddOns(), itemId))
    sync()
    window.addEventListener("storage", sync)
    window.addEventListener(MANAGER_ADD_ONS_UPDATED_EVENT, sync as EventListener)
    return () => {
      window.removeEventListener("storage", sync)
      window.removeEventListener(MANAGER_ADD_ONS_UPDATED_EVENT, sync as EventListener)
    }
  }, [itemId])

  return hidden ? null : <>{children}</>
}
