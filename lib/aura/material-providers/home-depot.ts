import "server-only";

import type {
  MaterialProductProvider,
  ProviderLocation,
  ProviderResult,
} from "@/lib/aura/material-providers/types";

function unavailable<T>(): ProviderResult<T> {
  return {
    ok: false,
    code: "provider_disabled",
    provider: "home_depot_official",
    message: "Home Depot live catalog access is disabled. Avantia must first be accepted into the official Impact affiliate program and receive the licensed daily product feed.",
  };
}

/**
 * The official Home Depot path currently documented for Avantia is a licensed
 * affiliate data feed, not an anonymous product API. This adapter intentionally
 * has no network implementation: the eventual feed importer must be built from
 * the exact schema delivered after approval.
 */
export class HomeDepotOfficialProvider implements MaterialProductProvider {
  readonly id = "home_depot_official";
  readonly enabled = false;

  async searchProducts(_query: string, _location?: ProviderLocation) { return unavailable<never[]>(); }
  async getProductDetails(_externalId: string, _location?: ProviderLocation) { return unavailable<never>(); }
  async getCurrentPrice(_externalId: string, _location?: ProviderLocation, _safeAccountReference?: string) { return unavailable<never[]>(); }
  async getAvailability(_externalId: string, _location?: ProviderLocation) { return unavailable<never>(); }
  async getAlternatives(_externalId: string, _constraints: Record<string, string>, _location?: ProviderLocation) { return unavailable<never[]>(); }
  async getSourceLink(_externalId: string, _location?: ProviderLocation) { return unavailable<string>(); }
}
