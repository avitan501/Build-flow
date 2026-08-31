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
      "Handoff is disabled because Handoff's official help center states that no API is currently available. Use its support channel if Avantia wants to request future partner access.",
  };
}

export class HandoffProvider implements MaterialProductProvider {
  readonly id = "handoff";
  // Handoff officially states that it currently has no API. Keep the
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
