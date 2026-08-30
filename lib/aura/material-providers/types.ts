import type { AuraConfidenceLabel } from "@/lib/aura/material-intelligence";

export type ProviderLocation = {
  zipCode?: string;
  storeId?: string;
  branchId?: string;
};
export type PriceVisibility = "public" | "private";

export type ProviderProduct = {
  provider: string;
  externalId: string;
  name: string;
  genericProductName?: string;
  manufacturer?: string;
  brand?: string;
  model?: string;
  sku?: string;
  upc?: string;
  manufacturerPartNumber?: string;
  specifications: Record<string, string | number | boolean>;
  images: string[];
  sourceUrl: string;
  retrievedAt: string;
  location?: ProviderLocation;
  confidence: AuraConfidenceLabel;
};

export type ProviderPriceObservation = {
  provider: string;
  externalId: string;
  vendor: string;
  price: number;
  currency: string;
  unit: string;
  packageQuantity: number;
  visibility: PriceVisibility;
  safeAccountReference?: string;
  availability: "available" | "unavailable" | "unknown";
  checkedAt: string;
  expiresAt: string;
  sourceUrl: string;
  managerApprovalRequired: true;
};

export type ProviderResult<T> =
  | { ok: true; data: T; provider: string }
  | {
      ok: false;
      code:
        | "provider_disabled"
        | "credentials_missing"
        | "not_supported"
        | "manager_review";
      provider: string;
      message: string;
    };

export interface MaterialProductProvider {
  readonly id: string;
  readonly enabled: boolean;
  searchProducts(
    query: string,
    location?: ProviderLocation,
  ): Promise<ProviderResult<ProviderProduct[]>>;
  getProductDetails(
    externalId: string,
    location?: ProviderLocation,
  ): Promise<ProviderResult<ProviderProduct>>;
  getCurrentPrice(
    externalId: string,
    location?: ProviderLocation,
    safeAccountReference?: string,
  ): Promise<ProviderResult<ProviderPriceObservation[]>>;
  getAvailability(
    externalId: string,
    location?: ProviderLocation,
  ): Promise<
    ProviderResult<{
      availability: "available" | "unavailable" | "unknown";
      checkedAt: string;
    }>
  >;
  getAlternatives(
    externalId: string,
    constraints: Record<string, string>,
    location?: ProviderLocation,
  ): Promise<ProviderResult<ProviderProduct[]>>;
  getSourceLink(
    externalId: string,
    location?: ProviderLocation,
  ): Promise<ProviderResult<string>>;
}
