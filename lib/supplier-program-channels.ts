export const SUPPLIER_PROGRAM_CHANNELS = [
  "API",
  "Affiliate",
  "Partner",
  "Referral",
  "Trade",
  "Resale",
] as const

export type SupplierProgramChannel = (typeof SUPPLIER_PROGRAM_CHANNELS)[number]
