import type { WoodFloorRoom } from "@/lib/wood-floor-takeoff-extraction";

export type WoodFloorMaterialEstimate = {
  label: string;
  quantity: string;
  detail: string;
};

export type WoodFloorMaterialCalculation = {
  selectedAreaSqft: number;
  excludedAreaSqft: number;
  wastePercent: number;
  orderAreaSqft: number;
  sqftPerBox: number;
  boxCount: number;
  pricePerSqft: number;
  materialCost: number;
  deliveryFee: number;
  totalCost: number;
  roomsIncluded: number;
  roomsExcluded: number;
  rows: WoodFloorMaterialEstimate[];
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

export function calculateWoodFloorMaterials(params: {
  rooms: Array<Pick<WoodFloorRoom, "areaSqft" | "includeInTakeoff">>;
  wastePercent?: number | null;
  sqftPerBox?: number | null;
  pricePerSqft?: number | null;
  deliveryFee?: number | null;
}): WoodFloorMaterialCalculation {
  const wastePercent = Math.min(Math.max(positive(params.wastePercent) || 10, 0), 35);
  const sqftPerBox = positive(params.sqftPerBox) || 20;
  const pricePerSqft = positive(params.pricePerSqft);
  const deliveryFee = positive(params.deliveryFee);
  const includedRooms = params.rooms.filter((room) => room.includeInTakeoff);
  const excludedRooms = params.rooms.filter((room) => !room.includeInTakeoff);
  const selectedAreaSqft = includedRooms.reduce((total, room) => total + positive(room.areaSqft), 0);
  const excludedAreaSqft = excludedRooms.reduce((total, room) => total + positive(room.areaSqft), 0);
  const orderAreaSqft = selectedAreaSqft * (1 + wastePercent / 100);
  const boxCount = roundUp(orderAreaSqft / sqftPerBox);
  const materialCost = pricePerSqft > 0 ? orderAreaSqft * pricePerSqft : 0;
  const appliedDeliveryFee = materialCost > 0 ? deliveryFee : 0;
  const totalCost = materialCost + appliedDeliveryFee;

  return {
    selectedAreaSqft,
    excludedAreaSqft,
    wastePercent,
    orderAreaSqft,
    sqftPerBox,
    boxCount,
    pricePerSqft,
    materialCost,
    deliveryFee: appliedDeliveryFee,
    totalCost,
    roomsIncluded: includedRooms.length,
    roomsExcluded: excludedRooms.length,
    rows: [
      {
        label: "Wood flooring",
        quantity: `${boxCount} boxes`,
        detail: `${formatNumber(orderAreaSqft, 2)} sq ft to order, ${formatNumber(sqftPerBox, 2)} sq ft per box`,
      },
      ...(pricePerSqft > 0
        ? [
            {
              label: "Material cost",
              quantity: `$${formatNumber(totalCost, 2)}`,
              detail: `$${formatNumber(pricePerSqft, 2)} per sq ft x ${formatNumber(orderAreaSqft, 2)} sq ft${appliedDeliveryFee > 0 ? ` + $${formatNumber(appliedDeliveryFee, 2)} delivery` : ""}`,
            },
          ]
        : []),
      {
        label: "Field area",
        quantity: `${formatNumber(selectedAreaSqft, 2)} sq ft`,
        detail: `${includedRooms.length} selected room${includedRooms.length === 1 ? "" : "s"} before ${formatNumber(wastePercent)}% waste`,
      },
      {
        label: "Excluded area",
        quantity: `${formatNumber(excludedAreaSqft, 2)} sq ft`,
        detail: `${excludedRooms.length} room${excludedRooms.length === 1 ? "" : "s"} removed from this takeoff`,
      },
    ],
  };
}
