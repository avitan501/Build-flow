import type { DrywallPlanOpening } from "@/lib/drywall-plan-takeoff-extraction";

export type DrywallMaterialEstimate = {
  label: string;
  quantity: string;
  detail: string;
};

export type DrywallMaterialCalculation = {
  proposedLinearFeet: number;
  wallHeightFeet: number;
  wallSideMultiplier: number;
  wastePercent: number;
  sheetLengthFeet: number;
  wallAreaSqft: number;
  ceilingAreaSqft: number;
  proposedAreaSqft: number;
  openingAreaSqft: number;
  netAreaSqft: number;
  orderAreaSqft: number;
  sheetAreaSqft: number;
  sheetCount: number;
  screwCount: number;
  screwBoxes: number;
  tapeFeet: number;
  tapeRolls: number;
  compoundBuckets: number;
  cornerBeads: number;
  rows: DrywallMaterialEstimate[];
};

function positive(value: number | null | undefined) {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : 0;
}

function roundUp(value: number) {
  return Math.max(0, Math.ceil(value));
}

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
}

export function calculateDrywallMaterials(params: {
  proposedLinearFeet?: number | null;
  wallHeightFeet?: number | null;
  ceilingAreaSqft?: number | null;
  outsideCorners?: number | null;
  openings?: DrywallPlanOpening[];
  wastePercent?: number;
  sheetLengthFeet?: number;
  wallSideMultiplier?: number;
}): DrywallMaterialCalculation {
  const proposedLinearFeet = positive(params.proposedLinearFeet);
  const wallHeightFeet = positive(params.wallHeightFeet);
  const ceilingAreaSqft = positive(params.ceilingAreaSqft);
  const wallSideMultiplier = positive(params.wallSideMultiplier) || 1;
  const wastePercent = Math.min(Math.max(params.wastePercent ?? 10, 0), 35);
  const sheetLengthFeet = positive(params.sheetLengthFeet) || 8;
  const sheetAreaSqft = 4 * sheetLengthFeet;
  const wallAreaSqft = proposedLinearFeet * wallHeightFeet * wallSideMultiplier;
  const proposedAreaSqft = wallAreaSqft + ceilingAreaSqft;
  const openingAreaSqft = (params.openings || []).reduce((total, opening) => {
    const itemArea = positive(opening.areaSqft) || positive(opening.widthFeet) * positive(opening.heightFeet);
    return total + positive(opening.quantity) * itemArea;
  }, 0);
  const netAreaSqft = Math.max(0, proposedAreaSqft - openingAreaSqft);
  const orderAreaSqft = netAreaSqft * (1 + wastePercent / 100);
  const sheetCount = roundUp(orderAreaSqft / sheetAreaSqft);
  const screwCount = roundUp(sheetCount * 32);
  const screwBoxes = roundUp(screwCount / 1000);
  const tapeFeet = roundUp(orderAreaSqft * 0.35);
  const tapeRolls = roundUp(tapeFeet / 250);
  const compoundBuckets = roundUp(orderAreaSqft / 400);
  const cornerBeads = roundUp((positive(params.outsideCorners) * wallHeightFeet) / 8);

  return {
    proposedLinearFeet,
    wallHeightFeet,
    wallSideMultiplier,
    wastePercent,
    sheetLengthFeet,
    wallAreaSqft,
    ceilingAreaSqft,
    proposedAreaSqft,
    openingAreaSqft,
    netAreaSqft,
    orderAreaSqft,
    sheetAreaSqft,
    sheetCount,
    screwCount,
    screwBoxes,
    tapeFeet,
    tapeRolls,
    compoundBuckets,
    cornerBeads,
    rows: [
      {
        label: "Drywall board",
        quantity: `${sheetCount} sheets`,
        detail: `5/8 in board, 4x${sheetLengthFeet} sheets, ${formatNumber(sheetAreaSqft)} sq ft each`,
      },
      {
        label: "Drywall screws",
        quantity: `${screwBoxes} boxes`,
        detail: `About ${formatNumber(screwCount)} screws, estimated at 1,000 per 5 lb box`,
      },
      {
        label: "Joint tape",
        quantity: `${tapeRolls} rolls`,
        detail: `About ${formatNumber(tapeFeet)} linear ft, estimated with 250 ft rolls`,
      },
      {
        label: "Joint compound",
        quantity: `${compoundBuckets} buckets`,
        detail: "Estimated with 4.5 gal buckets at about 400 sq ft each",
      },
      {
        label: "Corner bead",
        quantity: `${cornerBeads} pieces`,
        detail: `8 ft pieces for ${formatNumber(positive(params.outsideCorners))} outside corners`,
      },
    ],
  };
}
