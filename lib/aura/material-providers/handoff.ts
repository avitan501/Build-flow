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
    provider: "handoff",
    message:
      "Handoff Universal Catalog access is disabled until Handoff grants official server-to-server credentials and licensed API documentation.",
  };
}

export class HandoffProvider implements MaterialProductProvider {
  readonly id = "handoff";
  // Handoff currently has no public, licensed endpoint contract. Keep the
  // adapter visibly unavailable even if somebody accidentally adds a flag.
  readonly enabled = false;

  async searchProducts(_query: string, _location?: ProviderLocation) {
    return unavailable<never[]>();
  }
  async getProductDetails(_externalId: string, _location?: ProviderLocation) {
    return unavailable<never>();
  }
  async getCurrentPrice(
    _externalId: string,
    _location?: ProviderLocation,
    _safeAccountReference?: string,
  ) {
    return unavailable<never[]>();
  }
  async getAvailability(_externalId: string, _location?: ProviderLocation) {
    return unavailable<never>();
  }
  async getAlternatives(
    _externalId: string,
    _constraints: Record<string, string>,
    _location?: ProviderLocation,
  ) {
    return unavailable<never[]>();
  }
  async getSourceLink(_externalId: string, _location?: ProviderLocation) {
    return unavailable<string>();
  }
}
