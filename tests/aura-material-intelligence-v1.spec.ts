import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  assessMaterialRequest,
  oneQuestionOnly,
  type CommonMaterialDefinition,
} from "../lib/aura/material-intelligence";

const root = process.cwd();

function definition(
  overrides: Partial<CommonMaterialDefinition> = {},
): CommonMaterialDefinition {
  return {
    key: "breaker",
    stage: "rough-in",
    department: "Electrical",
    category: "Breakers",
    genericProduct: "residential circuit breaker",
    commonSpecification: {},
    requiredAttributes: ["panel_manufacturer", "amperage", "poles", "quantity"],
    optionalAttributes: [],
    compatibilityBlockers: ["panel_manufacturer"],
    synonyms: ["breaker", "breakers"],
    commonUnit: "each",
    commonUse: "residential electrical panel",
    region: "Long Island, NY",
    firstBlockerAttribute: "panel_manufacturer",
    firstQuestion: "What panel brand do you have?",
    confidenceLabel: "Common Industry Default",
    evidenceConfidence: 0,
    lastReviewedAt: null,
    managerApproved: false,
    alternatives: [],
    evidenceSources: [],
    ...overrides,
  };
}

test("shadow material intelligence remembers supplied specs and asks one blocker", () => {
  const result = assessMaterialRequest(
    "Need 10 Square D 20A single-pole breakers",
    [definition()],
  );

  expect(result.knownSpecifications.panel_manufacturer).toMatch(/Square D/i);
  expect(result.knownSpecifications.amperage).toBe("20");
  expect(result.knownSpecifications.poles).toBe("single");
  expect(result.knownSpecifications.quantity).toBe("10");
  expect(result.nextQuestion).toBeNull();
  expect(result.mode).toBe("shadow_draft_only");
  expect(result.confidence).toBe("Needs Confirmation");
});

test("20A is not misread as a quantity and partial words do not match", () => {
  const breaker = assessMaterialRequest("Square D 20A breaker", [definition()]);
  const falseMatch = assessMaterialRequest("my icebreaker idea", [
    definition(),
  ]);

  expect(breaker.knownSpecifications.quantity).toBeUndefined();
  expect(breaker.missingBlocker).toBe("poles");
  expect(falseMatch.source).toBe("no_match");
});

test("generic common-map evidence can be likely but never exact", () => {
  const result = assessMaterialRequest("10 Square D 20A single-pole breakers", [
    definition({
      managerApproved: true,
      evidenceConfidence: 0.9,
      lastReviewedAt: "2026-08-30",
      evidenceSources: [
        {
          publisher: "Manager",
          internalReference: "approved-fixture",
          supportsClaim: "Reviewed generic default",
        },
      ],
      confidenceLabel: "Exact Match",
    }),
  ]);

  expect(result.confidence).toBe("Likely Match");
});

test("only the first question is allowed", () => {
  expect(oneQuestionOnly("What brand? What size? What quantity?")).toBe(
    "What brand?",
  );
});

test("production v1 is draft-only and Handoff fails closed", async () => {
  const [migration, handoff] = await Promise.all([
    readFile(
      path.join(
        root,
        "supabase/migrations/20260830213000_aura_material_intelligence_v1.sql",
      ),
      "utf8",
    ),
    readFile(path.join(root, "lib/aura/material-providers/handoff.ts"), "utf8"),
  ]);

  expect(migration).toContain("common_map_status");
  expect(migration).toContain("draft_seed");
  expect(migration).toContain("draft_only boolean not null default true");
  expect(migration.toLowerCase()).not.toContain("delete from public");
  expect(handoff).toContain("readonly enabled = false");
  expect(handoff).not.toContain("fetch(");
});
