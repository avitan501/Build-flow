import "server-only";

import { getAbcInternalConfig } from "@/lib/abc-supply/config";

type AbcPricingLineRequest = { id: string; itemNumber: string; quantity: number; uom?: string };
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

function parseAccounts(payload: unknown) {
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
      }];
    }) : [];
    if (!number || branches.length === 0) return [];
    return [{ name: String(account.name || account.shipToName || `Ship-to ${number}`), number, status: String(account.status || ""), branches }];
  });
}

export async function searchAbcInternalAccounts() {
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
  return parseAccounts(payload);
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
