import "server-only";

import { HandoffProvider } from "@/lib/aura/material-providers/handoff";
import { HomeDepotOfficialProvider } from "@/lib/aura/material-providers/home-depot";
import { LowesOfficialProvider } from "@/lib/aura/material-providers/lowes";
import type {
  MaterialProductProvider,
  ProviderLocation,
  ProviderProduct,
  ProviderResult,
} from "@/lib/aura/material-providers/types";
import {
  enabledMaterialSources,
  materialSourceById,
} from "@/lib/material-intelligence/source-registry";

const providers: MaterialProductProvider[] = [
  new HandoffProvider(),
  new HomeDepotOfficialProvider(),
  new LowesOfficialProvider(),
];

function providerPolicyId(provider: MaterialProductProvider) {
  if (provider.id === "handoff") return "handoff" as const;
  if (provider.id === "home_depot_official") return "home_depot_official" as const;
  if (provider.id === "lowes_official") return "lowes_official" as const;
  return "authorized_supplier" as const;
}

export function materialProviderStatus() {
  return providers.map((provider) => ({
    id: provider.id,
    enabled:
      provider.enabled &&
      materialSourceById(providerPolicyId(provider))?.liveAccessConfirmed === true,
  }));
}

export async function searchAuthorizedMaterialProviders(
  query: string,
  location?: ProviderLocation,
): Promise<ProviderResult<ProviderProduct[]>> {
  const active = providers.filter((provider) => {
    const policy = materialSourceById(providerPolicyId(provider));
    // Both the runtime adapter and reviewed source policy must be enabled. An
    // environment variable alone can never turn an unapproved provider live.
    return provider.enabled && policy?.liveAccessConfirmed === true;
  });
  if (!active.length)
    return {
      ok: false,
      code: "manager_review",
      provider: "none",
      message:
        `No authorized external catalog provider is enabled. Use ${enabledMaterialSources().map((source) => source.name).join(", ")} as evidence and route exact product verification to a manager.`,
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
