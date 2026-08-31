import type {
  ProviderPriceObservation,
  ProviderProduct,
} from "@/lib/aura/material-providers/types";

const IDENTIFIER_KEYS = ["model", "sku", "upc", "manufacturerPartNumber"] as const;

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function validDate(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export type SafeProviderProduct = ProviderProduct & {
  confidence: "Needs Confirmation" | "Likely Match" | "Exact Match";
};

/**
 * External data is untrusted input. This gate strips impossible confidence and
 * refuses results that cannot retain identity, provenance, and retrieval time.
 */
export function acceptProviderProduct(
  product: ProviderProduct,
  now = new Date(),
): SafeProviderProduct | null {
  const retrievedAt = validDate(product.retrievedAt);
  if (
    !product.provider.trim() ||
    !product.externalId.trim() ||
    !product.name.trim() ||
    !isHttpsUrl(product.sourceUrl) ||
    retrievedAt === null ||
    retrievedAt > now.getTime() + 5 * 60_000
  ) return null;

  const hasStableIdentifier = IDENTIFIER_KEYS.some((key) =>
    Boolean(product[key]?.trim()),
  );
  const confidence = product.confidence === "Exact Match" && !hasStableIdentifier
    ? "Likely Match"
    : product.confidence === "Exact Match" || product.confidence === "Likely Match"
      ? product.confidence
      : "Needs Confirmation";

  return { ...product, confidence };
}

export type PriceObservationState =
  | { status: "current"; observation: ProviderPriceObservation }
  | { status: "expired"; observation: ProviderPriceObservation }
  | { status: "rejected"; reason: string };

/** Prices are observations, never product fields. Invalid or future-dated data
 * fails closed. Expired data remains historical evidence but is never current. */
export function classifyPriceObservation(
  observation: ProviderPriceObservation,
  now = new Date(),
): PriceObservationState {
  const checkedAt = validDate(observation.checkedAt);
  const expiresAt = validDate(observation.expiresAt);
  if (!Number.isFinite(observation.price) || observation.price < 0)
    return { status: "rejected", reason: "invalid_price" };
  if (!observation.vendor.trim() || !observation.unit.trim() || observation.packageQuantity <= 0)
    return { status: "rejected", reason: "missing_scope" };
  if (!isHttpsUrl(observation.sourceUrl))
    return { status: "rejected", reason: "invalid_source" };
  if (checkedAt === null || expiresAt === null || checkedAt > now.getTime() + 5 * 60_000)
    return { status: "rejected", reason: "invalid_timestamp" };
  if (observation.visibility === "private" && !observation.safeAccountReference?.trim())
    return { status: "rejected", reason: "private_price_missing_safe_account_reference" };
  if (expiresAt <= now.getTime()) return { status: "expired", observation };
  return { status: "current", observation };
}

function tokens(value: string) {
  return new Set(value.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

/** Ranking is relevance-only. It never labels a product popular or compatible. */
export function rankProviderProducts(query: string, products: ProviderProduct[]) {
  const queryTokens = tokens(query);
  return products
    .map((candidate) => acceptProviderProduct(candidate))
    .filter((candidate): candidate is SafeProviderProduct => Boolean(candidate))
    .map((candidate) => {
      const searchable = tokens([
        candidate.name,
        candidate.genericProductName,
        candidate.manufacturer,
        candidate.brand,
        candidate.model,
        candidate.sku,
        candidate.upc,
        candidate.manufacturerPartNumber,
      ].filter(Boolean).join(" "));
      const overlap = [...queryTokens].filter((token) => searchable.has(token)).length;
      const exactIdentifier = IDENTIFIER_KEYS.some((key) =>
        candidate[key] && query.toLowerCase().includes(candidate[key]!.toLowerCase()),
      );
      return { candidate, score: overlap + (exactIdentifier ? 100 : 0) };
    })
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name));
}
