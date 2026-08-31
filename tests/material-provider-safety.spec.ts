import { expect, test } from "@playwright/test";

import {
  acceptProviderProduct,
  classifyPriceObservation,
  rankProviderProducts,
} from "../lib/aura/material-providers/safety";
import type {
  ProviderPriceObservation,
  ProviderProduct,
} from "../lib/aura/material-providers/types";

function product(overrides: Partial<ProviderProduct> = {}): ProviderProduct {
  return {
    provider: "lowes_official",
    externalId: "501",
    name: "Square D 20 Amp Single Pole Breaker",
    brand: "Square D",
    specifications: {},
    images: [],
    sourceUrl: "https://www.lowes.com/pd/501",
    retrievedAt: "2026-08-31T01:00:00.000Z",
    confidence: "Exact Match",
    ...overrides,
  };
}

function observation(overrides: Partial<ProviderPriceObservation> = {}): ProviderPriceObservation {
  return {
    provider: "lowes_official",
    externalId: "501",
    vendor: "Lowe's",
    price: 18.5,
    currency: "USD",
    unit: "each",
    packageQuantity: 1,
    visibility: "public",
    availability: "unknown",
    checkedAt: "2026-08-31T12:00:00.000Z",
    expiresAt: "2026-09-01T12:00:00.000Z",
    sourceUrl: "https://www.lowes.com/pd/501",
    managerApprovalRequired: true,
    ...overrides,
  };
}

const now = new Date("2026-08-31T13:00:00.000Z");

test("an exact label is downgraded without a stable product identifier", () => {
  expect(acceptProviderProduct(product(), now)?.confidence).toBe("Likely Match");
  expect(acceptProviderProduct(product({ model: "HOM120" }), now)?.confidence).toBe("Exact Match");
});

test("unattributed or future external products fail closed", () => {
  expect(acceptProviderProduct(product({ sourceUrl: "http://example.com/item" }), now)).toBeNull();
  expect(acceptProviderProduct(product({ retrievedAt: "2026-09-02T12:00:00.000Z" }), now)).toBeNull();
});

test("expired and private prices can never masquerade as current public prices", () => {
  expect(classifyPriceObservation(observation(), now).status).toBe("current");
  expect(classifyPriceObservation(observation({ expiresAt: "2026-08-31T12:30:00.000Z" }), now).status).toBe("expired");
  expect(classifyPriceObservation(observation({ visibility: "private" }), now)).toEqual({
    status: "rejected",
    reason: "private_price_missing_safe_account_reference",
  });
});

test("candidate ranking is relevance-only and prioritizes an exact identifier", () => {
  const ranked = rankProviderProducts("HOM120 breaker", [
    product({ externalId: "1", model: "HOM115", name: "Square D 15 Amp Breaker" }),
    product({ externalId: "2", model: "HOM120" }),
  ]);
  expect(ranked[0]?.candidate.externalId).toBe("2");
  expect(ranked[0]?.score).toBeGreaterThan(100);
});
