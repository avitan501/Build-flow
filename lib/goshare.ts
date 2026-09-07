import "server-only";

import { randomUUID } from "node:crypto";

import { structuredLocation } from "@/lib/delivery-address";
import type { DeliveryLocation } from "@/lib/location-types";
import { createAdminClient } from "@/lib/supabase/admin";

type Credentials = { api_key: string | null; api_base_url: string | null };
type JsonRecord = Record<string, unknown>;

export type GoShareInput = {
  pickupAddress: string;
  pickupLocation: DeliveryLocation | null;
  dropoffAddress: string;
  dropoffLocation: DeliveryLocation | null;
  pickupName?: string;
  pickupPhone?: string;
  dropoffName?: string;
  dropoffPhone?: string;
  itemDescription: string;
  packageQuantity: number;
  weightPerPackage: number;
  lengthInches?: number | null;
  widthInches?: number | null;
  heightInches?: number | null;
  vehicle: "small" | "car" | "pickup" | "van" | "box-truck";
  scheduledPickupAt?: string | null;
  loadUnloadRequired?: boolean;
  orderNumber?: string;
  reference?: string;
};

export type GoShareQuote = {
  quoteId: string;
  provider: "GoShare";
  total: number;
  baseFee: number;
  tolls: number;
  accessorialFees: number;
  currency: "USD";
  distanceMiles: null;
  durationMinutes: number | null;
  pickupMinutes: number;
  dropoffEta: null;
  expiresAt: string;
  deliveryMethod: string;
  deliveryMethodLabel: string;
};

export type GoShareDelivery = {
  deliveryId: string;
  trackingUrl: string | null;
  status: string;
  fee: number | null;
  currency: "USD";
};

export class GoShareError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "GoShareError";
  }
}

async function credentials() {
  const environmentKey = process.env.GOSHARE_API_KEY?.trim();
  const environmentBaseUrl = process.env.GOSHARE_API_BASE_URL?.trim();
  if (environmentKey) return { apiKey: environmentKey, baseUrl: environmentBaseUrl || "https://api.goshare.co" };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_goshare_credentials").single();
  const value = data as Credentials | null;
  if (error || !value?.api_key) {
    throw new GoShareError("credentials_unavailable", "GoShare production API approval and an API key are required before live prices can be requested.");
  }
  return { apiKey: value.api_key, baseUrl: value.api_base_url?.trim() || "https://api.goshare.co" };
}

function projectData(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as JsonRecord;
  const data = root.data;
  return data && typeof data === "object" ? data as JsonRecord : root;
}

function providerMessage(payload: unknown) {
  const root = projectData(payload);
  return [root?.message, root?.reason, root?.error].find((value): value is string => typeof value === "string")?.toLowerCase() || "";
}

async function goShareRequest(path: string, init: RequestInit) {
  const account = await credentials();
  const response = await fetch(`${account.baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": account.apiKey,
      ...init.headers,
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const detail = providerMessage(payload);
    if (response.status === 401 || response.status === 403) throw new GoShareError("authentication_failed", "GoShare rejected the API key or production permissions.");
    if (detail.includes("zone") || detail.includes("available")) throw new GoShareError("route_unavailable", "GoShare does not currently serve this route or vehicle request.");
    throw new GoShareError("provider_error", "GoShare could not process this delivery request right now.");
  }
  return payload;
}

function startDateTime(scheduledPickupAt?: string | null) {
  const requested = scheduledPickupAt ? new Date(scheduledPickupAt) : new Date(Date.now() + 35 * 60 * 1000);
  if (!Number.isFinite(requested.getTime())) throw new GoShareError("invalid_schedule", "Choose a valid GoShare pickup time.");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(requested);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day} ${value.hour}:${value.minute}:${value.second}`;
}

function vehicleAlias(vehicle: GoShareInput["vehicle"]) {
  return {
    small: "courier",
    car: "suv",
    pickup: "pickup_truck",
    van: "cargo_van",
    "box-truck": "box_truck",
  }[vehicle];
}

function vehicleLabel(vehicle: GoShareInput["vehicle"]) {
  return {
    small: "Courier",
    car: "SUV",
    pickup: "Pickup truck",
    van: "Cargo van",
    "box-truck": "Box truck",
  }[vehicle];
}

function place(location: DeliveryLocation | null, fallbackAddress: string, name?: string, phone?: string) {
  const address = structuredLocation(location, fallbackAddress);
  if (!address) throw new GoShareError("structured_address_required", "Choose both addresses from search so GoShare receives the complete city, state, ZIP, and coordinates.");
  return {
    address: {
      street: address.addressLine1,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      placeName: address.name,
    },
    coordinates: { latitude: address.latitude, longitude: address.longitude },
    ...(name && phone ? { contact: { name, phone } } : {}),
    hasElevator: false,
    flightOfStairs: 0,
  };
}

function projectPayload(input: GoShareInput) {
  const dimensions = input.lengthInches && input.widthInches && input.heightInches ? {
    length: input.lengthInches,
    width: input.widthInches,
    height: input.heightInches,
    dimensionUnit: "in",
  } : undefined;
  const item = {
    name: input.itemDescription,
    quantity: input.packageQuantity,
    weight: Math.round(input.packageQuantity * input.weightPerPackage * 100) / 100,
    weightUnit: "lb",
    ...(dimensions ? { dimensions } : {}),
  };
  return {
    startDateTime: startDateTime(input.scheduledPickupAt),
    subProjects: [
      { vehicle: vehicleAlias(input.vehicle) },
      ...(input.loadUnloadRequired ? [{ vehicle: "helper" }] : []),
    ],
    stops: [
      {
        sequence: 1,
        place: place(input.pickupLocation, input.pickupAddress, input.pickupName, input.pickupPhone),
        pickupItems: [item],
      },
      {
        sequence: 2,
        place: place(input.dropoffLocation, input.dropoffAddress, input.dropoffName, input.dropoffPhone),
        dropOffItems: [item],
      },
    ],
    additionalInfo: [input.orderNumber ? `Store order: ${input.orderNumber}` : "", input.reference ? `Avantia reference: ${input.reference}` : ""].filter(Boolean).join(" · "),
    ...(input.reference ? { reference: { id: input.reference, label: `Avantia Build ${input.reference}` } } : {}),
    shipperName: "Avantia Build",
    metadata: input.reference ? { avantiaReference: input.reference } : {},
  };
}

function projectPrice(project: JsonRecord | null) {
  const cents = Number(project?.totalPrice);
  if (!Number.isFinite(cents) || cents < 0) throw new GoShareError("incomplete_quote", "GoShare returned an incomplete price estimate.");
  return cents / 100;
}

function projectDuration(project: JsonRecord | null) {
  const subProjects = Array.isArray(project?.subProjects) ? project.subProjects : [];
  const first = subProjects[0] && typeof subProjects[0] === "object" ? subProjects[0] as JsonRecord : null;
  const duration = first?.durationEstimate && typeof first.durationEstimate === "object" ? first.durationEstimate as JsonRecord : null;
  const minutes = Number(duration?.max ?? duration?.min);
  return Number.isFinite(minutes) ? minutes : null;
}

export async function quoteGoShare(input: GoShareInput) {
  const payload = await goShareRequest("/v1/projects/estimate", { method: "POST", body: JSON.stringify(projectPayload(input)) });
  const project = projectData(payload);
  const total = projectPrice(project);
  return {
    quoteId: `goshare-${randomUUID()}`,
    provider: "GoShare",
    total,
    baseFee: total,
    tolls: 0,
    accessorialFees: 0,
    currency: "USD",
    distanceMiles: null,
    durationMinutes: projectDuration(project),
    pickupMinutes: 35,
    dropoffEta: null,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    deliveryMethod: vehicleAlias(input.vehicle),
    deliveryMethodLabel: `${vehicleLabel(input.vehicle)}${input.loadUnloadRequired ? " + helper" : ""}`,
  } satisfies GoShareQuote;
}

async function trackingUrl(deliveryId: string) {
  try {
    const payload = await goShareRequest(`/v1/projects/${encodeURIComponent(deliveryId)}/shareable-link`, { method: "GET" });
    const data = projectData(payload);
    return typeof data?.link === "string" ? data.link : null;
  } catch {
    return null;
  }
}

export async function createGoShareDelivery(input: GoShareInput) {
  const payload = await goShareRequest("/v1/projects", { method: "POST", body: JSON.stringify(projectPayload(input)) });
  const project = projectData(payload);
  const deliveryId = typeof project?.id === "string" ? project.id : null;
  if (!deliveryId) throw new GoShareError("delivery_failed", "GoShare did not confirm the delivery project.");
  return {
    deliveryId,
    trackingUrl: await trackingUrl(deliveryId),
    status: typeof project?.status === "string" ? project.status : "pending",
    fee: Number.isFinite(Number(project?.totalPrice)) ? Number(project?.totalPrice) / 100 : null,
    currency: "USD",
  } satisfies GoShareDelivery;
}
