"use client"

import { useEffect } from "react"

import { writeManagerAddOns } from "@/lib/manager-add-ons"
import { createEmptyQualificationSettings, writeShopQualificationSettings } from "@/lib/shop-qualification"
import type { PublicWorkflowState } from "@/lib/workflow-public"

export function WorkflowSettingsHydrator({ state }: { state: PublicWorkflowState | null }) {
  useEffect(() => {
    if (!state) return
    if (state.qualificationSettings) {
      writeShopQualificationSettings({
        ...createEmptyQualificationSettings(),
        products: state.qualificationSettings.products,
      })
    }
    if (state.addOns) writeManagerAddOns(state.addOns)
  }, [state])
  return null
}
