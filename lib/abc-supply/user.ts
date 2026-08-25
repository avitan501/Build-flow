import "server-only";

import { getAbcSupplyConfig } from "@/lib/abc-supply/config";
import { getAbcUserAccessToken } from "@/lib/abc-supply/connections";
import {
  parseAbcAccounts,
  parseAbcBranch,
  parseAbcCatalogItems,
} from "@/lib/abc-supply/internal";

async function abcUserRequest(userId: string, path: string, init: RequestInit) {
  async function execute(forceRefresh = false) {
    const token = await getAbcUserAccessToken(userId, forceRefresh);
    return fetch(`${getAbcSupplyConfig().apiBaseUrl}${path}`, {
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
    const detail = response.status === 401
      ? "Reconnect myABCsupply."
      : response.status === 403
        ? "The connected ABC account did not grant this permission."
        : response.status === 400
          ? "ABC rejected the account, branch, product, unit, or quantity."
          : `ABC is temporarily unavailable (HTTP ${response.status}).`;
    throw new Error(detail);
  }
  return payload;
}

export async function searchAbcUserAccountAccess(userId: string) {
  const payload = await abcUserRequest(userId, "/api/account/v1/search/accounts", {
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

export async function searchAbcUserAccounts(userId: string) {
  const accounts = await searchAbcUserAccountAccess(userId);
  const branchNumbers = [...new Set(accounts.flatMap((account) => account.branches.map((branch: { number: string }) => branch.number)))];
  const details = await Promise.all(branchNumbers.map(async (number) => {
    try {
      return parseAbcBranch(await abcUserRequest(userId, `/api/location/v1/branches/${encodeURIComponent(number)}`, { method: "GET" }));
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

export async function searchAbcUserItems(userId: string, query: string, branchNumber: string) {
  const itemNumberSearch = /^[A-Za-z0-9._/-]+$/.test(query) && /\d/.test(query);
  const payload = await abcUserRequest(userId, "/api/product/v1/search/items", {
    method: "POST",
    body: JSON.stringify({
      filters: [
        { key: itemNumberSearch ? "itemNumber" : "itemDescription", condition: "contains", values: [query], joinCondition: "and" },
        { key: "branchNumber", condition: "equals", values: [branchNumber], joinCondition: null },
      ],
      embed: ["branches", "variations"],
      pagination: { itemsPerPage: 24, pageNumber: 1 },
    }),
  });
  return parseAbcCatalogItems(payload, branchNumber);
}

export async function priceAbcUserItems(userId: string, request: Record<string, unknown>) {
  const payload = await abcUserRequest(userId, "/api/pricing/v2/prices", { method: "POST", body: JSON.stringify(request) });
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { lines?: unknown }).lines)) {
    throw new Error("ABC returned an unexpected pricing response.");
  }
  return payload as {
    lines: Array<{ itemNumber: string; quantity: number; uom?: string; unitPrice: number; currency?: { code?: string; symbol?: string }; status?: { code?: string; message?: string } }>;
  };
}
