import { buildOwnerQuoteDuplicateKey, ownerQuoteRows, ownerQuoteSummary } from "@/lib/owner-materials-quote";

export type OwnerMaterialRowState = {
  id: string;
  qty: number;
  itemNo: string;
  sku: string;
  description: string;
  category: string;
  unit: string;
  supplier: string;
  supplierUnitPrice: number;
  markupPercent: number;
  markupDollar: number;
  finalUnitPrice: number;
  duplicateKey: string;
  publishStatus: "Draft" | "Published";
  reviewStatus: "Ready" | "Needs review" | "Missing image";
  photoCount: number;
  imageUrl: string;
  imageAlt: string;
  imageSource: string;
  imageLicense: string;
  imageCredit: string;
  imageCategory: string;
  galleryCount: number;
  notes?: string;
  error?: string;
};

export type OwnerMaterialBatchState = {
  id: string;
  supplier: string;
  quoteNumber: string;
  quoteDate: string;
  documents: string[];
  rows: OwnerMaterialRowState[];
};

export type OwnerMaterialsAdminState = {
  selectedBatchId: string;
  batches: OwnerMaterialBatchState[];
};

export const ownerSupplierDocuments = [
  "imgm 1.pdf",
  "imgm 2 .pdf",
  "imgm 3 .pdf",
  "imgm 4.pdf",
  "imgm 5 .pdf",
  "imgm 6 .pdf",
  "imgm 7 .pdf",
  "imgm 8.pdf",
  "imgm 9.pdf",
  "imgm 10.pdf",
  "imgm 11.pdf",
] as const;

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function makeRow(batchId: string, input: {
  qty: number;
  itemNo: string;
  description: string;
  unit: string;
  supplier: string;
  quoteDate: string;
  supplierUnitPrice: number;
  category: string;
  imageCategory?: string;
}) : OwnerMaterialRowState {
  const markupPercent = 0;
  const markupDollar = 0;
  const finalUnitPrice = input.supplierUnitPrice;
  const duplicateKey = buildOwnerQuoteDuplicateKey({
    qty: input.qty,
    itemNo: input.itemNo,
    description: input.description,
    unit: input.unit,
    unitPrice: input.supplierUnitPrice,
    extendedPrice: input.qty * input.supplierUnitPrice,
  });

  return {
    id: `${batchId}:${input.itemNo || slugify(input.description)}`,
    qty: input.qty,
    itemNo: input.itemNo,
    sku: `${slugify(input.supplier).slice(0, 3).toUpperCase()}-${input.itemNo || slugify(input.description).toUpperCase()}`,
    description: input.description,
    category: input.category,
    unit: input.unit,
    supplier: input.supplier,
    supplierUnitPrice: input.supplierUnitPrice,
    markupPercent,
    markupDollar,
    finalUnitPrice,
    duplicateKey,
    publishStatus: "Draft",
    reviewStatus: input.supplierUnitPrice > 80 ? "Needs review" : "Missing image",
    photoCount: 0,
    imageUrl: "",
    imageAlt: `${input.description} photo`,
    imageSource: "Not added",
    imageLicense: "Pending",
    imageCredit: "Pending",
    imageCategory: input.imageCategory ?? input.category,
    galleryCount: 0,
  };
}

const buildersRows = ownerQuoteRows.map((row) =>
  makeRow("builders-firstsource-87545229", {
    qty: row.qty,
    itemNo: row.itemNo,
    description: row.description,
    unit: row.unit,
    supplier: ownerQuoteSummary.supplier,
    quoteDate: ownerQuoteSummary.quoteDate,
    supplierUnitPrice: row.unitPrice,
    category:
      row.unit === "LF"
        ? "Engineered lumber"
        : row.description.includes("SIMP") || row.description.includes("HANGER")
          ? "Hardware"
          : row.description.includes("ADHESIVE")
            ? "Adhesives"
            : "Framing",
  }),
);

export const ownerMaterialsSeedState: OwnerMaterialsAdminState = {
  selectedBatchId: "builders-firstsource-87545229",
  batches: [
    {
      id: "builders-firstsource-87545229",
      supplier: "Builders FirstSource",
      quoteNumber: "87545229",
      quoteDate: "2026-04-23",
      documents: ["imgm 1.pdf", "imgm 2 .pdf", "imgm 3 .pdf"],
      rows: buildersRows,
    },
    {
      id: "elite-doors-33282",
      supplier: "Elite Doors",
      quoteNumber: "33282",
      quoteDate: "2025-03-12",
      documents: ["imgm 4.pdf"],
      rows: [
        makeRow("elite-doors-33282", { qty: 10, itemNo: "ED-INT-3068", description: "Interior shaker door 3/0 x 6/8", unit: "EA", supplier: "Elite Doors", quoteDate: "2025-03-12", supplierUnitPrice: 168, category: "Doors" }),
        makeRow("elite-doors-33282", { qty: 4, itemNo: "ED-FR-3068", description: "Prehung primed entry frame set", unit: "EA", supplier: "Elite Doors", quoteDate: "2025-03-12", supplierUnitPrice: 244, category: "Doors" }),
      ],
    },
    {
      id: "elite-doors-33284",
      supplier: "Elite Doors",
      quoteNumber: "33284",
      quoteDate: "2025-03-12",
      documents: ["imgm 5 .pdf"],
      rows: [
        makeRow("elite-doors-33284", { qty: 6, itemNo: "ED-SLD-72", description: "72 inch sliding patio door", unit: "EA", supplier: "Elite Doors", quoteDate: "2025-03-12", supplierUnitPrice: 1180, category: "Doors" }),
        makeRow("elite-doors-33284", { qty: 6, itemNo: "ED-HW-KIT", description: "Patio door handle hardware kit", unit: "EA", supplier: "Elite Doors", quoteDate: "2025-03-12", supplierUnitPrice: 86, category: "Hardware" }),
      ],
    },
    {
      id: "sierra-pacific-1850437",
      supplier: "Sierra Pacific Windows",
      quoteNumber: "1850437",
      quoteDate: "2024-11-15",
      documents: ["imgm 6 .pdf", "imgm 7 .pdf"],
      rows: [
        makeRow("sierra-pacific-1850437", { qty: 12, itemNo: "SPW-DH-3050", description: "Double hung vinyl window 30 x 50", unit: "EA", supplier: "Sierra Pacific Windows", quoteDate: "2024-11-15", supplierUnitPrice: 412, category: "Windows" }),
        makeRow("sierra-pacific-1850437", { qty: 2, itemNo: "SPW-SL-6060", description: "Sliding patio window 60 x 60", unit: "EA", supplier: "Sierra Pacific Windows", quoteDate: "2024-11-15", supplierUnitPrice: 745, category: "Windows" }),
      ],
    },
    {
      id: "source-wood-18379",
      supplier: "Source Wood Distribution",
      quoteNumber: "18379",
      quoteDate: "2022-09-01",
      documents: ["imgm 8.pdf"],
      rows: [
        makeRow("source-wood-18379", { qty: 320, itemNo: "SWD-2X4-10", description: "2x4 kiln dried stud 10 foot", unit: "EA", supplier: "Source Wood Distribution", quoteDate: "2022-09-01", supplierUnitPrice: 6.4, category: "Lumber" }),
        makeRow("source-wood-18379", { qty: 85, itemNo: "SWD-CDX-2332", description: "23/32 CDX plywood sheet", unit: "EA", supplier: "Source Wood Distribution", quoteDate: "2022-09-01", supplierUnitPrice: 39.25, category: "Plywood" }),
      ],
    },
    {
      id: "designer-home-96490",
      supplier: "Designer Home Appliances",
      quoteNumber: "96490",
      quoteDate: "2025-07-23",
      documents: ["imgm 9.pdf", "imgm 10.pdf"],
      rows: [
        makeRow("designer-home-96490", { qty: 1, itemNo: "DHA-RNG-30", description: "30 inch gas range stainless", unit: "EA", supplier: "Designer Home Appliances", quoteDate: "2025-07-23", supplierUnitPrice: 1249, category: "Appliances" }),
        makeRow("designer-home-96490", { qty: 1, itemNo: "DHA-DW-24", description: "24 inch panel ready dishwasher", unit: "EA", supplier: "Designer Home Appliances", quoteDate: "2025-07-23", supplierUnitPrice: 899, category: "Appliances" }),
      ],
    },
    {
      id: "dundy-glass-10092370",
      supplier: "Dundy Glass",
      quoteNumber: "10092370",
      quoteDate: "2025-07-17",
      documents: ["imgm 11.pdf"],
      rows: [
        makeRow("dundy-glass-10092370", { qty: 14, itemNo: "DG-TMP-42", description: "Tempered shower glass panel 42 inch", unit: "EA", supplier: "Dundy Glass", quoteDate: "2025-07-17", supplierUnitPrice: 328, category: "Glass" }),
        makeRow("dundy-glass-10092370", { qty: 8, itemNo: "DG-MIR-2436", description: "Bathroom mirror 24 x 36 polished edge", unit: "EA", supplier: "Dundy Glass", quoteDate: "2025-07-17", supplierUnitPrice: 114, category: "Glass" }),
      ],
    },
  ],
};

export function cloneOwnerMaterialsState(state: OwnerMaterialsAdminState) {
  return JSON.parse(JSON.stringify(state)) as OwnerMaterialsAdminState;
}
