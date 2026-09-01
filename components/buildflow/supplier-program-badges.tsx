import {
  SUPPLIER_PROGRAM_CHANNELS,
  type SupplierProgramChannel,
} from "@/lib/supplier-program-channels"

export const SUPPLIER_PROGRAM_LABELS: Record<SupplierProgramChannel, string> = {
  API: "API",
  Affiliate: "AF",
  Partner: "P",
  Referral: "R",
  Trade: "T",
  Resale: "$",
}

export const SUPPLIER_PROGRAM_COLORS: Record<SupplierProgramChannel, string> = {
  API: "border-sky-200 bg-sky-50 text-sky-800",
  Affiliate: "border-violet-200 bg-violet-50 text-violet-800",
  Partner: "border-amber-200 bg-amber-50 text-amber-900",
  Referral: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Trade: "border-blue-200 bg-blue-50 text-blue-800",
  Resale: "border-rose-200 bg-rose-50 text-rose-800",
}

export const SUPPLIER_PROGRAM_DESCRIPTIONS: Record<SupplierProgramChannel, string> = {
  API: "Direct catalog, stock, or pricing connection",
  Affiliate: "Commission through a tracked link or program",
  Partner: "Direct working partnership with the supplier",
  Referral: "Referral fee for a lead or completed order",
  Trade: "Contractor account with trade pricing or terms",
  Resale: "Buy from the supplier and resell with a margin",
}

export function SupplierProgramBadges({ channels, emptyLabel }: { channels: SupplierProgramChannel[]; emptyLabel?: string }) {
  const selected = SUPPLIER_PROGRAM_CHANNELS.filter((channel) => channels.includes(channel))
  if (!selected.length) return emptyLabel ? <span className="text-[10px] font-semibold text-slate-400">{emptyLabel}</span> : null
  return <span className="flex flex-wrap gap-1">{selected.map((channel) => <span key={channel} title={`${channel}: ${SUPPLIER_PROGRAM_DESCRIPTIONS[channel]}`} aria-label={channel} className={`inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-[4px] border px-1 text-[8px] font-black ${SUPPLIER_PROGRAM_COLORS[channel]}`}>{SUPPLIER_PROGRAM_LABELS[channel]}</span>)}</span>
}
