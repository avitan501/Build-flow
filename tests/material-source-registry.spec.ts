import { expect, test } from "@playwright/test";

import {
  MATERIAL_SOURCE_REGISTRY,
  MATERIAL_EVIDENCE_CONFIDENCE_RULES,
  enabledMaterialSources,
  materialSourceById,
  sourceMaySupplyDatedPriceObservation,
  sourcesWithCapability,
} from "../lib/material-intelligence/source-registry";

test("unlicensed providers fail closed and do not claim live access", () => {
  for (const id of ["handoff", "home_depot_official", "lowes_official", "authorized_supplier", "dds", "idea_connector", "tra_ser"] as const) {
    const source = materialSourceById(id);
    expect(source).toBeTruthy();
    expect(source?.enabledByDefault).toBe(false);
    expect(source?.liveAccessConfirmed).toBe(false);
    expect(sourceMaySupplyDatedPriceObservation(source!)).toBe(false);
  }
});

test("classification sources cannot be used as price feeds", () => {
  for (const id of ["etim", "unspsc"] as const) {
    const source = materialSourceById(id)!;
    expect(source.capabilities).toContain("classification");
    expect(source.capabilities).not.toContain("public_price");
    expect(source.capabilities).not.toContain("private_price");
    expect(sourceMaySupplyDatedPriceObservation(source)).toBe(false);
  }
});

test("every external candidate carries primary documentation metadata", () => {
  const external = MATERIAL_SOURCE_REGISTRY.filter((source) =>
    !["authorized_supplier", "official_manufacturer", "approved_supplier_document", "avantia_history"].includes(source.id),
  );
  for (const source of external) {
    expect(source.documentation.length).toBeGreaterThan(0);
    for (const document of source.documentation) {
      expect(document.url).toMatch(/^https:\/\//);
      expect(document.publisher.length).toBeGreaterThan(1);
      expect(document.supports.length).toBeGreaterThan(10);
    }
  }
});

test("supplier documents are scoped observations rather than universal current prices", () => {
  const source = materialSourceById("approved_supplier_document")!;
  expect(sourceMaySupplyDatedPriceObservation(source)).toBe(true);
  expect(source.priceRule).toContain("expiration");
  expect(source.priceRule).toContain("manager approval");
});

test("evidence rules keep common, likely, and exact claims separate", () => {
  expect(MATERIAL_EVIDENCE_CONFIDENCE_RULES.map((rule) => rule.confidence)).toEqual([
    "Exact Match",
    "Likely Match",
    "Common Industry Default",
    "Common Local Choice",
    "Common for Avantia",
  ]);
  for (const rule of MATERIAL_EVIDENCE_CONFIDENCE_RULES) {
    expect(rule.minimumEvidence.length).toBeGreaterThan(20);
    expect(rule.neverProves.length).toBeGreaterThan(20);
    expect(rule.eligibleSourceIds.length).toBeGreaterThan(0);
  }
});

test("default registry contains only controlled public or internal evidence", () => {
  expect(enabledMaterialSources().map((source) => source.id)).toEqual([
    "official_manufacturer",
    "etim",
    "unspsc",
    "approved_supplier_document",
    "avantia_history",
  ]);
  expect(sourcesWithCapability("private_price").map((source) => source.id)).toEqual([
    "lowes_official",
    "authorized_supplier",
    "approved_supplier_document",
  ]);
});

test("official retailer paths retain their real external approval boundary", () => {
  const homeDepot = materialSourceById("home_depot_official")!;
  const lowes = materialSourceById("lowes_official")!;
  const handoff = materialSourceById("handoff")!;
  expect(homeDepot.documentation[0]?.url).toContain("homedepot.com");
  expect(homeDepot.licenseOrAccessRequirement).toContain("Impact");
  expect(lowes.documentation.some((entry) => entry.url === "https://developer.lowes.com/")).toBe(true);
  expect(lowes.licenseOrAccessRequirement).toContain("X-Client-Id");
  expect(handoff.documentation.some((entry) => entry.supports.includes("does not currently offer an API"))).toBe(true);
});
