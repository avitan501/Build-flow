import "server-only";

import type {
  MaterialProductProvider,
  ProviderLocation,
  ProviderProduct,
  ProviderResult,
} from "@/lib/aura/material-providers/types";
import { acceptProviderProduct, rankProviderProducts } from "@/lib/aura/material-providers/safety";

const LOWES_API_ORIGIN = "https://apis-b2b.lowes.com";
const LOWES_API_BASE = `${LOWES_API_ORIGIN}/lowesx-marketplace-gateway`;

type UnknownRecord = Record<string, unknown>;
function record(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : null;
}
function text(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function records(value: unknown): UnknownRecord[] {
  if (Array.isArray(value)) return value.map(record).filter((item): item is UnknownRecord => Boolean(item));
  const source = record(value);
  if (!source) return [];
  for (const key of ["items", "products", "results", "data"]) {
    const nested = source[key];
    if (Array.isArray(nested)) return records(nested);
    const nestedRecord = record(nested);
    if (nestedRecord) {
      const found = records(nestedRecord);
      if (found.length) return found;
    }
  }
  return [];
}

function credentials() {
  const enabled = process.env.AURA_LOWES_PRODUCT_API_ENABLED === "true";
  const approved = process.env.AURA_LOWES_PRODUCT_API_ACCESS_APPROVED === "true";
  const clientId = process.env.AURA_LOWES_PRODUCT_API_CLIENT_ID?.trim();
  const token = process.env.AURA_LOWES_PRODUCT_API_ACCESS_TOKEN?.trim();
  return { enabled, approved, clientId, token };
}

function unavailable<T>(): ProviderResult<T> {
  const config = credentials();
  return {
    ok: false,
    code: !config.enabled || !config.approved ? "provider_disabled" : "credentials_missing",
    provider: "lowes_official",
    message: "Lowe's Product Catalog API remains disabled until Avantia's organization/app is approved and server-side X-Client-Id and bearer credentials are installed.",
  };
}

function mapProduct(item: UnknownRecord, location?: ProviderLocation): ProviderProduct | null {
  const externalId = text(item.omniItemId) ?? text(item.product_id) ?? text(item.itemNumber) ?? text(item.item_number);
  const name = text(item.title) ?? text(item.name) ?? text(item.description);
  const sourceUrl = text(item.pdpUrl) ?? text(item.pdp_url) ?? text(item.productUrl);
  if (!externalId || !name || !sourceUrl) return null;
  return acceptProviderProduct({
    provider: "lowes_official",
    externalId,
    name,
    genericProductName: text(item.productCategory) ?? text(item.product_category),
    manufacturer: text(item.manufacturer),
    brand: text(item.brand),
    model: text(item.modelNumber) ?? text(item.model_number),
    sku: text(item.itemNumber) ?? text(item.item_number),
    upc: text(item.gtin) ?? text(item.upc),
    manufacturerPartNumber: text(item.mpn),
    specifications: (record(item.specifications) as Record<string, string | number | boolean> | null) ?? {},
    images: [text(item.primaryImageUrl) ?? text(item.primary_image_url), ...(Array.isArray(item.additionalImageUrls) ? item.additionalImageUrls.map(text) : [])].filter((url): url is string => Boolean(url)),
    sourceUrl,
    retrievedAt: new Date().toISOString(),
    location,
    confidence: externalId && (text(item.modelNumber) || text(item.model_number) || text(item.gtin)) ? "Exact Match" : "Likely Match",
  });
}

export class LowesOfficialProvider implements MaterialProductProvider {
  readonly id = "lowes_official";
  readonly enabled = Boolean(credentials().enabled && credentials().approved && credentials().clientId && credentials().token);

  private async request(path: string, init?: RequestInit): Promise<ProviderResult<unknown>> {
    const config = credentials();
    if (!this.enabled || !config.clientId || !config.token) return unavailable();
    const url = new URL(`${LOWES_API_BASE}${path}`);
    if (url.origin !== LOWES_API_ORIGIN) return { ok: false, code: "not_supported", provider: this.id, message: "Rejected a non-Lowe's API origin." };
    const response = await fetch(url, {
      ...init,
      headers: {
        "X-Client-Id": config.clientId,
        Authorization: `Bearer ${config.token}`,
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return { ok: false, code: "manager_review", provider: this.id, message: `Lowe's official API returned HTTP ${response.status}; no product or price claim was saved.` };
    return { ok: true, provider: this.id, data: await response.json() };
  }

  async searchProducts(query: string, location?: ProviderLocation): Promise<ProviderResult<ProviderProduct[]>> {
    if (!query.trim()) return { ok: false, code: "not_supported", provider: this.id, message: "A product search term is required." };
    const params = new URLSearchParams({ site: "LOWES", searchTerms: query.trim(), showProdSpecs: "true", maxResults: "12" });
    if (location?.storeId) params.set("storeNumber", location.storeId);
    if (location?.zipCode) params.set("zipCode", location.zipCode);
    const response = await this.request(`/api/v1/search/items?${params}`);
    if (!response.ok) return response;
    const products = records(response.data).map((item) => mapProduct(item, location)).filter((item): item is ProviderProduct => Boolean(item));
    return { ok: true, provider: this.id, data: rankProviderProducts(query, products).slice(0, 4).map((result) => result.candidate) };
  }

  async getProductDetails(externalId: string, location?: ProviderLocation): Promise<ProviderResult<ProviderProduct>> {
    const response = await this.request("/api/v1/products/details", { method: "POST", body: JSON.stringify({ omniItemId: externalId, storeId: location?.storeId, zipCode: location?.zipCode }) });
    if (!response.ok) return response;
    const candidate = records(response.data)[0] ?? record(response.data);
    const product = candidate ? mapProduct(candidate, location) : null;
    return product ? { ok: true, provider: this.id, data: product } : { ok: false, code: "manager_review", provider: this.id, message: "Lowe's response did not contain a safely attributable product." };
  }

  async getCurrentPrice() { return unavailable<never[]>(); }
  async getAvailability() { return unavailable<never>(); }
  async getAlternatives() { return unavailable<never[]>(); }
  async getSourceLink(externalId: string): Promise<ProviderResult<string>> {
    if (!/^\d+$/.test(externalId)) return { ok: false as const, code: "not_supported" as const, provider: this.id, message: "A Lowe's omni item ID is required." };
    return { ok: true as const, provider: this.id, data: `https://www.lowes.com/pd/${encodeURIComponent(externalId)}` };
  }
}
