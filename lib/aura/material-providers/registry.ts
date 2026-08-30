import "server-only";

import { HandoffProvider } from "@/lib/aura/material-providers/handoff";
import type {
  MaterialProductProvider,
  ProviderLocation,
  ProviderProduct,
  ProviderResult,
} from "@/lib/aura/material-providers/types";

const providers: MaterialProductProvider[] = [new HandoffProvider()];

export function materialProviderStatus() {
  return providers.map((provider) => ({
    id: provider.id,
    enabled: provider.enabled,
  }));
}

export async function searchAuthorizedMaterialProviders(
  query: string,
  location?: ProviderLocation,
): Promise<ProviderResult<ProviderProduct[]>> {
  const active = providers.filter((provider) => provider.enabled);
  if (!active.length)
    return {
      ok: false,
      code: "manager_review",
      provider: "none",
      message:
        "No authorized external catalog provider is enabled. Use the Common Materials Map and route exact product verification to a manager.",
    };
  for (const provider of active) {
    const result = await provider.searchProducts(query, location);
    if (result.ok && result.data.length) return result;
  }
  return {
    ok: false,
    code: "manager_review",
    provider: "none",
    message: "No authorized provider returned a verified result.",
  };
}
