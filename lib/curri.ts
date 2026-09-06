import "server-only";

import { structuredLocation } from "@/lib/delivery-address";
import type { DeliveryLocation } from "@/lib/location-types";
import { createAdminClient } from "@/lib/supabase/admin";

type Credentials = {
  user_id: string | null;
  api_key: string | null;
  account_id: string | null;
  account_location: string | null;
};

export type CurriQuote = {
  quoteId: string;
  provider: "Curri";
  total: number;
  baseFee: number;
  tolls: number;
  accessorialFees: number;
  currency: "USD";
  distanceMiles: number | null;
  durationMinutes: number | null;
  pickupMinutes: null;
  dropoffEta: null;
  expiresAt: string;
  deliveryMethod: string;
  deliveryMethodLabel: string;
};

export type CurriDelivery = {
  deliveryId: string;
  trackingUrl: string | null;
  status: string;
  fee: number | null;
  currency: "USD";
};

export class CurriError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "CurriError";
  }
}

export type CurriInput = {
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
  vehicle: "small" | "car" | "pickup" | "van";
  speed: "flexible" | "same-day" | "rush";
  scheduledPickupAt?: string | null;
  loadUnloadRequired?: boolean;
  orderNumber?: string;
  reference?: string;
};

function quoted(value: string) {
  return JSON.stringify(value);
}

function optionalArgument(name: string, value: string | null | undefined) {
  return value ? `${name}: ${quoted(value)}` : "";
}

function vehicleMethod(vehicle: CurriInput["vehicle"]) {
  return { small: "car", car: "suv", pickup: "truck", van: "cargo-van" }[vehicle];
}

function priority(input: CurriInput) {
  if (input.scheduledPickupAt) return "scheduled";
  // Curri requires account coordination before enabling its same-day priority.
  return "rush";
}

function centimeters(inches: number | null | undefined) {
  return inches && inches > 0 ? Math.round(inches * 2.54) : null;
}

function addressInput(location: DeliveryLocation | null, fallback: string) {
  const address = structuredLocation(location, fallback);
  if (!address) {
    throw new CurriError("structured_address_required", "Choose both addresses from the search suggestions so Curri receives the city, state, ZIP, and coordinates.");
  }
  return `{ addressLine1: ${quoted(address.addressLine1)}, city: ${quoted(address.city)}, state: ${quoted(address.state)}, postalCode: ${quoted(address.postalCode)}, country: "US", latitude: ${quoted(String(address.latitude))}, longitude: ${quoted(String(address.longitude))}${address.name ? `, name: ${quoted(address.name)}` : ""} }`;
}

function manifest(input: CurriInput) {
  const dimensions = [
    ["length", centimeters(input.lengthInches)],
    ["width", centimeters(input.widthInches)],
    ["height", centimeters(input.heightInches)],
  ].filter((entry): entry is [string, number] => entry[1] !== null);
  const fields = [
    `description: ${quoted(input.itemDescription || "Construction materials")}`,
    `quantity: ${input.packageQuantity}`,
    `weight: ${Math.max(0.01, Math.round(input.weightPerPackage * 0.45359237 * 100) / 100)}`,
    ...dimensions.map(([name, value]) => `${name}: ${value}`),
  ];
  return `[{ ${fields.join(", ")} }]`;
}

async function credentials() {
  const fromEnvironment = {
    userId: process.env.CURRI_USER_ID?.trim(),
    apiKey: process.env.CURRI_API_KEY?.trim(),
    accountId: process.env.CURRI_ACCOUNT_ID?.trim() || null,
    accountLocation: process.env.CURRI_ACCOUNT_LOCATION?.trim() || null,
  };
  if (fromEnvironment.userId && fromEnvironment.apiKey) return fromEnvironment;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_curri_credentials").single();
  const value = data as Credentials | null;
  if (error || !value?.user_id || !value.api_key) {
    throw new CurriError("credentials_unavailable", "Curri needs an active Business Team API User ID and API key before live prices can be requested.");
  }
  return {
    userId: value.user_id,
    apiKey: value.api_key,
    accountId: value.account_id || null,
    accountLocation: value.account_location || null,
  };
}

async function graphQL<T>(query: string) {
  const account = await credentials();
  const token = Buffer.from(`${account.userId}:${account.apiKey}`, "utf8").toString("base64");
  const response = await fetch("https://api.curri.com/graphql", {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Basic ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as { data?: T; errors?: Array<{ message?: string }> } | null;
  if (!response.ok || payload?.errors?.length || !payload?.data) {
    const detail = payload?.errors?.map((error) => error.message || "").join(" ").toLowerCase() || "";
    if (response.status === 401 || response.status === 403 || detail.includes("auth")) {
      throw new CurriError("authentication_failed", "Curri rejected the API credentials or account permissions.");
    }
    throw new CurriError("provider_error", "Curri could not process this delivery request right now.");
  }
  return { data: payload.data, account };
}

function accountArguments(account: Awaited<ReturnType<typeof credentials>>) {
  return [optionalArgument("accountId", account.accountId), optionalArgument("accountLocation", account.accountLocation)].filter(Boolean).join(" ");
}

function accessorialTotal(value: Record<string, { totalAccessorialFee?: number | null } | null> | null | undefined) {
  return Object.values(value || {}).reduce((sum, item) => sum + (Number(item?.totalAccessorialFee) || 0), 0);
}

export async function quoteCurri(input: CurriInput) {
  const account = await credentials();
  const method = vehicleMethod(input.vehicle);
  const query = `query AvantiaCurriQuote {
    deliveryQuote(
      ${accountArguments(account)}
      origin: ${addressInput(input.pickupLocation, input.pickupAddress)}
      destination: ${addressInput(input.dropoffLocation, input.dropoffAddress)}
      deliveryMethod: ${quoted(method)}
      manifestItems: ${manifest(input)}
      priority: ${quoted(priority(input))}
      requirements: { loadUnloadRequired: ${Boolean(input.loadUnloadRequired)} }
    ) {
      id fee tollFees distance duration deliveryMethod deliveryMethodDisplayName
      accessorialFees {
        loadUnloadFee { totalAccessorialFee }
        debrisRemovalFee { totalAccessorialFee }
        overnightHoldFee { totalAccessorialFee }
      }
    }
  }`;
  const { data } = await graphQL<{ deliveryQuote?: Record<string, unknown> }>(query);
  const quote = data.deliveryQuote;
  if (!quote?.id || !Number.isFinite(quote.fee)) throw new CurriError("incomplete_quote", "Curri returned an incomplete quote.");
  const base = Number(quote.fee);
  const tolls = Number(quote.tollFees) || 0;
  const extras = accessorialTotal(quote.accessorialFees as Record<string, { totalAccessorialFee?: number | null } | null> | null);
  return {
    quoteId: String(quote.id),
    provider: "Curri",
    total: (base + tolls + extras) / 100,
    baseFee: base / 100,
    tolls: tolls / 100,
    accessorialFees: extras / 100,
    currency: "USD",
    distanceMiles: Number.isFinite(quote.distance) ? Math.round(Number(quote.distance) / 160.9344) / 10 : null,
    durationMinutes: Number.isFinite(quote.duration) ? Math.round(Number(quote.duration) / 60) : null,
    pickupMinutes: null,
    dropoffEta: null,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    deliveryMethod: typeof quote.deliveryMethod === "string" ? quote.deliveryMethod : method,
    deliveryMethodLabel: typeof quote.deliveryMethodDisplayName === "string" ? quote.deliveryMethodDisplayName : method,
  } satisfies CurriQuote;
}

export async function createCurriDelivery(input: CurriInput & { quoteId: string }) {
  const account = await credentials();
  const method = vehicleMethod(input.vehicle);
  const scheduled = input.scheduledPickupAt ? `scheduledAt: ${quoted(input.scheduledPickupAt)}` : "";
  const query = `mutation AvantiaBookCurriDelivery {
    bookDelivery(data: {
      deliveryQuoteId: ${quoted(input.quoteId)}
      ${accountArguments(account)}
      origin: ${addressInput(input.pickupLocation, input.pickupAddress)}
      destination: ${addressInput(input.dropoffLocation, input.dropoffAddress)}
      originLocationPinpoint: { latitude: ${quoted(String(input.pickupLocation?.latitude))}, longitude: ${quoted(String(input.pickupLocation?.longitude))} }
      destinationLocationPinpoint: { latitude: ${quoted(String(input.dropoffLocation?.latitude))}, longitude: ${quoted(String(input.dropoffLocation?.longitude))} }
      deliveryMethod: ${quoted(method)}
      priority: ${quoted(priority(input))}
      ${scheduled}
      manifestItems: ${manifest(input)}
      requirements: { loadUnloadRequired: ${Boolean(input.loadUnloadRequired)} }
      pickupContact: { name: ${quoted(input.pickupName || "Avantia pickup")}, phoneNumber: ${quoted(input.pickupPhone || "")} }
      dropoffContact: { name: ${quoted(input.dropoffName || "Avantia jobsite")}, phoneNumber: ${quoted(input.dropoffPhone || "")} }
      deliveryMeta: { orderNumber: ${quoted(input.orderNumber || "")}, customerData: { avantiaReference: ${quoted(input.reference || "")} } }
    }) { id price deliveryMethod trackingUrl createdAt deliveryStatus { code } }
  }`;
  const { data } = await graphQL<{ bookDelivery?: Record<string, unknown> }>(query);
  const delivery = data.bookDelivery;
  if (!delivery?.id) throw new CurriError("delivery_failed", "Curri could not book this delivery. Confirm that the quote is current and the account can place orders.");
  const status = delivery.deliveryStatus as { code?: string } | null;
  return {
    deliveryId: String(delivery.id),
    trackingUrl: typeof delivery.trackingUrl === "string" ? delivery.trackingUrl : null,
    status: status?.code || "pending",
    fee: Number.isFinite(Number(delivery.price)) ? Number(delivery.price) / 100 : null,
    currency: "USD",
  } satisfies CurriDelivery;
}
