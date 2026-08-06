import { ClipboardList, FileStack, Hammer, MapPinHouse, MessageSquareQuote, Truck } from "lucide-react"

import type { DepartmentSymbolKey } from "@/lib/shop-tools"

const SYMBOLS = {
  "shopping-list": { label: "Shopping list", Icon: ClipboardList },
  blueprint: { label: "Blueprint", Icon: FileStack },
  "site-visit": { label: "Site visit", Icon: MapPinHouse },
  delivery: { label: "Delivery", Icon: Truck },
  quote: { label: "Quote", Icon: MessageSquareQuote },
  installation: { label: "Installation", Icon: Hammer },
} satisfies Record<DepartmentSymbolKey, { label: string; Icon: typeof ClipboardList }>

export const DEPARTMENT_SYMBOL_OPTIONS = Object.entries(SYMBOLS).map(([key, value]) => ({
  key: key as DepartmentSymbolKey,
  ...value,
}))

export function DepartmentSymbolBadges({ symbols, compact = false }: { symbols?: DepartmentSymbolKey[]; compact?: boolean }) {
  if (!symbols?.length) return null

  return (
    <span className="flex flex-wrap items-center gap-1.5" data-testid="department-symbols">
      {symbols.map((symbol) => {
        const item = SYMBOLS[symbol]
        const Icon = item.Icon
        return (
          <span
            key={symbol}
            title={item.label}
            aria-label={item.label}
            className={`inline-flex items-center justify-center rounded-full border border-black/10 bg-white/95 text-[#0e2a4a] shadow-sm ${compact ? "h-6 w-6" : "h-7 gap-1.5 px-2 text-[11px] font-semibold"}`}
          >
            <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
            {compact ? null : <span>{item.label}</span>}
          </span>
        )
      })}
    </span>
  )
}
