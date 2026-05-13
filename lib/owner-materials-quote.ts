import { placeholderImageMetadata, type ShopProductImage } from "@/lib/shop-catalog";

export type OwnerQuoteRow = {
  qty: number;
  itemNo: string;
  description: string;
  unit: string;
  unitPrice: number;
  extendedPrice: number;
};

export type OwnerMaterialsReviewRow = {
  id: string;
  qty: number;
  itemNo: string;
  description: string;
  unit: string;
  supplierUnitPrice: number;
  markupPercent: number;
  markupDollar: number;
  finalUnitPrice: number;
  category: string;
  imageUrl: string;
  imageAlt: string;
  imageSource: string;
  imageLicense: string;
  imageCredit: string;
  imageCategory: string;
  photoGallery: ShopProductImage[];
  publish: boolean;
};

export type OwnerMaterialsReviewBatch = {
  quoteId: string;
  supplierName: string;
  quoteDate: string;
  quoteNumber: string;
  effective?: string;
  expires?: string;
  customer?: string;
  jobAddress?: string;
  sourceFileName?: string | null;
  sourceFileKind?: "csv" | "txt" | "pdf" | "spreadsheet" | "manual";
  extractionStatus?: "ready" | "parsed" | "manual_review";
  rows: OwnerMaterialsReviewRow[];
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

export const importedSupplierQuotes: SupplierQuoteBatch[] = [
  {
    quoteId: "elite-doors-33282-2025-03-12",
    supplierName: "Elite Doors",
    quoteDate: "2025-03-12",
    quoteNumber: "33282",
    effective: "2025-03-12",
    expires: "",
    customer: "FIVE TOWN BUILDERS",
    jobAddress: "132-136 PARK ST, WOODMERE NY 11598",
    totals: { subtotal: 8266.36, tax: 733.64, total: 9000 },
    rows: [
      { qty: 1, itemNo: "IMGM1-101", description: "3/0X8/0 slab pocket door, 1-3/4 1 panel shaker primed, 101 Library", unit: "EA", unitPrice: 226, extendedPrice: 226 },
      { qty: 1, itemNo: "IMGM1-102", description: "4/0X8/0 twin door, 102 closet", unit: "EA", unitPrice: 449, extendedPrice: 449 },
      { qty: 1, itemNo: "IMGM1-103", description: "2/4X8/0 RH door, 103 bath", unit: "EA", unitPrice: 242, extendedPrice: 242 },
      { qty: 1, itemNo: "IMGM1-104", description: "2/4X8/0 LH door, 104 hallway", unit: "EA", unitPrice: 242, extendedPrice: 242 },
      { qty: 1, itemNo: "IMGM1-105", description: "2/4X8/0 LH door, 105 bath", unit: "EA", unitPrice: 242, extendedPrice: 242 },
      { qty: 1, itemNo: "IMGM1-106", description: "2/10X8/0 LH door, 106 mud", unit: "EA", unitPrice: 242, extendedPrice: 242 },
      { qty: 1, itemNo: "IMGM1-107", description: "2/6X8/0 RH door, 107 stairs", unit: "EA", unitPrice: 242, extendedPrice: 242 },
      { qty: 1, itemNo: "IMGM1-201", description: "2/6X8/0 LH door, 201 bed", unit: "EA", unitPrice: 242, extendedPrice: 242 },
      { qty: 1, itemNo: "IMGM1-202", description: "6/0X8/0 twin door, 202 closet", unit: "EA", unitPrice: 549, extendedPrice: 549 },
      { qty: 1, itemNo: "IMGM1-203", description: "3/0X8/0 twin door, 203 closet", unit: "EA", unitPrice: 449, extendedPrice: 449 },
      { qty: 1, itemNo: "IMGM1-204", description: "2/4X8/0 RH door, 204 bath", unit: "EA", unitPrice: 242, extendedPrice: 242 },
      { qty: 1, itemNo: "IMGM1-205", description: "2/6X8/0 LH door, 205 bed", unit: "EA", unitPrice: 242, extendedPrice: 242 },
      { qty: 1, itemNo: "IMGM1-206", description: "4/0X8/0 twin door, 206 closet", unit: "EA", unitPrice: 449, extendedPrice: 449 },
      { qty: 1, itemNo: "IMGM1-207", description: "2/6X8/0 LH door, 207 laundry", unit: "EA", unitPrice: 242, extendedPrice: 242 },
      { qty: 1, itemNo: "IMGM1-208", description: "2/6X8/0 LH door, 208 MBR", unit: "EA", unitPrice: 242, extendedPrice: 242 },
      { qty: 1, itemNo: "IMGM1-209", description: "2/4X8/0 LH door, 209 WIC", unit: "EA", unitPrice: 242, extendedPrice: 242 },
      { qty: 1, itemNo: "IMGM1-210", description: "2/6X8/0 RH door, 210 bath", unit: "EA", unitPrice: 242, extendedPrice: 242 },
      { qty: 1, itemNo: "IMGM1-211", description: "2/0X8/0 LH door, 211 toilet", unit: "EA", unitPrice: 242, extendedPrice: 242 },
      { qty: 1, itemNo: "IMGM1-212", description: "2/4X8/0 RH door, 212 WIC", unit: "EA", unitPrice: 242, extendedPrice: 242 },
      { qty: 1, itemNo: "IMGM1-213", description: "2/8X8/0 twin door, 213 closet", unit: "EA", unitPrice: 449, extendedPrice: 449 },
      { qty: 1, itemNo: "IMGM1-214", description: "2/6X8/0 RH door, 214 bed", unit: "EA", unitPrice: 242, extendedPrice: 242 },
      { qty: 1, itemNo: "IMGM1-215", description: "5/0X8/0 twin door, 215 closet", unit: "EA", unitPrice: 449, extendedPrice: 449 },
      { qty: 1, itemNo: "IMGM1-216", description: "2/4X8/0 LH door, 216 bath", unit: "EA", unitPrice: 242, extendedPrice: 242 },
      { qty: 1, itemNo: "IMGM1-217", description: "2/6X8/0 RH door, 217 bed", unit: "EA", unitPrice: 242, extendedPrice: 242 },
      { qty: 1, itemNo: "IMGM1-218", description: "6/0X8/0 twin door, 218 closet", unit: "EA", unitPrice: 549, extendedPrice: 549 },
      { qty: 1, itemNo: "IMGM1-B01-DOOR", description: "20GA hollow metal flush 90 minute rated 2/8X6/8 LH door, B01 boiler", unit: "EA", unitPrice: 296, extendedPrice: 296 },
      { qty: 1, itemNo: "IMGM1-B01-JAMB", description: "4-7/8 KDF jamb for 2/8X6/8 LH B01 boiler", unit: "EA", unitPrice: 129, extendedPrice: 129 },
      { qty: 3, itemNo: "IMGM1-HINGE-US26", description: "4-1/2 inch self closing hinges US26", unit: "EA", unitPrice: 9.25, extendedPrice: 27.75 },
      { qty: 1, itemNo: "IMGM1-POCKET-TRACK", description: "6/0 heavy duty pocket track", unit: "EA", unitPrice: 68, extendedPrice: 68 },
      { qty: 1, itemNo: "IMGM1-POCKET-HARDWARE", description: "Heavy duty pocket track hardware set", unit: "EA", unitPrice: 123, extendedPrice: 123 },
      { qty: 2, itemNo: "IMGM1-HD-BUMPER", description: "HD bumper stop", unit: "EA", unitPrice: 24.99, extendedPrice: 49.98 },
      { qty: 124, itemNo: "IMGM1-SQ-HINGES", description: "Square hinges polished chrome", unit: "EA", unitPrice: 4.69, extendedPrice: 581.56 },
      { qty: 7, itemNo: "IMGM1-NONSTD-JAMBS", description: "Non standard jambs", unit: "EA", unitPrice: 35, extendedPrice: 245 },
      { qty: 14, itemNo: "IMGM1-MAG-CATCH", description: "Concealed magnetic catcher installed", unit: "EA", unitPrice: 25.38, extendedPrice: 355.32 },
      { qty: 1, itemNo: "IMGM1-DELIVERY", description: "Delivery", unit: "EA", unitPrice: 85, extendedPrice: 85 },
      { qty: 1, itemNo: "IMGM1-DISCOUNT", description: "Discount shown on estimate", unit: "EA", unitPrice: -1377.25, extendedPrice: -1377.25 },
    ],
  },
  {
    quoteId: "elite-doors-33284-2025-03-12",
    supplierName: "Elite Doors",
    quoteDate: "2025-03-12",
    quoteNumber: "33284",
    effective: "2025-03-12",
    expires: "",
    customer: "FIVE TOWN BUILDERS",
    jobAddress: "132-136 PARK ST, WOODMERE NY 11598",
    totals: { subtotal: 28260, tax: 2508.08, total: 30768.08 },
    rows: [
      { qty: 2100, itemNo: "IMGM2-OPT1-CASING", description: "Option 1: 3/4 x 2-3/4 continuous casing 8 ft", unit: "LF", unitPrice: 1.65, extendedPrice: 3465 },
      { qty: 1350, itemNo: "IMGM2-OPT1-BASE", description: "Option 1: 3/4 x 7 continuous base 16 ft", unit: "LF", unitPrice: 3.75, extendedPrice: 5062.5 },
      { qty: 2100, itemNo: "IMGM2-OPT2-CASING", description: "Option 2: step casing PFJ 3/4 x 3-1/2 inch, 8.5 ft", unit: "LF", unitPrice: 1.27, extendedPrice: 2667 },
      { qty: 1350, itemNo: "IMGM2-OPT2-BASE", description: "Option 2: step base PFJ 5/8 x 7 inch, 16 ft", unit: "LF", unitPrice: 3, extendedPrice: 4050 },
      { qty: 2100, itemNo: "IMGM2-OPT3-CASING", description: "Option 3: custom 3 step continuous casing", unit: "LF", unitPrice: 2.99, extendedPrice: 6279 },
      { qty: 1350, itemNo: "IMGM2-OPT3-BASE", description: "Option 3: custom 3 step continuous base", unit: "LF", unitPrice: 4.99, extendedPrice: 6736.5 },
    ],
  },
  {
    quoteId: "sierra-pacific-1850437-2024-11-15",
    supplierName: "Sierra Pacific Windows",
    quoteDate: "2024-11-15",
    quoteNumber: "1850437",
    effective: "2024-11-15",
    expires: "",
    customer: "136 train Park St woodmere",
    jobAddress: "834 Milton pl",
    totals: { subtotal: 38869.38, tax: 3452.09, total: 42321.47 },
    rows: [
      { qty: 2, itemNo: "100-1", description: "Vinyl 8000 Designers single slider left/fixed 32 x 16, black exterior, white interior", unit: "EA", unitPrice: 343.33, extendedPrice: 686.67 },
      { qty: 1, itemNo: "200-1", description: "Vinyl 8000 casement left 35.5 x 41.5, egress white vinyl", unit: "EA", unitPrice: 470.78, extendedPrice: 470.78 },
      { qty: 1, itemNo: "300-1", description: "Vinyl 8000 casement right 35.5 x 41.5, egress white vinyl", unit: "EA", unitPrice: 470.78, extendedPrice: 470.78 },
      { qty: 1, itemNo: "400-1", description: "H3 aluminum clad casement left 35.5 x 47.5, black clad, pine interior", unit: "EA", unitPrice: 696.73, extendedPrice: 696.73 },
      { qty: 1, itemNo: "500-1", description: "H3 aluminum clad casement right 35.5 x 47.5, black clad, pine interior", unit: "EA", unitPrice: 696.73, extendedPrice: 696.73 },
      { qty: 1, itemNo: "600-1", description: "Vinyl 8000 double sliding patio door 95.5 x 95.5, black exterior, kitchen", unit: "EA", unitPrice: 2700.69, extendedPrice: 2700.69 },
      { qty: 1, itemNo: "700-1", description: "H3 aluminum clad casement left/fixed/right 93.5 x 77.5, family", unit: "EA", unitPrice: 2682.82, extendedPrice: 2682.82 },
      { qty: 1, itemNo: "800-1", description: "Vinyl 8000 double sliding patio door 71.5 x 95.5, black exterior, master bedroom", unit: "EA", unitPrice: 2386.99, extendedPrice: 2386.99 },
      { qty: 1, itemNo: "900-1", description: "H3 aluminum clad casement left/fixed/right 105.5 x 77.5, dining room", unit: "EA", unitPrice: 3185.9, extendedPrice: 3185.9 },
      { qty: 2, itemNo: "1000-1", description: "Vinyl 8000 operating awning 35.5 x 23.5, black exterior, CK swing", unit: "EA", unitPrice: 881.1, extendedPrice: 1762.2 },
      { qty: 2, itemNo: "1100-1", description: "H3 aluminum clad casement left/right 62.5 x 59.5", unit: "EA", unitPrice: 1518.78, extendedPrice: 3037.55 },
      { qty: 4, itemNo: "1200-1", description: "H3 aluminum clad casement left/right 62.5 x 77.5", unit: "EA", unitPrice: 1857.14, extendedPrice: 7428.56 },
      { qty: 1, itemNo: "1300-1", description: "H3 aluminum clad casement left/right 54.5 x 53.5", unit: "EA", unitPrice: 1493.12, extendedPrice: 1493.12 },
      { qty: 1, itemNo: "1400-1", description: "H3 aluminum clad casement left 23.5 x 53.5", unit: "EA", unitPrice: 628.28, extendedPrice: 628.28 },
      { qty: 1, itemNo: "1500-1", description: "H3 aluminum clad casement right 23.5 x 53.5", unit: "EA", unitPrice: 628.28, extendedPrice: 628.28 },
      { qty: 4, itemNo: "1600-1", description: "H3 aluminum clad casement left/right 62.5 x 71.5", unit: "EA", unitPrice: 1895.22, extendedPrice: 7580.9 },
      { qty: 1, itemNo: "1700-1", description: "H3 aluminum clad sash set picture window 47.5 x 59.5, on hold note", unit: "EA", unitPrice: 988.12, extendedPrice: 988.12 },
      { qty: 1, itemNo: "1800-1", description: "H3 aluminum clad casement right 31.5 x 47.5, egress attic", unit: "EA", unitPrice: 658.52, extendedPrice: 658.52 },
      { qty: 1, itemNo: "1900-1", description: "H3 aluminum clad casement left 31.5 x 47.5, egress attic", unit: "EA", unitPrice: 658.52, extendedPrice: 658.52 },
    ],
  },
  {
    quoteId: "source-wood-18379-2022-09-01",
    supplierName: "Source Wood Distribution",
    quoteDate: "2022-09-01",
    quoteNumber: "18379",
    effective: "2022-09-01",
    expires: "",
    customer: "Five Town Builders / David Avitan",
    jobAddress: "716 Beck Rd, Far Rockaway NY 11691",
    totals: { subtotal: 1041.71, tax: 0, total: 1041.71 },
    rows: [
      { qty: 163.1, itemNo: "IMGM4-OAK-FLOOR", description: "4 inch x 3/4 inch unfinished white oak select and better", unit: "SF", unitPrice: 4.99, extendedPrice: 813.87 },
      { qty: 16, itemNo: "IMGM4-OAK-NOSING", description: "5.5 x 3/4 half-round white oak nosing, priced per linear foot", unit: "LF", unitPrice: 7.99, extendedPrice: 127.84 },
      { qty: 1, itemNo: "IMGM4-DELIVERY", description: "Delivery fee", unit: "EA", unitPrice: 100, extendedPrice: 100 },
    ],
  },
  {
    quoteId: "designer-home-appliances-96490-2025-07-23",
    supplierName: "Designer Home Appliances",
    quoteDate: "2025-07-23",
    quoteNumber: "96490",
    effective: "2025-07-23",
    expires: "",
    customer: "avitan david",
    jobAddress: "",
    totals: { subtotal: 38535, tax: 3419.98, total: 41954.98 },
    rows: [
      { qty: 2, itemNo: "WALLOVEN", description: "Double wall oven", unit: "EA", unitPrice: 2950, extendedPrice: 5900 },
      { qty: 4, itemNo: "MICROWAVE", description: "Cafe built-in microwave drawer oven CWL112P2RS1", unit: "EA", unitPrice: 1550, extendedPrice: 6200 },
      { qty: 4, itemNo: "DISHWASHER", description: "Cafe CustomFit smart dishwasher CDT888P2VS1", unit: "EA", unitPrice: 750, extendedPrice: 3000 },
      { qty: 2, itemNo: "HOOD", description: "Faber hood insert", unit: "EA", unitPrice: 750, extendedPrice: 1500 },
      { qty: 2, itemNo: "WASHER-DRYER", description: "Stacked washer/dryer set Samsung/Maytag", unit: "EA", unitPrice: 1590, extendedPrice: 3180 },
      { qty: 1, itemNo: "DELIVERY", description: "Delivery", unit: "EA", unitPrice: 195, extendedPrice: 195 },
      { qty: 2, itemNo: "REFRIGERATOR", description: "Electrolux EI32 refrigerator", unit: "EA", unitPrice: 2290, extendedPrice: 4580 },
      { qty: 2, itemNo: "FREEZER", description: "Electrolux EI32 freezer", unit: "EA", unitPrice: 2290, extendedPrice: 4580 },
      { qty: 2, itemNo: "RANGETOP", description: "GE Cafe CGU366 rangetop", unit: "EA", unitPrice: 2850, extendedPrice: 5700 },
      { qty: 2, itemNo: "WARMING-DRAWER", description: "GE Cafe 30 inch CTW900 warming drawer", unit: "EA", unitPrice: 1850, extendedPrice: 3700 },
    ],
  },
  {
    quoteId: "dundy-glass-i0092370-2025-07-17",
    supplierName: "Dundy Glass",
    quoteDate: "2025-07-17",
    quoteNumber: "I0092370",
    effective: "2025-07-17",
    expires: "",
    customer: "FIVE TOWNS BUILDER",
    jobAddress: "122-52 Montauk Street, Springfield Gardens NY 11413",
    totals: { subtotal: 10765.75, tax: 955.46, total: 11721.21 },
    rows: [
      { qty: 2, itemNo: "IMGM6-CL-24X59", description: "24 x 59-1/2 clear glass 3/8 with polished edges, hinge notches, 1/2 inch holes, tempered door", unit: "EA", unitPrice: 250.65, extendedPrice: 501.3 },
      { qty: 2, itemNo: "IMGM6-CL-33X60", description: "33-3/8 x 60 clear glass 3/8 with polished edges, 3/4 inch holes, clamp notch, tempered sidelite", unit: "EA", unitPrice: 281.6, extendedPrice: 563.2 },
      { qty: 2, itemNo: "IMGM6-SHOWER-60X59", description: "Semi-frameless sliding shower enclosure, opening 60 x 59, 1/4 inch clear tempered glass, chrome hardware and seals", unit: "EA", unitPrice: 595.55, extendedPrice: 1191.1 },
      { qty: 1, itemNo: "IMGM6-CL-28X79", description: "28 x 79-1/2 clear glass 3/8 with polished edges, hinge notches, 1/2 inch holes, tempered door", unit: "EA", unitPrice: 324.95, extendedPrice: 324.95 },
      { qty: 1, itemNo: "IMGM6-CL-41X80", description: "41-3/4 x 80 clear glass 3/8 with polished edges, 3/4 inch holes, clamp notch, tempered sidelite", unit: "EA", unitPrice: 421.55, extendedPrice: 421.55 },
      { qty: 1, itemNo: "IMGM6-MRCL-24X40", description: "24 x 40 clear mirror 1/4 with flat polished edges", unit: "EA", unitPrice: 72.2, extendedPrice: 72.2 },
      { qty: 1, itemNo: "IMGM6-MRCL-36X40", description: "36 x 40 clear mirror 1/4 with flat polished edges", unit: "EA", unitPrice: 102.3, extendedPrice: 102.3 },
      { qty: 2, itemNo: "IMGM6-MRCL-ELLIPSE", description: "28 x 40-3/4 ellipse clear mirror 1/4 with polished shaped edges", unit: "EA", unitPrice: 303.96, extendedPrice: 607.92 },
      { qty: 1, itemNo: "IMGM6-MRANT-ARCH", description: "29-1/2 x 40 light antique mirror 1/4, freeform arch, polished shaped edges", unit: "EA", unitPrice: 385.17, extendedPrice: 385.17 },
      { qty: 1, itemNo: "IMGM6-MRCL-22X36", description: "22 x 36 clear mirror 1/4 with flat polished edges", unit: "EA", unitPrice: 61.13, extendedPrice: 61.13 },
      { qty: 1, itemNo: "IMGM6-CL-28X77", description: "28 x 77-1/2 clear glass 3/8 with polished edges, hinge notches, tempered door", unit: "EA", unitPrice: 319.6, extendedPrice: 319.6 },
      { qty: 1, itemNo: "IMGM6-CL-41X78", description: "41-7/8 x 78 clear glass 3/8 with polished edges, 3/4 inch holes, clamp notch, tempered sidelite", unit: "EA", unitPrice: 413.95, extendedPrice: 413.95 },
      { qty: 2, itemNo: "IMGM6-MRCL-CIRCLE-40", description: "40 inch circle clear mirror 1/4 with polished shaped edges", unit: "EA", unitPrice: 328.99, extendedPrice: 657.98 },
      { qty: 1, itemNo: "IMGM6-MRBZ-30X60", description: "30 x 60 bronze mirror 1/4 semi-circle with polished shaped edges", unit: "EA", unitPrice: 353.88, extendedPrice: 353.88 },
      { qty: 1, itemNo: "IMGM6-MRBZ-CIRCLE-24", description: "24 inch circle bronze mirror 1/4 with polished shaped edges", unit: "EA", unitPrice: 189.75, extendedPrice: 189.75 },
      { qty: 4, itemNo: "IMGM6-CL-35X42", description: "35 x 42 clear glass 1/2 with polished edges, tempered", unit: "EA", unitPrice: 181.95, extendedPrice: 727.8 },
      { qty: 2, itemNo: "IMGM6-CL-95X42", description: "95 x 42 clear glass 1/2 with polished edges, tempered", unit: "EA", unitPrice: 454.75, extendedPrice: 909.5 },
      { qty: 1, itemNo: "IMGM6-SURCHARGE", description: "10 percent manufacturer surcharge when invoiced", unit: "EA", unitPrice: 772.98, extendedPrice: 772.98 },
      { qty: 4, itemNo: "IMGM6-GENEVA-MGL", description: "Geneva Series wall to glass hinge 037 MGL", unit: "EA", unitPrice: 66.75, extendedPrice: 267 },
      { qty: 2, itemNo: "IMGM6-PULL-6-MBL", description: "Back to back door pull handle 6 inch MBL", unit: "EA", unitPrice: 75.85, extendedPrice: 151.7 },
      { qty: 4, itemNo: "IMGM6-BRACKET-MBL", description: "Geneva Series wall mount bracket MBL", unit: "EA", unitPrice: 111, extendedPrice: 444 },
      { qty: 2, itemNo: "IMGM6-UCLAMP-MBL", description: "Fixed panel U-clamp MBL", unit: "EA", unitPrice: 35, extendedPrice: 70 },
      { qty: 4, itemNo: "GEN037CH", description: "Wall mount hinge 037 CH", unit: "EA", unitPrice: 66.75, extendedPrice: 267 },
      { qty: 2, itemNo: "IMGM6-PULL-8-CH", description: "Back to back door pull handle 8 inch CH", unit: "EA", unitPrice: 77.75, extendedPrice: 155.5 },
      { qty: 4, itemNo: "IMGM6-BRACKET-CH", description: "Geneva Series wall mount bracket CH", unit: "EA", unitPrice: 118.45, extendedPrice: 473.8 },
      { qty: 4, itemNo: "IMGM6-UCLAMP-CH", description: "Fixed panel U-clamp CH", unit: "EA", unitPrice: 35, extendedPrice: 140 },
      { qty: 4, itemNo: "DRIP-SEAL", description: "Bottom seal with drip guard", unit: "EA", unitPrice: 23.5, extendedPrice: 94 },
      { qty: 4, itemNo: "HSEAL-STOP", description: "H seal/stop", unit: "EA", unitPrice: 25, extendedPrice: 100 },
      { qty: 4, itemNo: "HSEAL-HINGE", description: "Y seal for hinges", unit: "EA", unitPrice: 25, extendedPrice: 100 },
    ],
  },
  {
    quoteId: "prospect-hardware-117797-2025-06-23",
    supplierName: "P. Hardware / Prospect Hardware",
    quoteDate: "2025-06-23",
    quoteNumber: "117797",
    effective: "2025-06-23",
    expires: "",
    customer: "50 CENTRAL AVE LAWRENCE NY 11559",
    jobAddress: "132 PARK ST, WOODMERE NY 11598",
    totals: { subtotal: 5243.25, tax: 465.34, total: 5708.59 },
    rows: [
      { qty: 1, itemNo: "TPCBF-1025-BG", description: "Casa Halo 8 inch spread widespread 3 hole faucet in brushed gold", unit: "EA", unitPrice: 189, extendedPrice: 189 },
      { qty: 1, itemNo: "TPCBF-1026BG", description: "Casa Fixtures Verona 8 inch widespread bathroom faucet with drain in brushed gold", unit: "EA", unitPrice: 181.44, extendedPrice: 181.44 },
      { qty: 2, itemNo: "TPDT342701", description: "Delta modern raincan head with arm and flange and hand shower in chrome", unit: "EA", unitPrice: 402.505, extendedPrice: 805.01 },
      { qty: 2, itemNo: "TPDT140372", description: "Delta Velum Monitor 14 Series valve only trim in chrome", unit: "EA", unitPrice: 111.4, extendedPrice: 222.8 },
      { qty: 2, itemNo: "TPDT119372", description: "Delta Velum 6 setting 3-port diverter trim in chrome", unit: "EA", unitPrice: 156.44, extendedPrice: 312.88 },
      { qty: 2, itemNo: "TPDRP48333", description: "Delta Arzo tub spout non-diverter in polished chrome", unit: "EA", unitPrice: 91.125, extendedPrice: 182.25 },
      { qty: 2, itemNo: "TPDT342701BL", description: "Delta modern Monitor 14 Series shower with raincan hand shower in matte black", unit: "EA", unitPrice: 601.015, extendedPrice: 1202.03 },
      { qty: 2, itemNo: "TPDT14037BL", description: "Delta Velum Monitor 14 Series valve only trim in black", unit: "EA", unitPrice: 143.39, extendedPrice: 286.78 },
      { qty: 2, itemNo: "TPDT11937BL", description: "Delta Velum 6 setting 3-port diverter trim in black", unit: "EA", unitPrice: 218.58, extendedPrice: 437.16 },
      { qty: 2, itemNo: "TPDRP48333BL", description: "Delta Arzo tub spout non-diverter in matte black", unit: "EA", unitPrice: 149.835, extendedPrice: 299.67 },
      { qty: 2, itemNo: "TPKB-VTDTRIMWH", description: "Kingston Brass Trimscape toe touch tub drain kit in white", unit: "EA", unitPrice: 57, extendedPrice: 114 },
      { qty: 7, itemNo: "TPFFWT14RM", description: "Fine Fixtures Surge wall hung toilet in white", unit: "EA", unitPrice: 192.09571, extendedPrice: 1344.67 },
      { qty: 1, itemNo: "TPFFCTA09WH", description: "Fine Fixture concealed tank actuator square push button in white", unit: "EA", unitPrice: 65.55143, extendedPrice: 65.55 },
      { qty: 1, itemNo: "IMGM7-DISCOUNT", description: "Invoice discount", unit: "EA", unitPrice: -399.99, extendedPrice: -399.99 },
    ],
  },
  {
    quoteId: "queens-blvd-electrical-118406-2025-03-12",
    supplierName: "Queens Blvd Electrical Supply",
    quoteDate: "2025-03-12",
    quoteNumber: "118406",
    effective: "2025-03-12",
    expires: "",
    customer: "PARK ESTATE",
    jobAddress: "121 SPRUCE AVE, CEDARHURST NY 11516",
    totals: { subtotal: 24456.5, tax: 2170.51, total: 26627.01 },
    rows: [
      { qty: 24, itemNo: "G-48443", description: "R4/42W/GR/M3/LED/5CCT (A 2-R)", unit: "EA", unitPrice: 190, extendedPrice: 4560 },
      { qty: 8, itemNo: "G-96024", description: "M3/24W/LED/5CCT 1800LM NON-IC", unit: "EA", unitPrice: 80, extendedPrice: 640 },
      { qty: 60, itemNo: "G-97325", description: "R3/11W/GSR/LED/5CCT", unit: "EA", unitPrice: 60, extendedPrice: 3600 },
      { qty: 12, itemNo: "FV-0510VS1", description: "FV-0510VS1", unit: "EA", unitPrice: 74, extendedPrice: 888 },
      { qty: 40, itemNo: "P-PKG1W-WH", description: "600W RF dimmer/remote", unit: "EA", unitPrice: 58, extendedPrice: 2320 },
      { qty: 2, itemNo: "P-BDG-PKG1W", description: "Lutron Caseta wireless smart bridge kit, white", unit: "EA", unitPrice: 100, extendedPrice: 200 },
      { qty: 12, itemNo: "LR25191", description: "LED24/WLINEAR/3CCT/UNV/D/HO", unit: "EA", unitPrice: 45, extendedPrice: 540 },
      { qty: 150, itemNo: "RECESSED-CHANNEL", description: "Recessed channel", unit: "LF", unitPrice: 3.5, extendedPrice: 525 },
      { qty: 750, itemNo: "E44CB-2430", description: "E44CB-2430", unit: "EA", unitPrice: 4.25, extendedPrice: 3187.5 },
      { qty: 600, itemNo: "CHANNEL-79-1", description: "LED-8084-1 79 inch with frosted cover", unit: "LF", unitPrice: 2, extendedPrice: 1200 },
      { qty: 14, itemNo: "MLE300-24DC-UD", description: "MLE300-24DC-UD", unit: "EA", unitPrice: 180, extendedPrice: 2520 },
      { qty: 42, itemNo: "LR43250", description: "Exterior channel for LED", unit: "EA", unitPrice: 42, extendedPrice: 1764 },
      { qty: 2, itemNo: "MLE600-24DC-UD", description: "MLE600-24DC-UD universal dimming", unit: "EA", unitPrice: 260, extendedPrice: 520 },
      { qty: 332, itemNo: "ULR-OT-49F-HO-30K", description: "ULR-OT-49F-HO-30K wet 63 inch run", unit: "LF", unitPrice: 6, extendedPrice: 1992 },
    ],
  },
  {
    quoteId: "lighting-selections-imgm9",
    supplierName: "Lighting selections",
    quoteDate: "",
    quoteNumber: "imgm 9.pdf",
    effective: "",
    expires: "",
    customer: "",
    jobAddress: "",
    totals: { subtotal: 0, tax: 0, total: 0 },
    rows: [
      { qty: 1, itemNo: "IMGM9-L01", description: "Master bedroom: Jonathan Y Lighting JYL7141A Serafina 95 inch wide LED semi-flush linear ceiling fixture", unit: "EA", unitPrice: 0, extendedPrice: 0 },
      { qty: 1, itemNo: "IMGM9-L02", description: "Modern house: Ableton 6-light candle-style classic traditional chandelier", unit: "EA", unitPrice: 0, extendedPrice: 0 },
      { qty: 1, itemNo: "IMGM9-L03", description: "Family room: Mercer41 Honniball frosted glass globe Sputnik semi-flush mount", unit: "EA", unitPrice: 0, extendedPrice: 0 },
      { qty: 1, itemNo: "IMGM9-L04", description: "Dining room: George Oliver Jewellia 16-light dimmable bubble glass Sputnik modern linear chandelier", unit: "EA", unitPrice: 0, extendedPrice: 0 },
      { qty: 1, itemNo: "IMGM9-L05", description: "Dining room: Mercer41 Nese 12-light LED dimmable linear kitchen island pendant", unit: "EA", unitPrice: 0, extendedPrice: 0 },
      { qty: 1, itemNo: "IMGM9-L06", description: "Entrance: Ivy Bronx Divo LED geometric chandelier", unit: "EA", unitPrice: 0, extendedPrice: 0 },
      { qty: 1, itemNo: "IMGM9-L07", description: "Entrance: Ivy Bronx Keysha 6-light unique rectangle LED dimmable pendant long staircase chandelier", unit: "EA", unitPrice: 0, extendedPrice: 0 },
      { qty: 1, itemNo: "IMGM9-L08", description: "Entrance: Ivy Bronx Keysha 8-light unique large long cluster pendant with remote control", unit: "EA", unitPrice: 0, extendedPrice: 0 },
      { qty: 1, itemNo: "IMGM9-L09", description: "Powder room: Vaxcel Lighting P0420 5 inch wide suspension mini pendant", unit: "EA", unitPrice: 0, extendedPrice: 0 },
      { qty: 1, itemNo: "IMGM9-L10", description: "Master bath sconces: CB2 Natalia onyx and brass wall sconce / Build.com travertine master option", unit: "EA", unitPrice: 0, extendedPrice: 0 },
    ],
  },
  {
    quoteId: "lmg-tile-s477340-2024-12-19",
    supplierName: "LMG Tile",
    quoteDate: "2024-12-19",
    quoteNumber: "S477340",
    effective: "2024-12-19",
    expires: "",
    customer: "X ZACK THE BUILDER",
    jobAddress: "SPEC HOUSE#1 PARK/CEDAR STREET, WOODMERE NY 11516",
    totals: { subtotal: 15948.16, tax: 1375.53, total: 17323.69 },
    rows: [
      { qty: 69.72, itemNo: "CIFRE1402", description: "XS Villore Elixir White Mate 24x48 STD 23.24 SFPB, wall only, family powder room accent wall", unit: "SF", unitPrice: 4.9, extendedPrice: 341.63 },
      { qty: 162.68, itemNo: "CIFRE1400", description: "XS Villore White MT 24x48 RC STD 23.24 SFPB, wall only, walls TBD", unit: "SF", unitPrice: 4.9, extendedPrice: 797.13 },
      { qty: 34.86, itemNo: "SPECIAL226", description: "Special order ET SF, floor Habitat Grey 12x24 11.62 SFPB", unit: "SF", unitPrice: 6.8, extendedPrice: 237.05 },
      { qty: 61.96, itemNo: "SICHE0010", description: "Art Atocha Cappuccino Ret 24x48 15.49 SFPB, fancy powder room accent wall", unit: "SF", unitPrice: 6.8, extendedPrice: 421.33 },
      { qty: 62, itemNo: "SOHOSTUDIOS-004343", description: "Zenit Beige 24x48 polished porcelain, sold 4 pcs/31 sqft per box, floor", unit: "SF", unitPrice: 7.65, extendedPrice: 474.3 },
      { qty: 116.24, itemNo: "CIFRE1411", description: "Hinoki Maple Matte 12x36 14.53 SFPB, kids bathroom #1 tub wet walls", unit: "SF", unitPrice: 4.5, extendedPrice: 523.08 },
      { qty: 230.52, itemNo: "ATLAS0001", description: "Fray Smoke 12x24 13.56 SFPB, kids bathroom #1 floor/some walls", unit: "SF", unitPrice: 3.4, extendedPrice: 783.77 },
      { qty: 108.43, itemNo: "SOHOSTUDIOS-003566", description: "Lounge Ribbed Oak 24x48, sold 2 pcs/15.49 sqft per box, kids bathroom #2 tub wet walls", unit: "SF", unitPrice: 7.65, extendedPrice: 829.49 },
      { qty: 162.68, itemNo: "KERAB0090", description: "Tapiz Marfil 12x36 11.62 SFPB, kids bathroom #2 walls", unit: "SF", unitPrice: 5.1, extendedPrice: 829.67 },
      { qty: 61.96, itemNo: "ITALCR0001", description: "Constellations Orion R/N 24x48 15.49 SFPB, kids bathroom #2 floor", unit: "SF", unitPrice: 5.3, extendedPrice: 328.39 },
      { qty: 681.56, itemNo: "GEO0120-FLOOR-WALLS", description: "Marvet Classic Matt 24x48 9MM 15.49 SFPB, master bathroom floor and walls", unit: "SF", unitPrice: 4, extendedPrice: 2726.24 },
      { qty: 185.88, itemNo: "GEO0120-TOILET-WALLS", description: "Marvet Classic Matt 24x48 9MM 15.49 SFPB, toilet room walls", unit: "SF", unitPrice: 4, extendedPrice: 743.52 },
      { qty: 1068.81, itemNo: "ECO0081", description: "EC Kraken 48x48 15.49 SFDPB, entry/hallway/kitchen/family room", unit: "SF", unitPrice: 6.2, extendedPrice: 6626.62 },
      { qty: 31.02, itemNo: "SPECIAL207X", description: "Special order LM SF, Deco XL Sketch Jungle 24x48, washing station wall", unit: "SF", unitPrice: 6.8, extendedPrice: 210.94 },
      { qty: 1, itemNo: "SHIP04", description: "Sidewalk delivery, Brooklyn, Staten Island, Queens, Five Towns", unit: "EA", unitPrice: 75, extendedPrice: 75 },
    ],
  },
  {
    quoteId: "todays-kitchen-imgm11-2025-06-04",
    supplierName: "TODAY'S KITCHEN INC.",
    quoteDate: "2025-06-04",
    quoteNumber: "imgm 11.pdf",
    effective: "2025-06-04",
    expires: "",
    customer: "Mr Zack Tomashewski / Five Towns Builders",
    jobAddress: "208-B Rockaway Tpke, Cedarhurst NY 11516",
    totals: { subtotal: 46500, tax: 4126.87, total: 50626.87 },
    rows: [
      { qty: 2, itemNo: "TK-CAB-KITCHEN-SET", description: "Kitchen as per plan, KW Custom Cabinetry, 3/4 plywood clear interior frameless box with Blum soft close hinges and tracks, modern flat door, colors ALVIC IDA-1 and ALVIC COMO ASH 1, soffit to ceiling, toe kick, fillers, base cabinets, wall/tall cabinets, panels and fillers. Excludes installation, countertops, appliances, sinks, plumbing fixtures, hardware.", unit: "kitchen", unitPrice: 23250, extendedPrice: 46500 },
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

export function buildOwnerReviewDuplicateKey(
  batch: Pick<OwnerMaterialsReviewBatch, "supplierName" | "quoteDate">,
  row: Pick<OwnerMaterialsReviewRow, "itemNo" | "description" | "unit">,
) {
  if (row.itemNo.trim()) {
    return `${batch.supplierName}|${batch.quoteDate}|${row.itemNo.trim()}`;
  }

  return `${batch.supplierName}|${normalizeOwnerQuoteText(row.description)}|${row.unit.trim().toUpperCase()}`;
}

export function inferOwnerMaterialCategory(description: string) {
  const value = description.toLowerCase();

  if (value.includes("cabinet") || value.includes("kitchen as per plan")) return "Cabinets";
  if (value.includes("tile") || value.includes("porcelain") || value.includes("24x48") || value.includes("12x36") || value.includes("12x24")) return "Tile";
  if (value.includes("light") || value.includes("led") || value.includes("chandelier") || value.includes("pendant") || value.includes("dimmer")) return "Lighting";
  if (value.includes("faucet") || value.includes("toilet") || value.includes("shower") || value.includes("tub") || value.includes("diverter") || value.includes("drain")) return "Plumbing";
  if (value.includes("glass") || value.includes("mirror") || value.includes("hinge 037") || value.includes("u-clamp") || value.includes("seal")) return "Glass";
  if (value.includes("oven") || value.includes("microwave") || value.includes("dishwasher") || value.includes("refrigerator") || value.includes("freezer") || value.includes("rangetop") || value.includes("washer")) return "Appliances";
  if (value.includes("white oak") || value.includes("flooring") || value.includes("nosing")) return "Flooring";
  if (value.includes("window") || value.includes("casement") || value.includes("slider") || value.includes("awning") || value.includes("patio door")) return "Windows";
  if (value.includes("door") || value.includes("jamb") || value.includes("pocket track")) return "Doors";
  if (value.includes("casing") || value.includes("base") || value.includes("trim")) return "Trim";
  if (value.includes("channel") || value.includes("bridge kit") || value.includes("rf dimmer")) return "Electrical";
  if (value.includes("lvl") || value.includes("versa-lam")) return "LVL Beams";
  if (value.includes("plywood") || value.includes("cdx") || value.includes("4x8")) return "Plywood";
  if (value.includes("treated") || value.includes("trtd")) return "Treated Lumber";
  if (value.includes("nail") || value.includes("paslode") || value.includes("screw")) return "Fasteners";
  if (value.includes("hanger") || value.includes("hurricane") || value.includes("simpson") || value.includes("simp ")) return "Hangers";
  if (value.includes("adhesive") || value.includes("subfloor")) return "Adhesives";
  if (value.includes("flash") || value.includes("flsh")) return "Flashing";
  if (/\b2x|lumber|df|fir|stud/.test(value)) return "Lumber";

  return "Materials";
}

function sourceFileNameForQuote(batch: Pick<SupplierQuoteBatch, "quoteId">) {
  const sourceFileNames: Record<string, string> = {
    "builders-firstsource-87545229-2026-04-23": "Seeded Builders FirstSource quote",
    "elite-doors-33282-2025-03-12": "imgm 1.pdf",
    "elite-doors-33284-2025-03-12": "imgm 2 .pdf",
    "sierra-pacific-1850437-2024-11-15": "imgm 3 .pdf",
    "source-wood-18379-2022-09-01": "imgm 4.pdf",
    "designer-home-appliances-96490-2025-07-23": "imgm 5 .pdf",
    "dundy-glass-i0092370-2025-07-17": "imgm 6 .pdf",
    "prospect-hardware-117797-2025-06-23": "imgm 7 .pdf",
    "queens-blvd-electrical-118406-2025-03-12": "imgm 8.pdf",
    "lighting-selections-imgm9": "imgm 9.pdf",
    "lmg-tile-s477340-2024-12-19": "imgm 10.pdf",
    "todays-kitchen-imgm11-2025-06-04": "imgm 11.pdf",
  };

  return sourceFileNames[batch.quoteId] ?? "Seeded supplier quote";
}

function imageCategoryForReviewRow(batch: Pick<SupplierQuoteBatch, "supplierName">, category: string, description: string) {
  const supplier = batch.supplierName.toLowerCase();

  if (supplier.includes("dundy glass")) return "Glass";
  if (supplier.includes("elite doors")) return category === "Trim" ? "Trim" : "Doors";
  if (supplier.includes("sierra pacific")) return "Windows";
  if (supplier.includes("source wood")) return "Flooring";
  if (supplier.includes("designer home")) return "Appliances";
  if (supplier.includes("prospect hardware") || supplier.includes("p. hardware")) return "Plumbing";
  if (supplier.includes("electrical")) return description.toLowerCase().includes("led") || description.toLowerCase().includes("light") ? "Lighting" : "Electrical";
  if (supplier.includes("lighting selections")) return "Lighting";
  if (supplier.includes("lmg tile")) return "Tile";
  if (supplier.includes("today's kitchen")) return "Cabinets";

  return category;
}

function reviewCategoryForQuoteRow(batch: Pick<SupplierQuoteBatch, "supplierName">, row: Pick<OwnerQuoteRow, "description">) {
  const supplier = batch.supplierName.toLowerCase();
  const inferred = inferOwnerMaterialCategory(row.description);

  if (supplier.includes("dundy glass")) return "Glass";
  if (supplier.includes("elite doors")) return inferred === "Trim" ? "Trim" : "Doors";
  if (supplier.includes("sierra pacific")) return "Windows";
  if (supplier.includes("source wood")) return row.description.toLowerCase().includes("delivery") ? "Materials" : "Flooring";
  if (supplier.includes("designer home")) return row.description.toLowerCase().includes("delivery") ? "Materials" : "Appliances";
  if (supplier.includes("prospect hardware") || supplier.includes("p. hardware")) return row.description.toLowerCase().includes("discount") ? "Materials" : "Plumbing";
  if (supplier.includes("electrical")) return row.description.toLowerCase().includes("led") || row.description.toLowerCase().includes("light") ? "Lighting" : "Electrical";
  if (supplier.includes("lighting selections")) return "Lighting";
  if (supplier.includes("lmg tile")) return row.description.toLowerCase().includes("delivery") ? "Materials" : "Tile";
  if (supplier.includes("today's kitchen")) return "Cabinets";

  return inferred;
}

export function imageMetadataForOwnerMaterial(
  batch: Pick<SupplierQuoteBatch, "supplierName">,
  row: Pick<OwnerQuoteRow, "description"> & { category?: string },
): ShopProductImage {
  const category = row.category || inferOwnerMaterialCategory(row.description);
  return placeholderImageMetadata(imageCategoryForReviewRow(batch, category, row.description), row.description);
}

export function seededOwnerReviewBatches(): OwnerMaterialsReviewBatch[] {
  return [...supplierQuotes, ...importedSupplierQuotes].map((batch) => ({
    quoteId: batch.quoteId,
    supplierName: batch.supplierName,
    quoteDate: batch.quoteDate,
    quoteNumber: batch.quoteNumber,
    effective: batch.effective,
    expires: batch.expires,
    customer: batch.customer,
    jobAddress: batch.jobAddress,
    sourceFileName: sourceFileNameForQuote(batch),
    sourceFileKind: sourceFileNameForQuote(batch).toLowerCase().endsWith(".pdf") ? "pdf" : "manual",
    extractionStatus: "parsed",
    rows: batch.rows.map((row, index) => {
      const category = reviewCategoryForQuoteRow(batch, row);
      const image = imageMetadataForOwnerMaterial(batch, { ...row, category });

      return {
        id: `${batch.quoteId}-${row.itemNo || index}`,
        qty: row.qty,
        itemNo: row.itemNo,
        description: row.description,
        unit: row.unit,
        supplierUnitPrice: row.unitPrice,
        markupPercent: 0,
        markupDollar: 0,
        finalUnitPrice: row.unitPrice,
        category,
        imageUrl: image.imageUrl,
        imageAlt: image.imageAlt,
        imageSource: image.imageSource,
        imageLicense: image.imageLicense,
        imageCredit: image.imageCredit,
        imageCategory: image.imageCategory,
        photoGallery: [image],
        publish: false,
      };
    }),
  }));
}
