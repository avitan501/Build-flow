export type RenovationScope =
  | "flooring"
  | "bathrooms"
  | "kitchen"
  | "paint"
  | "carpentry";

export type RenovationClass = "A" | "B" | "C" | "D";

export type BudgetApproach = "very-low" | "middle" | "better";

export type RenovationUnitType =
  | "studio"
  | "one-bedroom"
  | "two-bedroom"
  | "three-bedroom";

export interface RenovationUnitMixEntry {
  unitType: RenovationUnitType;
  unitCount: number;
  squareFeetPerUnit: number;
  bathroomCountPerUnit: number;
}

export interface RenovationEstimatorInput {
  squareFeetPerUnit: number;
  unitCount: number;
  unitMix: RenovationUnitMixEntry[];
  stateCode: string;
  scopes: RenovationScope[];
  bathroomCountPerUnit: number;
  renovationClass: RenovationClass;
  budgetApproach: BudgetApproach;
  targetBudget?: number;
  otherNotes?: string;
}

export interface RenovationStateOption {
  code: string;
  label: string;
}

export interface RenovationScopeOption {
  value: RenovationScope;
  label: string;
  description: string;
}

export interface RenovationUnitTypeOption {
  value: RenovationUnitType;
  label: string;
  shortLabel: string;
  defaultSquareFeet: number;
  defaultBathrooms: number;
}

export interface RenovationEstimateLineItem {
  id: string;
  category: RenovationScope;
  label: string;
  quantity: number;
  perUnitQuantity: number;
  unit: string;
  unitCost: number;
  total: number;
  assumptions: string[];
  inclusions: string[];
}

export interface RenovationEstimateReviewItem {
  id: string;
  label: string;
  details: string;
  priced: false;
}

export interface RenovationStateAdjustment {
  code: string;
  label: string;
  goodsRpp: number;
  nationalGoodsRpp: number;
  factor: number;
  amount: number;
}

export interface RenovationBudgetComparison {
  targetBudget: number;
  difference: number;
  percentDifference: number;
  status: "within-budget" | "over-budget";
}

export interface RenovationEstimateResult {
  input: RenovationEstimatorInput;
  lineItems: RenovationEstimateLineItem[];
  reviewItems: RenovationEstimateReviewItem[];
  perUnitSubtotal: number;
  portfolioSubtotal: number;
  stateAdjustment: RenovationStateAdjustment;
  stateAdjustedSubtotal: number;
  volumeDiscountRate: number;
  volumeSavings: number;
  procurementContingencyRate: number;
  procurementContingency: number;
  estimatedTotal: number;
  lowEstimate: number;
  highEstimate: number;
  budgetComparison?: RenovationBudgetComparison;
  assumptions: string[];
  exclusions: string[];
  warnings: string[];
}

export interface RenovationEstimatorSource {
  id: string;
  title: string;
  url: string;
  use: string;
}

export const US_STATES = [
  { code: "AL", label: "Alabama" },
  { code: "AK", label: "Alaska" },
  { code: "AZ", label: "Arizona" },
  { code: "AR", label: "Arkansas" },
  { code: "CA", label: "California" },
  { code: "CO", label: "Colorado" },
  { code: "CT", label: "Connecticut" },
  { code: "DE", label: "Delaware" },
  { code: "DC", label: "District of Columbia" },
  { code: "FL", label: "Florida" },
  { code: "GA", label: "Georgia" },
  { code: "HI", label: "Hawaii" },
  { code: "ID", label: "Idaho" },
  { code: "IL", label: "Illinois" },
  { code: "IN", label: "Indiana" },
  { code: "IA", label: "Iowa" },
  { code: "KS", label: "Kansas" },
  { code: "KY", label: "Kentucky" },
  { code: "LA", label: "Louisiana" },
  { code: "ME", label: "Maine" },
  { code: "MD", label: "Maryland" },
  { code: "MA", label: "Massachusetts" },
  { code: "MI", label: "Michigan" },
  { code: "MN", label: "Minnesota" },
  { code: "MS", label: "Mississippi" },
  { code: "MO", label: "Missouri" },
  { code: "MT", label: "Montana" },
  { code: "NE", label: "Nebraska" },
  { code: "NV", label: "Nevada" },
  { code: "NH", label: "New Hampshire" },
  { code: "NJ", label: "New Jersey" },
  { code: "NM", label: "New Mexico" },
  { code: "NY", label: "New York" },
  { code: "NC", label: "North Carolina" },
  { code: "ND", label: "North Dakota" },
  { code: "OH", label: "Ohio" },
  { code: "OK", label: "Oklahoma" },
  { code: "OR", label: "Oregon" },
  { code: "PA", label: "Pennsylvania" },
  { code: "RI", label: "Rhode Island" },
  { code: "SC", label: "South Carolina" },
  { code: "SD", label: "South Dakota" },
  { code: "TN", label: "Tennessee" },
  { code: "TX", label: "Texas" },
  { code: "UT", label: "Utah" },
  { code: "VT", label: "Vermont" },
  { code: "VA", label: "Virginia" },
  { code: "WA", label: "Washington" },
  { code: "WV", label: "West Virginia" },
  { code: "WI", label: "Wisconsin" },
  { code: "WY", label: "Wyoming" },
] as const satisfies readonly RenovationStateOption[];

export type UsStateCode = (typeof US_STATES)[number]["code"];

export const RENOVATION_SCOPE_OPTIONS = [
  {
    value: "flooring",
    label: "Flooring",
    description: "LVP, underlayment, transitions, and cutting waste.",
  },
  {
    value: "bathrooms",
    label: "Bathrooms",
    description: "Tile, fixtures, waterproofing, setting materials, and accessories.",
  },
  {
    value: "kitchen",
    label: "Kitchen",
    description: "Cabinets, countertop, sink, faucet, backsplash, and hardware.",
  },
  {
    value: "paint",
    label: "Paint",
    description: "Two wall coats, ceiling, trim, optional primer, and supplies.",
  },
  {
    value: "carpentry",
    label: "Carpentry",
    description: "Baseboard, door casing, interior doors, hardware, and fasteners.",
  },
] as const satisfies readonly RenovationScopeOption[];

export const RENOVATION_UNIT_TYPE_OPTIONS = [
  {
    value: "studio",
    label: "Studio",
    shortLabel: "Studio",
    defaultSquareFeet: 500,
    defaultBathrooms: 1,
  },
  {
    value: "one-bedroom",
    label: "1 Bedroom",
    shortLabel: "1 BR",
    defaultSquareFeet: 700,
    defaultBathrooms: 1,
  },
  {
    value: "two-bedroom",
    label: "2 Bedroom",
    shortLabel: "2 BR",
    defaultSquareFeet: 1_000,
    defaultBathrooms: 1,
  },
  {
    value: "three-bedroom",
    label: "3 Bedroom",
    shortLabel: "3 BR",
    defaultSquareFeet: 1_300,
    defaultBathrooms: 2,
  },
] as const satisfies readonly RenovationUnitTypeOption[];

export const ESTIMATOR_SOURCES = [
  {
    id: "bea-rpp-2024",
    title: "BEA Regional Price Parities by State, 2024",
    url: "https://www.bea.gov/news/2026/real-personal-consumption-expenditures-state-and-real-personal-income-state-2024",
    use: "State material adjustment using the 2024 goods RPP divided by the national goods RPP of 99.5.",
  },
  {
    id: "sherwin-williams-coverage",
    title: "Sherwin-Williams Paint Calculator FAQ",
    url: "https://www.sherwin-williams.com/en-us/color/color-tools/paint-calculator",
    use: "Reference for typical paint coverage of 350 to 400 square feet per gallon.",
  },
  {
    id: "home-depot-paint",
    title: "The Home Depot: How Much Paint Do I Need?",
    url: "https://videos.homedepot.com/detail/video/3601119389001/how-much-paint-do-i-need",
    use: "Cross-check for room paint quantity planning.",
  },
  {
    id: "home-depot-lvp",
    title: "The Home Depot: How to Install Vinyl Plank Flooring",
    url: "https://www.homedepot.com/c/ah/how-to-install-vinyl-plank-flooring/9ba683603be9fa5395fab90188fe437f",
    use: "Reference for LVP planning, preparation, and material overage.",
  },
  {
    id: "home-depot-tile",
    title: "The Home Depot: Calculate Square Footage and Waste",
    url: "https://www.homedepot.com/content/c/ah/how-to-calculate-square-footage/9ba683603be9fa5395fab90647548f6",
    use: "Reference for flooring and tile material waste allowances.",
  },
  {
    id: "redgard-tds",
    title: "CUSTOM Building Products RedGard Technical Data Sheet TDS-104",
    url: "https://www.custombuildingproducts.com/wp-content/uploads/TDS-104-021425.pdf",
    use: "Reference for bathroom waterproofing membrane applications and coverage.",
  },
] as const satisfies readonly RenovationEstimatorSource[];

export const RENOVATION_ESTIMATE_EXCLUSIONS = [
  "Labor and contractor markup",
  "Demolition and debris disposal",
  "Permits, inspections, and design fees",
  "Sales tax",
  "Shipping, freight, and delivery",
  "Hazardous material testing or remediation",
  "Unforeseen substrate, framing, plumbing, or electrical repairs",
] as const;

const NATIONAL_GOODS_RPP = 99.5;
const PROCUREMENT_CONTINGENCY_RATE = 0.05;

export const STATE_GOODS_RPP_2024: Readonly<Record<UsStateCode, number>> = {
  AL: 96.399,
  AK: 106.319,
  AZ: 95.361,
  AR: 93.597,
  CA: 106.098,
  CO: 98.727,
  CT: 97.33,
  DE: 96.155,
  DC: 106.502,
  FL: 98.059,
  GA: 98.929,
  HI: 111.562,
  ID: 96.311,
  IL: 103.832,
  IN: 95.509,
  IA: 93.73,
  KS: 94.027,
  KY: 95.967,
  LA: 93.7,
  ME: 97.171,
  MD: 102.524,
  MA: 98.82,
  MI: 95.993,
  MN: 100.519,
  MS: 96.219,
  MO: 96.299,
  MT: 96.006,
  NE: 94.101,
  NV: 96.271,
  NH: 98.578,
  NJ: 107.066,
  NM: 96.144,
  NY: 107.254,
  NC: 96.621,
  ND: 95.701,
  OH: 93.67,
  OK: 93.778,
  OR: 105.261,
  PA: 99.357,
  RI: 97.165,
  SC: 96.339,
  SD: 95.473,
  TN: 96.247,
  TX: 98.083,
  UT: 96.446,
  VT: 97.274,
  VA: 100.368,
  WA: 104.359,
  WV: 96.539,
  WI: 94.31,
  WY: 95.368,
};

const CLASS_VALUES: readonly RenovationClass[] = ["A", "B", "C", "D"];
const BUDGET_APPROACH_VALUES: readonly BudgetApproach[] = [
  "very-low",
  "middle",
  "better",
];
const VALID_SCOPES = new Set<RenovationScope>(
  RENOVATION_SCOPE_OPTIONS.map((option) => option.value),
);
const VALID_UNIT_TYPES = new Set<RenovationUnitType>(
  RENOVATION_UNIT_TYPE_OPTIONS.map((option) => option.value),
);

const BUDGET_APPROACH_MULTIPLIER: Record<BudgetApproach, number> = {
  "very-low": 0.85,
  middle: 1,
  better: 1.18,
};

const PLANNING_RANGE: Record<BudgetApproach, { low: number; high: number }> = {
  "very-low": { low: 0.88, high: 1.12 },
  middle: { low: 0.92, high: 1.12 },
  better: { low: 0.94, high: 1.15 },
};

const PAINT_PRICES: Record<
  RenovationClass,
  { wall: number; ceiling: number; trim: number; primer: number; supplies: number }
> = {
  D: { wall: 26, ceiling: 24, trim: 32, primer: 24, supplies: 85 },
  C: { wall: 34, ceiling: 30, trim: 42, primer: 30, supplies: 120 },
  B: { wall: 48, ceiling: 42, trim: 58, primer: 38, supplies: 175 },
  A: { wall: 72, ceiling: 58, trim: 82, primer: 52, supplies: 260 },
};

const FLOORING_PRICES: Record<
  RenovationClass,
  { lvp: number; underlaymentAndTransitions: number; wasteRate: number }
> = {
  D: { lvp: 1.85, underlaymentAndTransitions: 0.25, wasteRate: 0.08 },
  C: { lvp: 2.75, underlaymentAndTransitions: 0.4, wasteRate: 0.08 },
  B: { lvp: 4.25, underlaymentAndTransitions: 0.65, wasteRate: 0.1 },
  A: { lvp: 7, underlaymentAndTransitions: 1, wasteRate: 0.12 },
};

type BathroomComponentKey =
  | "floorTile"
  | "wallTile"
  | "vanity"
  | "toilet"
  | "tubOrBase"
  | "faucetAndTrim"
  | "waterproofingAndBacker"
  | "mortarAndGrout"
  | "accessories";

const BATHROOM_COMPONENT_PRICES: Record<
  RenovationClass,
  Record<BathroomComponentKey, number>
> = {
  D: {
    floorTile: 100,
    wallTile: 250,
    vanity: 250,
    toilet: 140,
    tubOrBase: 280,
    faucetAndTrim: 160,
    waterproofingAndBacker: 180,
    mortarAndGrout: 90,
    accessories: 200,
  },
  C: {
    floorTile: 150,
    wallTile: 400,
    vanity: 450,
    toilet: 220,
    tubOrBase: 420,
    faucetAndTrim: 260,
    waterproofingAndBacker: 250,
    mortarAndGrout: 140,
    accessories: 360,
  },
  B: {
    floorTile: 250,
    wallTile: 700,
    vanity: 800,
    toilet: 350,
    tubOrBase: 650,
    faucetAndTrim: 450,
    waterproofingAndBacker: 400,
    mortarAndGrout: 250,
    accessories: 750,
  },
  A: {
    floorTile: 450,
    wallTile: 1_200,
    vanity: 1_600,
    toilet: 600,
    tubOrBase: 1_100,
    faucetAndTrim: 900,
    waterproofingAndBacker: 650,
    mortarAndGrout: 400,
    accessories: 1_300,
  },
};

type KitchenComponentKey =
  | "cabinets"
  | "countertop"
  | "sinkAndFaucet"
  | "backsplash"
  | "hardware"
  | "cabinetAccessories";

const KITCHEN_COMPONENT_PRICES: Record<
  RenovationClass,
  Record<KitchenComponentKey, number>
> = {
  D: {
    cabinets: 1_900,
    countertop: 700,
    sinkAndFaucet: 300,
    backsplash: 250,
    hardware: 250,
    cabinetAccessories: 400,
  },
  C: {
    cabinets: 3_200,
    countertop: 1_200,
    sinkAndFaucet: 500,
    backsplash: 400,
    hardware: 350,
    cabinetAccessories: 550,
  },
  B: {
    cabinets: 5_600,
    countertop: 2_100,
    sinkAndFaucet: 800,
    backsplash: 700,
    hardware: 500,
    cabinetAccessories: 800,
  },
  A: {
    cabinets: 10_500,
    countertop: 3_900,
    sinkAndFaucet: 1_400,
    backsplash: 1_100,
    hardware: 800,
    cabinetAccessories: 1_300,
  },
};

const CARPENTRY_PRICES: Record<
  RenovationClass,
  { trimPerLinearFoot: number; door: number; hardwarePerDoor: number }
> = {
  D: { trimPerLinearFoot: 0.85, door: 105, hardwarePerDoor: 32 },
  C: { trimPerLinearFoot: 1.25, door: 170, hardwarePerDoor: 50 },
  B: { trimPerLinearFoot: 2.15, door: 285, hardwarePerDoor: 80 },
  A: { trimPerLinearFoot: 3.75, door: 520, hardwarePerDoor: 135 },
};

const BATHROOM_COMPONENTS: readonly {
  key: Exclude<BathroomComponentKey, "floorTile" | "wallTile">;
  label: string;
  inclusion: string;
}[] = [
  { key: "vanity", label: "Vanity and top", inclusion: "One vanity and top per bathroom" },
  { key: "toilet", label: "Toilet", inclusion: "One toilet per bathroom" },
  {
    key: "tubOrBase",
    label: "Tub or shower base",
    inclusion: "One tub or shower base per bathroom",
  },
  {
    key: "faucetAndTrim",
    label: "Faucet and shower trim",
    inclusion: "Lavatory faucet and tub or shower trim package",
  },
  {
    key: "waterproofingAndBacker",
    label: "Waterproofing and backer board",
    inclusion: "Backer board, liquid membrane, tape, and compatible accessories",
  },
  {
    key: "mortarAndGrout",
    label: "Mortar and grout",
    inclusion: "Setting mortar, grout, and basic sealant allowance",
  },
  {
    key: "accessories",
    label: "Mirror, light, and bath accessories",
    inclusion: "Mirror, vanity light, towel hardware, and small accessories",
  },
];

const KITCHEN_COMPONENTS: readonly {
  key: KitchenComponentKey;
  label: string;
  inclusion: string;
}[] = [
  {
    key: "cabinets",
    label: "Kitchen cabinets",
    inclusion: "Stock-to-premium cabinet package based on renovation class",
  },
  {
    key: "countertop",
    label: "Kitchen countertop",
    inclusion: "Countertop material allowance; field measurement and fabrication excluded",
  },
  {
    key: "sinkAndFaucet",
    label: "Kitchen sink and faucet",
    inclusion: "One sink, faucet, strainers, and connection accessories per kitchen",
  },
  {
    key: "backsplash",
    label: "Kitchen backsplash",
    inclusion: "Tile, setting material, grout, and typical cutting waste",
  },
  {
    key: "hardware",
    label: "Cabinet hardware",
    inclusion: "Pulls, knobs, and basic mounting hardware",
  },
  {
    key: "cabinetAccessories",
    label: "Cabinet accessories",
    inclusion: "Toe kicks, fillers, panels, trim, and installation consumables",
  },
];

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function isStateCode(value: string): value is UsStateCode {
  return Object.prototype.hasOwnProperty.call(STATE_GOODS_RPP_2024, value);
}

function isRenovationClass(value: string): value is RenovationClass {
  return CLASS_VALUES.includes(value as RenovationClass);
}

function isBudgetApproach(value: string): value is BudgetApproach {
  return BUDGET_APPROACH_VALUES.includes(value as BudgetApproach);
}

function isRenovationUnitType(value: string): value is RenovationUnitType {
  return VALID_UNIT_TYPES.has(value as RenovationUnitType);
}

function sanitizeInput(input: RenovationEstimatorInput): {
  input: RenovationEstimatorInput;
  warnings: string[];
} {
  const warnings: string[] = [];
  const rawScopes = Array.isArray(input.scopes) ? input.scopes : [];
  const scopes = Array.from(
    new Set(
      rawScopes.filter((scope): scope is RenovationScope =>
        VALID_SCOPES.has(scope as RenovationScope),
      ),
    ),
  );

  const fallbackSquareFeet = Math.round(
    clamp(finiteOr(input.squareFeetPerUnit, 700), 100, 10_000),
  );
  const fallbackUnitCount = Math.round(clamp(finiteOr(input.unitCount, 1), 1, 10_000));
  const fallbackBathroomCount = Math.round(
    clamp(finiteOr(input.bathroomCountPerUnit, 1), 0, 10),
  );
  const rawUnitMix = Array.isArray(input.unitMix) && input.unitMix.length > 0
    ? input.unitMix.slice(0, RENOVATION_UNIT_TYPE_OPTIONS.length)
    : [{
        unitType: "one-bedroom" as const,
        unitCount: fallbackUnitCount,
        squareFeetPerUnit: fallbackSquareFeet,
        bathroomCountPerUnit: fallbackBathroomCount,
      }];
  const seenUnitTypes = new Set<RenovationUnitType>();
  const unitMix = rawUnitMix.flatMap((entry) => {
    const requestedType = typeof entry?.unitType === "string" ? entry.unitType : "";
    if (!isRenovationUnitType(requestedType) || seenUnitTypes.has(requestedType)) return [];

    seenUnitTypes.add(requestedType);
    let bathroomCountPerUnit = Math.round(
      clamp(finiteOr(entry.bathroomCountPerUnit, 1), 0, 10),
    );
    if (scopes.includes("bathrooms") && bathroomCountPerUnit === 0) {
      bathroomCountPerUnit = 1;
      warnings.push(`${RENOVATION_UNIT_TYPE_OPTIONS.find((option) => option.value === requestedType)?.label ?? requestedType} bathroom count was set to one.`);
    }

    return [{
      unitType: requestedType,
      unitCount: Math.round(clamp(finiteOr(entry.unitCount, 1), 1, 1_000)),
      squareFeetPerUnit: Math.round(
        clamp(finiteOr(entry.squareFeetPerUnit, 700), 100, 10_000),
      ),
      bathroomCountPerUnit,
    }];
  });
  const normalizedUnitMix = unitMix.length > 0 ? unitMix : [{
    unitType: "one-bedroom" as const,
    unitCount: fallbackUnitCount,
    squareFeetPerUnit: fallbackSquareFeet,
    bathroomCountPerUnit: scopes.includes("bathrooms") ? Math.max(1, fallbackBathroomCount) : fallbackBathroomCount,
  }];
  const unitCount = normalizedUnitMix.reduce((sum, entry) => sum + entry.unitCount, 0);
  const squareFeetPerUnit = Math.round(
    normalizedUnitMix.reduce((sum, entry) => sum + entry.squareFeetPerUnit * entry.unitCount, 0) / unitCount,
  );
  const bathroomCountPerUnit = roundQuantity(
    normalizedUnitMix.reduce((sum, entry) => sum + entry.bathroomCountPerUnit * entry.unitCount, 0) / unitCount,
  );

  const requestedStateCode =
    typeof input.stateCode === "string" ? input.stateCode.trim().toUpperCase() : "";
  const stateCode = isStateCode(requestedStateCode) ? requestedStateCode : "US";

  if (stateCode === "US") {
    warnings.push("An invalid or missing state code was replaced with the national average.");
  }

  const renovationClass = isRenovationClass(input.renovationClass)
    ? input.renovationClass
    : "C";
  const budgetApproach = isBudgetApproach(input.budgetApproach)
    ? input.budgetApproach
    : "middle";
  const rawTargetBudget = input.targetBudget;
  const targetBudget =
    typeof rawTargetBudget === "number" && Number.isFinite(rawTargetBudget) && rawTargetBudget > 0
      ? roundMoney(clamp(rawTargetBudget, 1, 1_000_000_000))
      : undefined;
  const otherNotes =
    typeof input.otherNotes === "string"
      ? input.otherNotes.trim().slice(0, 2_000) || undefined
      : undefined;

  if (scopes.length === 0) {
    warnings.push("No priced renovation scopes were selected.");
  }

  return {
    input: {
      squareFeetPerUnit,
      unitCount,
      unitMix: normalizedUnitMix,
      stateCode,
      scopes,
      bathroomCountPerUnit,
      renovationClass,
      budgetApproach,
      targetBudget,
      otherNotes,
    },
    warnings,
  };
}

function getVolumeDiscountRate(unitCount: number): number {
  if (unitCount >= 50) return 0.09;
  if (unitCount >= 20) return 0.06;
  if (unitCount >= 5) return 0.03;
  return 0;
}

function makeLineItem(args: {
  id: string;
  category: RenovationScope;
  label: string;
  quantity: number;
  perUnitQuantity: number;
  unit: string;
  baseUnitCost: number;
  budgetMultiplier: number;
  assumptions: string[];
  inclusions: string[];
}): RenovationEstimateLineItem {
  const unitCost = args.baseUnitCost * args.budgetMultiplier;

  return {
    id: args.id,
    category: args.category,
    label: args.label,
    quantity: roundQuantity(args.quantity),
    perUnitQuantity: roundQuantity(args.perUnitQuantity),
    unit: args.unit,
    unitCost: roundMoney(unitCost),
    total: roundMoney(args.quantity * unitCost),
    assumptions: args.assumptions,
    inclusions: args.inclusions,
  };
}

function addPaintLineItems(
  lineItems: RenovationEstimateLineItem[],
  input: RenovationEstimatorInput,
  budgetMultiplier: number,
): void {
  const { squareFeetPerUnit: squareFeet, unitCount, renovationClass, budgetApproach } =
    input;
  const prices = PAINT_PRICES[renovationClass];
  const wallSurfacePerUnit = squareFeet * 2.6;
  const wallGallonsPerUnit = Math.ceil((wallSurfacePerUnit * 2) / 375);
  const ceilingGallonsPerUnit = Math.ceil(squareFeet / 375);
  const trimGallonsPerUnit = Math.max(1, Math.ceil(squareFeet / 500));
  const includePrimer =
    renovationClass === "A" || renovationClass === "B" || budgetApproach === "better";
  const primerGallonsPerUnit = includePrimer ? Math.ceil(wallSurfacePerUnit / 375) : 0;

  const paintAssumptions = [
    `Wall surface equals 2.6 x ${squareFeet.toLocaleString("en-US")} sq ft of floor area.`,
    "Wall paint receives two coats at 375 sq ft per gallon per coat.",
    "Ceiling paint receives one coat at 375 sq ft per gallon.",
    "All paint quantities are rounded up to full gallons per unit before portfolio scaling.",
  ];

  lineItems.push(
    makeLineItem({
      id: "paint-wall",
      category: "paint",
      label: "Interior wall paint",
      quantity: wallGallonsPerUnit * unitCount,
      perUnitQuantity: wallGallonsPerUnit,
      unit: "gal",
      baseUnitCost: prices.wall,
      budgetMultiplier,
      assumptions: paintAssumptions,
      inclusions: ["Two finish coats on estimated wall surface"],
    }),
    makeLineItem({
      id: "paint-ceiling",
      category: "paint",
      label: "Ceiling paint",
      quantity: ceilingGallonsPerUnit * unitCount,
      perUnitQuantity: ceilingGallonsPerUnit,
      unit: "gal",
      baseUnitCost: prices.ceiling,
      budgetMultiplier,
      assumptions: paintAssumptions,
      inclusions: ["One finish coat over the apartment ceiling area"],
    }),
    makeLineItem({
      id: "paint-trim",
      category: "paint",
      label: "Trim and door paint",
      quantity: trimGallonsPerUnit * unitCount,
      perUnitQuantity: trimGallonsPerUnit,
      unit: "gal",
      baseUnitCost: prices.trim,
      budgetMultiplier,
      assumptions: ["Trim paint equals at least one gallon, then one gallon per 500 sq ft."],
      inclusions: ["Baseboard, casing, and typical interior doors"],
    }),
  );

  if (includePrimer) {
    lineItems.push(
      makeLineItem({
        id: "paint-primer",
        category: "paint",
        label: "Interior primer allowance",
        quantity: primerGallonsPerUnit * unitCount,
        perUnitQuantity: primerGallonsPerUnit,
        unit: "gal",
        baseUnitCost: prices.primer,
        budgetMultiplier,
        assumptions: [
          "Primer is included for class A/B renovations or the better budget approach.",
          "Primer allowance uses estimated wall surface at 375 sq ft per gallon.",
        ],
        inclusions: ["One wall primer coat allowance"],
      }),
    );
  }

  lineItems.push(
    makeLineItem({
      id: "paint-supplies",
      category: "paint",
      label: "Paint supplies",
      quantity: unitCount,
      perUnitQuantity: 1,
      unit: "unit kit",
      baseUnitCost: prices.supplies,
      budgetMultiplier,
      assumptions: ["One reusable/consumable supply allowance per apartment."],
      inclusions: ["Rollers, brushes, trays, tape, plastic, drop cloths, caulk, and patching"],
    }),
  );
}

function addFlooringLineItems(
  lineItems: RenovationEstimateLineItem[],
  input: RenovationEstimatorInput,
  budgetMultiplier: number,
): void {
  const { squareFeetPerUnit, bathroomCountPerUnit, unitCount, renovationClass } = input;
  const prices = FLOORING_PRICES[renovationClass];
  const netFloorAreaPerUnit = Math.max(
    squareFeetPerUnit * 0.65,
    squareFeetPerUnit - bathroomCountPerUnit * 45,
  );
  const purchasedSquareFeetPerUnit = Math.ceil(netFloorAreaPerUnit * (1 + prices.wasteRate));
  const flooringAssumptions = [
    `Flooring area is apartment area minus 45 sq ft per bathroom, with a minimum of 65% of apartment area.`,
    `${Math.round(prices.wasteRate * 100)}% cutting and attic-stock waste is included in purchased quantity.`,
    "Volume savings reduce cost only; purchased waste quantities remain unchanged.",
  ];

  lineItems.push(
    makeLineItem({
      id: "flooring-lvp",
      category: "flooring",
      label: "Luxury vinyl plank flooring",
      quantity: purchasedSquareFeetPerUnit * unitCount,
      perUnitQuantity: purchasedSquareFeetPerUnit,
      unit: "sq ft",
      baseUnitCost: prices.lvp,
      budgetMultiplier,
      assumptions: flooringAssumptions,
      inclusions: ["LVP finish material and class-based cutting waste"],
    }),
    makeLineItem({
      id: "flooring-accessories",
      category: "flooring",
      label: "Underlayment and transitions allowance",
      quantity: purchasedSquareFeetPerUnit * unitCount,
      perUnitQuantity: purchasedSquareFeetPerUnit,
      unit: "sq ft",
      baseUnitCost: prices.underlaymentAndTransitions,
      budgetMultiplier,
      assumptions: flooringAssumptions,
      inclusions: ["Underlayment where required, reducers, transitions, and small accessories"],
    }),
  );
}

function addBathroomLineItems(
  lineItems: RenovationEstimateLineItem[],
  input: RenovationEstimatorInput,
  budgetMultiplier: number,
): void {
  const { bathroomCountPerUnit, unitCount, renovationClass } = input;
  const bathroomCount = bathroomCountPerUnit * unitCount;
  const prices = BATHROOM_COMPONENT_PRICES[renovationClass];
  const floorTilePerBathroom = 45 * 1.1;
  const wallTilePerBathroom = 90 * 1.12;
  const bathroomAssumptions = [
    "Each bathroom includes 45 sq ft of floor tile plus 10% waste.",
    "Each bathroom includes 90 sq ft of tub/shower wall tile plus 12% waste.",
    `Class ${renovationClass} component allowances total ${formatCurrency(
      Object.values(prices).reduce((sum, price) => sum + price, 0),
    )} per bathroom before the budget and state factors.`,
  ];

  lineItems.push(
    makeLineItem({
      id: "bathroom-floor-tile",
      category: "bathrooms",
      label: "Bathroom floor tile",
      quantity: floorTilePerBathroom * bathroomCount,
      perUnitQuantity: floorTilePerBathroom * bathroomCountPerUnit,
      unit: "sq ft",
      baseUnitCost: prices.floorTile / floorTilePerBathroom,
      budgetMultiplier,
      assumptions: bathroomAssumptions,
      inclusions: ["45 sq ft installed area plus 10% material waste per bathroom"],
    }),
    makeLineItem({
      id: "bathroom-wall-tile",
      category: "bathrooms",
      label: "Tub/shower wall tile",
      quantity: wallTilePerBathroom * bathroomCount,
      perUnitQuantity: wallTilePerBathroom * bathroomCountPerUnit,
      unit: "sq ft",
      baseUnitCost: prices.wallTile / wallTilePerBathroom,
      budgetMultiplier,
      assumptions: bathroomAssumptions,
      inclusions: ["90 sq ft installed area plus 12% material waste per bathroom"],
    }),
  );

  for (const component of BATHROOM_COMPONENTS) {
    lineItems.push(
      makeLineItem({
        id: `bathroom-${component.key}`,
        category: "bathrooms",
        label: component.label,
        quantity: bathroomCount,
        perUnitQuantity: bathroomCountPerUnit,
        unit: "bath package",
        baseUnitCost: prices[component.key],
        budgetMultiplier,
        assumptions: bathroomAssumptions,
        inclusions: [component.inclusion],
      }),
    );
  }
}

function addKitchenLineItems(
  lineItems: RenovationEstimateLineItem[],
  input: RenovationEstimatorInput,
  budgetMultiplier: number,
): void {
  const { unitCount, renovationClass } = input;
  const prices = KITCHEN_COMPONENT_PRICES[renovationClass];
  const kitchenAssumptions = [
    "One typical apartment kitchen is included per unit.",
    `Class ${renovationClass} component allowances total ${formatCurrency(
      Object.values(prices).reduce((sum, price) => sum + price, 0),
    )} per kitchen before the budget and state factors.`,
    "Appliances are not included.",
  ];

  for (const component of KITCHEN_COMPONENTS) {
    lineItems.push(
      makeLineItem({
        id: `kitchen-${component.key}`,
        category: "kitchen",
        label: component.label,
        quantity: unitCount,
        perUnitQuantity: 1,
        unit: "kitchen package",
        baseUnitCost: prices[component.key],
        budgetMultiplier,
        assumptions: kitchenAssumptions,
        inclusions: [component.inclusion],
      }),
    );
  }
}

function addCarpentryLineItems(
  lineItems: RenovationEstimateLineItem[],
  input: RenovationEstimatorInput,
  budgetMultiplier: number,
): void {
  const { squareFeetPerUnit, unitCount, renovationClass } = input;
  const prices = CARPENTRY_PRICES[renovationClass];
  const baseboardLinearFeetPerUnit = roundQuantity(squareFeetPerUnit * 0.38);
  const doorsPerUnit = Math.max(3, Math.round(squareFeetPerUnit / 175));
  const casingLinearFeetPerUnit = doorsPerUnit * 16;
  const trimLinearFeetPerUnit = baseboardLinearFeetPerUnit + casingLinearFeetPerUnit;
  const assumptions = [
    "Baseboard equals 0.38 linear feet per apartment square foot.",
    "Interior doors equal at least three, then apartment area divided by 175 and rounded.",
    "Door casing equals 16 linear feet per interior door.",
  ];

  lineItems.push(
    makeLineItem({
      id: "carpentry-trim",
      category: "carpentry",
      label: "Baseboard and door casing",
      quantity: trimLinearFeetPerUnit * unitCount,
      perUnitQuantity: trimLinearFeetPerUnit,
      unit: "linear ft",
      baseUnitCost: prices.trimPerLinearFoot,
      budgetMultiplier,
      assumptions,
      inclusions: [
        `${baseboardLinearFeetPerUnit} linear ft of baseboard per unit`,
        `${casingLinearFeetPerUnit} linear ft of casing per unit`,
      ],
    }),
    makeLineItem({
      id: "carpentry-doors",
      category: "carpentry",
      label: "Interior doors",
      quantity: doorsPerUnit * unitCount,
      perUnitQuantity: doorsPerUnit,
      unit: "door",
      baseUnitCost: prices.door,
      budgetMultiplier,
      assumptions,
      inclusions: ["Class-based slab or prehung interior door allowance"],
    }),
    makeLineItem({
      id: "carpentry-hardware",
      category: "carpentry",
      label: "Door hardware and fasteners",
      quantity: doorsPerUnit * unitCount,
      perUnitQuantity: doorsPerUnit,
      unit: "door set",
      baseUnitCost: prices.hardwarePerDoor,
      budgetMultiplier,
      assumptions,
      inclusions: ["Hinges, passage/privacy hardware, shims, nails, and fasteners"],
    }),
  );
}

function mergePortfolioLineItems(
  lineItems: RenovationEstimateLineItem[],
  totalUnitCount: number,
): RenovationEstimateLineItem[] {
  const merged = new Map<string, RenovationEstimateLineItem>();

  for (const item of lineItems) {
    const existing = merged.get(item.id);
    if (!existing) {
      merged.set(item.id, { ...item, assumptions: [...item.assumptions], inclusions: [...item.inclusions] });
      continue;
    }

    existing.quantity = roundQuantity(existing.quantity + item.quantity);
    existing.total = roundMoney(existing.total + item.total);
    existing.assumptions = Array.from(new Set([...existing.assumptions, ...item.assumptions]));
    existing.inclusions = Array.from(new Set([...existing.inclusions, ...item.inclusions]));
  }

  return Array.from(merged.values()).map((item) => ({
    ...item,
    perUnitQuantity: roundQuantity(item.quantity / totalUnitCount),
  }));
}

export function calculateRenovationEstimate(
  rawInput: RenovationEstimatorInput,
): RenovationEstimateResult {
  const sanitized = sanitizeInput(rawInput);
  const input = sanitized.input;
  const budgetMultiplier = BUDGET_APPROACH_MULTIPLIER[input.budgetApproach];
  const unmergedLineItems: RenovationEstimateLineItem[] = [];

  for (const unitType of input.unitMix) {
    const unitTypeInput: RenovationEstimatorInput = {
      ...input,
      squareFeetPerUnit: unitType.squareFeetPerUnit,
      unitCount: unitType.unitCount,
      bathroomCountPerUnit: unitType.bathroomCountPerUnit,
      unitMix: [unitType],
    };

    if (input.scopes.includes("paint")) {
      addPaintLineItems(unmergedLineItems, unitTypeInput, budgetMultiplier);
    }
    if (input.scopes.includes("flooring")) {
      addFlooringLineItems(unmergedLineItems, unitTypeInput, budgetMultiplier);
    }
    if (input.scopes.includes("bathrooms")) {
      addBathroomLineItems(unmergedLineItems, unitTypeInput, budgetMultiplier);
    }
    if (input.scopes.includes("kitchen")) {
      addKitchenLineItems(unmergedLineItems, unitTypeInput, budgetMultiplier);
    }
    if (input.scopes.includes("carpentry")) {
      addCarpentryLineItems(unmergedLineItems, unitTypeInput, budgetMultiplier);
    }
  }
  const lineItems = mergePortfolioLineItems(unmergedLineItems, input.unitCount);

  const portfolioSubtotal = roundMoney(
    lineItems.reduce((sum, lineItem) => sum + lineItem.total, 0),
  );
  const perUnitSubtotal = roundMoney(portfolioSubtotal / input.unitCount);
  const stateOption = US_STATES.find((state) => state.code === input.stateCode);
  const stateGoodsRpp = stateOption
    ? STATE_GOODS_RPP_2024[stateOption.code]
    : NATIONAL_GOODS_RPP;
  const stateFactor = stateGoodsRpp / NATIONAL_GOODS_RPP;
  const stateAdjustedSubtotal = roundMoney(portfolioSubtotal * stateFactor);
  const stateAdjustmentAmount = roundMoney(stateAdjustedSubtotal - portfolioSubtotal);
  const volumeDiscountRate = getVolumeDiscountRate(input.unitCount);
  const volumeSavings = roundMoney(stateAdjustedSubtotal * volumeDiscountRate);
  const subtotalAfterVolumeSavings = roundMoney(stateAdjustedSubtotal - volumeSavings);
  const procurementContingency = roundMoney(
    subtotalAfterVolumeSavings * PROCUREMENT_CONTINGENCY_RATE,
  );
  const estimatedTotal = roundMoney(subtotalAfterVolumeSavings + procurementContingency);
  const planningRange = PLANNING_RANGE[input.budgetApproach];
  const lowEstimate = roundMoney(estimatedTotal * planningRange.low);
  const highEstimate = roundMoney(estimatedTotal * planningRange.high);
  const reviewItems: RenovationEstimateReviewItem[] = input.otherNotes
    ? [
        {
          id: "other-notes",
          label: "Other requested work",
          details: input.otherNotes,
          priced: false,
        },
      ]
    : [];

  const budgetDifference = input.targetBudget
    ? roundMoney(estimatedTotal - input.targetBudget)
    : undefined;
  const budgetComparison =
    input.targetBudget && budgetDifference !== undefined
      ? {
          targetBudget: input.targetBudget,
          difference: budgetDifference,
          percentDifference: roundQuantity((budgetDifference / input.targetBudget) * 100),
          status: budgetDifference <= 0 ? ("within-budget" as const) : ("over-budget" as const),
        }
      : undefined;

  return {
    input,
    lineItems,
    reviewItems,
    perUnitSubtotal,
    portfolioSubtotal,
    stateAdjustment: {
      code: stateOption?.code ?? "US",
      label: stateOption?.label ?? "United States average",
      goodsRpp: stateGoodsRpp,
      nationalGoodsRpp: NATIONAL_GOODS_RPP,
      factor: Math.round(stateFactor * 1_000_000) / 1_000_000,
      amount: stateAdjustmentAmount,
    },
    stateAdjustedSubtotal,
    volumeDiscountRate,
    volumeSavings,
    procurementContingencyRate: PROCUREMENT_CONTINGENCY_RATE,
    procurementContingency,
    estimatedTotal,
    lowEstimate,
    highEstimate,
    budgetComparison,
    assumptions: [
      `Class ${input.renovationClass} material quality with the ${input.budgetApproach} budget approach (${budgetMultiplier.toFixed(2)}x).`,
      `${input.unitMix.length} apartment type${input.unitMix.length === 1 ? "" : "s"} calculated separately, then combined into one portfolio estimate.`,
      "State pricing uses the 2024 BEA goods RPP divided by the 99.5 national goods RPP.",
      "Volume discount is applied after the state adjustment and does not reduce material quantities.",
      "A 5% procurement contingency is applied after volume savings.",
      "Prices are deterministic planning allowances, not retailer quotes or bids.",
    ],
    exclusions: [...RENOVATION_ESTIMATE_EXCLUSIONS],
    warnings: sanitized.warnings,
  };
}

export function formatCurrency(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: clamp(Math.round(maximumFractionDigits), 0, 2),
  }).format(Number.isFinite(value) ? value : 0);
}
