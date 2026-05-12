export type OwnerQuoteRow = {
  qty: number;
  itemNo: string;
  description: string;
  unit: string;
  unitPrice: number;
  extendedPrice: number;
};

export type SupplierQuoteBatch = {
  quoteId: string;
  supplierName: string;
  quoteDate: string;
  quoteNumber: string;
  effective: string;
  expires: string;
  customer: string;
  jobAddress: string;
  totals: {
    subtotal: number;
    tax: number;
    total: number;
  };
  rows: OwnerQuoteRow[];
};

// Future supplier quote batches should be appended to this array.
// Keep duplicate key rule: supplier + quoteDate + itemNo, fallback supplier + normalizedDescription + unit.
export const supplierQuotes: SupplierQuoteBatch[] = [
  {
    quoteId: "builders-firstsource-87545229-2026-04-23",
    supplierName: "Builders FirstSource",
    quoteDate: "2026-04-23",
    quoteNumber: "87545229",
    effective: "2026-04-23",
    expires: "2026-05-07",
    customer: "COD ZACK THE BUILDER INC",
    jobAddress: "26-50 211TH ST, BAYSIDE",
    totals: {
      subtotal: 43889.86,
      tax: 3785.5,
      total: 47675.36,
    },
    rows: [
      { qty: 7, itemNo: "2816T", description: "2X8-16' #2 TRTD GC", unit: "EA", unitPrice: 25.6, extendedPrice: 179.2 },
      { qty: 4, itemNo: "2812T", description: "2X8-12' #2 TRTD GC", unit: "EA", unitPrice: 18, extendedPrice: 72 },
      { qty: 5, itemNo: "860304SSF", description: "8X60' STAINLESS STL DECK FLSH YORKSHIELD 304SS", unit: "EA", unitPrice: 87, extendedPrice: 435 },
      { qty: 5, itemNo: "SS550", description: "SILL SEALER 5.5 X 50'", unit: "EA", unitPrice: 5.99, extendedPrice: 29.95 },
      { qty: 2090, itemNo: "12BC20LVL", description: "1-3/4X11-7/8 BC LVL 2.1E LF VERSA-LAM 95/22'", unit: "LF", unitPrice: 6.25, extendedPrice: 13062.5 },
      { qty: 115, itemNo: "34CDXF", description: "23/32 4X8 CDX FIR RTD", unit: "EA", unitPrice: 35.75, extendedPrice: 4111.25 },
      { qty: 400, itemNo: "2610DF2P", description: "2X6-10' #2&BTR DF PREM", unit: "EA", unitPrice: 9.5, extendedPrice: 3800 },
      { qty: 100, itemNo: "2616DF2P", description: "2X6-16' #2&BTR DF PREM", unit: "EA", unitPrice: 14.79, extendedPrice: 1479 },
      { qty: 500, itemNo: "2410DF2P", description: "2X4-10' #2&BTR DF PREM", unit: "EA", unitPrice: 5.9, extendedPrice: 2950 },
      { qty: 80, itemNo: "2416DF2P", description: "2X4-16' #2&BTR DF PREM", unit: "EA", unitPrice: 9.6, extendedPrice: 768 },
      { qty: 100, itemNo: "21016DF2", description: "2X10-16' #2&BTR DF", unit: "EA", unitPrice: 24, extendedPrice: 2400 },
      { qty: 180, itemNo: "58CDXF", description: "19/32 4X8 CDX FIR 4PLY RTD", unit: "EA", unitPrice: 27.75, extendedPrice: 4995 },
      { qty: 65, itemNo: "21222DF2", description: "2X12-22' #2&BTR DF", unit: "EA", unitPrice: 64, extendedPrice: 4160 },
      { qty: 30, itemNo: "2816DF2P", description: "2X8-16' #2&BTR DF PREM", unit: "EA", unitPrice: 18.4, extendedPrice: 552 },
      { qty: 4, itemNo: "CS20", description: "SIMPSON CS20 1-1/4 250COILSTRAP 1-1/4x250' ROLL", unit: "EA", unitPrice: 105, extendedPrice: 420 },
      { qty: 200, itemNo: "TB27", description: "NAIL-ON BRIDGING *N27", unit: "EA", unitPrice: 2.29, extendedPrice: 458 },
      { qty: 50, itemNo: "HU11", description: "SIMP 1-3/4X12-14 LVL HANGER", unit: "EA", unitPrice: 14.79, extendedPrice: 739.5 },
      { qty: 12, itemNo: "HGUS412", description: "3-5/8 JOIST HANGER", unit: "EA", unitPrice: 49.98, extendedPrice: 599.76 },
      { qty: 12, itemNo: "PAS650830", description: "PASLODE 3X.131 SM BRT 2.5M", unit: "EA", unitPrice: 89, extendedPrice: 1068 },
      { qty: 7, itemNo: "PAS650272", description: "PASLODE 2X.113 SM BRT 5.5M", unit: "BOX", unitPrice: 179, extendedPrice: 1253 },
      { qty: 100, itemNo: "H2.5AZ", description: "H2.5A HURRICANE TIE Z-MAX SIMPSON HANGER", unit: "EA", unitPrice: 0.59, extendedPrice: 59 },
      { qty: 2, itemNo: "GRJH4DCHG", description: "1-1/2 HDG JST HNGR 33DEG 3M", unit: "EA", unitPrice: 61, extendedPrice: 122 },
      { qty: 30, itemNo: "FRA5482", description: "ADHESIVE SUBFLOOR WTHRPRF 28OZ", unit: "EA", unitPrice: 5.89, extendedPrice: 176.7 },
    ],
  },
];

export function normalizeOwnerQuoteText(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function buildOwnerQuoteDuplicateKey(batch: Pick<SupplierQuoteBatch, "supplierName" | "quoteDate">, row: OwnerQuoteRow) {
  if (row.itemNo.trim()) {
    return `${batch.supplierName}|${batch.quoteDate}|${row.itemNo.trim()}`;
  }

  return `${batch.supplierName}|${normalizeOwnerQuoteText(row.description)}|${row.unit.trim().toUpperCase()}`;
}
