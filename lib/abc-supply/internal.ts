import "server-only";

import { getAbcInternalConfig } from "@/lib/abc-supply/config";

type AbcPricingLineRequest = {
  id: string;
  itemNumber: string;
  quantity: number;
  uom?: string;
  length?: { value: number; uom: "ft" | "in" };
};
type AbcBranchDetails = {
  number: string;
  name: string;
  status: string;
  city: string;
  state: string;
  postal: string;
  addressLine1: string;
  phone: string;
  website: string;
};

export type AbcCatalogItem = {
  itemNumber: string;
  itemDescription: string;
  familyName: string;
  status: string;
  isDimensional: boolean;
  color: string;
  imageUrl: string;
  uoms: Array<{ code: string; name: string; description: string }>;
  variations: Array<{ value: number; uom: string }>;
  availableAtSelectedBranch: boolean;
};
type AbcPricingResponse = {
  requestId?: string;
  shipToNumber: string;
  branchNumber: string;
  purpose: string;
  lines: Array<{
    id: string;
    itemNumber: string;
    quantity: number;
    uom?: string;
    unitPrice: number;
    currency?: { code?: string; symbol?: string };
    status?: { code?: string; message?: string };
  }>;
};

const ABC_INTERNAL_SCOPES = [
  "location.read",
  "product.read",
  "account.read",
  "pricing.read",
  "allOrder.read",
  "order.write",
  "notification.read",
  "notification.write",
  "invoice.read",
  "invoice.history.read",
] as const;

let tokenCache: { value: string; expiresAt: number; environment: string } | null = null;

async function getAccessToken(forceRefresh = false) {
  const config = getAbcInternalConfig();
  if (!forceRefresh && tokenCache?.environment === config.environment && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value;

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: ABC_INTERNAL_SCOPES.join(" ") }),
  });
  const payload = await response.json().catch(() => null) as { access_token?: string; expires_in?: number } | null;
  if (!response.ok || !payload?.access_token) throw new Error("ABC automatic authorization is temporarily unavailable.");

  tokenCache = {
    value: payload.access_token,
    expiresAt: Date.now() + Math.max(Number(payload.expires_in || 1800) - 30, 30) * 1000,
    environment: config.environment,
  };
  return tokenCache.value;
}

async function abcRequest(path: string, init: RequestInit) {
  const config = getAbcInternalConfig();
  async function execute(forceRefresh = false) {
    const token = await getAccessToken(forceRefresh);
    return fetch(`${config.apiBaseUrl}${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json", ...init.headers },
    });
  }

  let response = await execute();
  if (response.status === 401) response = await execute(true);
  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const detail = response.status === 403
      ? "ABC has not granted the required automatic API permission."
      : response.status === 400
        ? "ABC rejected the account, branch, or product details."
        : `ABC is temporarily unavailable (HTTP ${response.status}).`;
    throw new Error(detail);
  }
  return payload;
}

export function parseAbcAccounts(payload: unknown) {
  if (!payload || typeof payload !== "object") throw new Error("ABC returned an unexpected account response.");
  const root = payload as Record<string, unknown>;
  const nested = root.data && typeof root.data === "object" ? root.data as Record<string, unknown> : null;
  const shipTos = root.shipTos ?? root.accounts ?? nested?.shipTos ?? nested?.accounts;
  if (!Array.isArray(shipTos)) throw new Error("ABC returned an unexpected account response.");

  return shipTos.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const account = entry as Record<string, unknown>;
    const number = String(account.number || account.shipToNumber || "").trim();
    const rawBranches = account.branches ?? account.branchAccess;
    const branches = Array.isArray(rawBranches) ? rawBranches.flatMap((entryBranch) => {
      if (!entryBranch || typeof entryBranch !== "object") return [];
      const branch = entryBranch as Record<string, unknown>;
      const branchNumber = String(branch.number || branch.branchNumber || "").trim();
      if (!branchNumber) return [];
      return [{
        number: branchNumber,
        name: String(branch.name || branch.branchName || `Branch ${branchNumber}`),
        status: String(branch.status || ""),
        homeBranch: Boolean(branch.homeBranch || branch.isHomeBranch),
        city: "",
        state: "",
        postal: "",
        addressLine1: "",
        phone: "",
        website: "",
      }];
    }) : [];
    if (!number || branches.length === 0) return [];
    return [{ name: String(account.name || account.shipToName || `Ship-to ${number}`), number, status: String(account.status || ""), branches }];
  });
}

export function parseAbcBranch(payload: unknown): AbcBranchDetails | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const branch = root.branch && typeof root.branch === "object" ? root.branch as Record<string, unknown> : root;
  const address = root.address && typeof root.address === "object" ? root.address as Record<string, unknown> : {};
  const contact = root.contact && typeof root.contact === "object" ? root.contact as Record<string, unknown> : {};
  const links = root.links && typeof root.links === "object" ? root.links as Record<string, unknown> : {};
  const phones = Array.isArray(contact.phones) ? contact.phones : [];
  const number = String(branch.number || branch.branchNumber || "").trim();
  if (!number) return null;
  return {
    number,
    name: String(branch.name || branch.branchName || `ABC Supply branch ${number}`),
    status: String(branch.status || ""),
    city: String(address.city || ""),
    state: String(address.state || ""),
    postal: String(address.postal || ""),
    addressLine1: String(address.addressLine1 || ""),
    phone: String(phones[0] || ""),
    website: String(links.website || ""),
  };
}

export function parseAbcBranches(payload: unknown) {
  const entries = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { branches?: unknown }).branches)
      ? (payload as { branches: unknown[] }).branches
      : [];
  return entries.flatMap((entry) => {
    const branch = parseAbcBranch(entry);
    return branch ? [branch] : [];
  });
}

export function parseAbcCatalogItems(payload: unknown, selectedBranch: string, branchFiltered = false): AbcCatalogItem[] {
  if (!payload || typeof payload !== "object") throw new Error("ABC returned an unexpected product-search response.");
  const items = (payload as { items?: unknown }).items;
  if (!Array.isArray(items)) throw new Error("ABC returned an unexpected product-search response.");

  return items.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const itemNumber = String(item.itemNumber || "").trim();
    if (!itemNumber) return [];
    const rawUoms = Array.isArray(item.uoms) ? item.uoms.flatMap((entryUom) => {
      if (!entryUom || typeof entryUom !== "object") return [];
      const uom = entryUom as Record<string, unknown>;
      const code = String(uom.code || "").trim();
      if (!code) return [];
      return [{ code, name: String(uom.name || code), description: String(uom.description || "") }];
    }) : [];
    const uomsByCode = new Map<string, (typeof rawUoms)[number]>();
    for (const uom of rawUoms) {
      const key = uom.code.toUpperCase();
      const current = uomsByCode.get(key);
      if (!current || uom.description.toLowerCase() === "stocking") uomsByCode.set(key, uom);
    }
    const uoms = [...uomsByCode.values()]
      .sort((a, b) => Number(b.description.toLowerCase() === "stocking") - Number(a.description.toLowerCase() === "stocking"));
    const branches = Array.isArray(item.branches) ? item.branches : [];
    const availableAtSelectedBranch = branchFiltered || branches.some((entryBranch) => {
      if (!entryBranch || typeof entryBranch !== "object") return false;
      const branch = entryBranch as Record<string, unknown>;
      return String(branch.number || branch.branchNumber || "") === selectedBranch;
    });
    const color = item.color && typeof item.color === "object" ? item.color as Record<string, unknown> : {};
    const images = Array.isArray(item.images) ? item.images : [];
    const primaryImage = images.find((image) => image && typeof image === "object" && String((image as Record<string, unknown>).type || "").toLowerCase().includes("primary"));
    const variations = Array.isArray(item.variations) ? item.variations.flatMap((entryVariation) => {
      if (!entryVariation || typeof entryVariation !== "object") return [];
      const variation = entryVariation as Record<string, unknown>;
      const value = Number(variation.value ?? variation.length);
      const uom = String(variation.uom || variation.unit || "").trim();
      return Number.isFinite(value) && value > 0 && uom ? [{ value, uom }] : [];
    }) : [];

    return [{
      itemNumber,
      itemDescription: String(item.itemDescription || item.description || itemNumber),
      familyName: String(item.familyName || ""),
      status: String(item.status || ""),
      isDimensional: Boolean(item.isDimensional),
      color: String(color.name || ""),
      imageUrl: primaryImage && typeof primaryImage === "object" ? String((primaryImage as Record<string, unknown>).href || "") : "",
      uoms,
      variations,
      availableAtSelectedBranch,
    }];
  });
}

export async function searchAbcInternalAccountAccess() {
  const payload = await abcRequest("/api/account/v1/search/accounts", {
    method: "POST",
    body: JSON.stringify({
      filters: [
        { key: "accountType", condition: "equals", values: ["Ship-to"], joinCondition: "and" },
        { key: "storefront", condition: "equals", values: ["abc"] },
      ],
      pagination: { itemsPerPage: 100, pageNumber: 1 },
    }),
  });
  return parseAbcAccounts(payload);
}

export async function searchAbcInternalAccounts() {
  const accounts = await searchAbcInternalAccountAccess();
  const branchNumbers = [...new Set(accounts.flatMap((account) => account.branches.map((branch: { number: string }) => branch.number)))];
  const details = await Promise.all(branchNumbers.map(async (number) => {
    try {
      const result = await abcRequest(`/api/location/v1/branches/${encodeURIComponent(number)}`, { method: "GET" });
      return parseAbcBranch(result);
    } catch {
      return null;
    }
  }));
  const detailsByNumber = new Map(details.flatMap((branch) => branch ? [[branch.number, branch]] : []));
  return accounts.map((account) => ({
    ...account,
    branches: account.branches.map((branch: Record<string, unknown>) => ({ ...branch, ...(detailsByNumber.get(String(branch.number)) || {}) })),
  }));
}

export async function searchAbcInternalBranches(state: string) {
  const payload = await abcRequest(`/api/location/v1/branches?state=${encodeURIComponent(state)}`, { method: "GET" });
  return parseAbcBranches(payload);
}

export async function searchAbcInternalItems(query: string, branchNumber: string) {
  const itemNumberSearch = /^[A-Za-z0-9._/-]+$/.test(query) && /\d/.test(query);
  const payload = await abcRequest("/api/product/v1/search/items?familyItems=false", {
    method: "POST",
    body: JSON.stringify({
      filters: [
        {
          key: itemNumberSearch ? "itemNumber" : "itemDescription",
          condition: "contains",
          values: [query],
          joinCondition: "and",
        },
        {
          key: "branchNumber",
          condition: "equals",
          values: [branchNumber],
          joinCondition: null,
        },
      ],
      // The branchNumber filter already limits the response to items offered by
      // this branch. ABC warns that embedding branch availability can
      // materially slow this endpoint, so only request dimensional variations.
      embed: ["variations"],
      pagination: { itemsPerPage: 12, pageNumber: 1 },
    }),
  });
  return parseAbcCatalogItems(payload, branchNumber, true);
}

export async function priceAbcInternalItems(request: {
  requestId: string;
  shipToNumber: string;
  branchNumber: string;
  purpose: "estimating" | "quoting" | "ordering";
  lines: AbcPricingLineRequest[];
}) {
  const payload = await abcRequest("/api/pricing/v2/prices", { method: "POST", body: JSON.stringify(request) });
  if (!payload || typeof payload !== "object" || !("lines" in payload) || !Array.isArray((payload as { lines?: unknown }).lines)) {
    throw new Error("ABC returned an unexpected pricing response.");
  }
  return payload as AbcPricingResponse;
}
