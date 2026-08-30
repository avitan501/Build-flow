export const AURA_CONFIDENCE_LABELS = [
  "Common Industry Default",
  "Common Local Choice",
  "Common for Avantia",
  "Likely Match",
  "Exact Match",
  "Needs Confirmation",
] as const;

export type AuraConfidenceLabel = (typeof AURA_CONFIDENCE_LABELS)[number];

export type CommonMaterialDefinition = {
  key: string;
  stage: string;
  department: string;
  category: string;
  genericProduct: string;
  commonSpecification: Record<string, string>;
  requiredAttributes: string[];
  optionalAttributes: string[];
  compatibilityBlockers: string[];
  synonyms: string[];
  commonUnit: string;
  commonUse: string;
  region: string;
  firstBlockerAttribute: string;
  firstQuestion: string;
  confidenceLabel: AuraConfidenceLabel;
  evidenceConfidence: number;
  lastReviewedAt: string | null;
  managerApproved: boolean;
  alternatives: Array<{
    name: string;
    specification: Record<string, string>;
    useWhen: string;
  }>;
  evidenceSources: Array<{
    publisher: string;
    sourceUrl?: string;
    internalReference?: string;
    supportsClaim: string;
    verifiedAt?: string;
  }>;
};

export type MaterialIntelligenceAssessment = {
  customerWording: string;
  recognizedProduct: string | null;
  commonMaterialKey: string | null;
  department: string | null;
  knownSpecifications: Record<string, string>;
  missingBlocker: string | null;
  nextQuestion: string | null;
  confidence: AuraConfidenceLabel;
  source: "common_materials_map" | "no_match";
  mode: "shadow_draft_only";
};

const ATTRIBUTE_PATTERNS: Record<string, RegExp[]> = {
  quantity: [
    /(?:^|\s)(\d+(?:\.\d+)?)\s*(?:pcs?|pieces?|ea|each|sheets?|bags?|boxes?|rolls?|buckets?|bundles?|yards?|sq\.?\s*ft|sf|ft|feet|gallons?|gal)\b/i,
    /\b(?:need|want|send|order)\s+(\d+(?:\.\d+)?)\b/i,
  ],
  thickness: [
    /\b(1\s*\/\s*4|3\s*\/\s*8|1\s*\/\s*2|5\s*\/\s*8|3\s*\/\s*4)\s*(?:in(?:ch(?:es)?)?\.?|["”])?/i,
  ],
  sheet_size: [/\b(4\s*[x×]\s*(?:8|9|10|12))\b/i],
  dimensions: [
    /\b(\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?(?:\s*[x×]\s*\d+(?:\.\d+)?)?)\b/i,
  ],
  length: [/\b(\d+(?:\.\d+)?)\s*(ft|feet|foot|['’])\b/i],
  type: [
    /\b(regular|type\s*x|fire[- ]?rated|moisture[- ]?resistant|green\s*board|purple\s*board|architectural|3[- ]tab|interior|exterior|prehung|slab)\b/i,
  ],
  material: [
    /\b(wood|metal|pvc|cpvc|pex|copper|steel|cast\s*iron|abs|porcelain|ceramic|stone|vinyl|fiber\s*cement)\b/i,
  ],
  panel_manufacturer: [
    /\b(square\s*d|siemens|eaton|cutler[- ]hammer|ge|general\s*electric|homeline|q[o0])\b/i,
  ],
  amperage: [/\b(\d{1,3})\s*(?:a|amp|amps|ampere)s?\b/i],
  poles: [/\b(single|double|triple|1|2|3)[- ]?(?:pole|p)\b/i],
  gauge: [/\b(\d{1,2})\s*(?:ga\.?|gauge|awg)\b/i],
  diameter: [
    /\b(\d+(?:\s*\/\s*\d+)?|\d+\.\d+)\s*(?:in(?:ch(?:es)?)?\.?|["”])\s*(?:pipe|pvc|pex|copper)?\b/i,
  ],
  color_model: [
    /\b(?:oc|sw|hc|pm|sc)[- ]?\d{1,5}\b/i,
    /\b(white|black|gray|grey|beige|tan|brown|blue|green|red|cream|ivory)\b/i,
  ],
  finish: [/\b(flat|matte|eggshell|satin|semi[- ]gloss|gloss)\b/i],
  size: [/\b(\d{2,3}\s*[x×]\s*\d{2,3}|\d{4})\b/i],
  debris_type: [
    /\b(construction|demolition|concrete|brick|dirt|soil|roofing|shingles|wood|mixed|household)\b/i,
  ],
  size_yards: [/\b(10|12|15|20|30|40)\s*(?:yd|yard)s?\b/i],
  application: [
    /\b(floor|wall|shower|bathroom|kitchen|backsplash|indoor|interior|outdoor|exterior|pool|service|branch|feeder)\b/i,
  ],
};

function normalized(value: string) {
  return value.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
}

function findDefinition(
  value: string,
  definitions: CommonMaterialDefinition[],
) {
  const text = normalized(value);
  return (
    definitions
      .map((definition) => ({
        definition,
        score: definition.synonyms.reduce((score, synonym) => {
          const phrase = normalized(synonym).replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          );
          return (
            score +
            (new RegExp(`(?:^|[^a-z0-9])${phrase}(?:$|[^a-z0-9])`, "i").test(
              text,
            )
              ? phrase.length
              : 0)
          );
        }, 0),
      }))
      .filter((candidate) => candidate.score > 0)
      .sort((left, right) => right.score - left.score)[0]?.definition ?? null
  );
}

function extractKnown(value: string, definition: CommonMaterialDefinition) {
  const known: Record<string, string> = {};
  for (const attribute of [
    ...definition.requiredAttributes,
    ...definition.optionalAttributes,
  ]) {
    const match = (ATTRIBUTE_PATTERNS[attribute] ?? [])
      .map((pattern) => value.match(pattern))
      .find(Boolean);
    if (match?.[0]) known[attribute] = (match[1] || match[0]).trim();
  }
  return known;
}

export function assessMaterialRequest(
  value: string,
  definitions: CommonMaterialDefinition[],
): MaterialIntelligenceAssessment {
  const definition = findDefinition(value, definitions);
  if (!definition)
    return {
      customerWording: value,
      recognizedProduct: null,
      commonMaterialKey: null,
      department: null,
      knownSpecifications: {},
      missingBlocker: null,
      nextQuestion: null,
      confidence: "Needs Confirmation",
      source: "no_match",
      mode: "shadow_draft_only",
    };

  const knownSpecifications = extractKnown(value, definition);
  const missing = definition.requiredAttributes.filter(
    (attribute) => !knownSpecifications[attribute],
  );
  const missingBlocker = missing.includes(definition.firstBlockerAttribute)
    ? definition.firstBlockerAttribute
    : (missing[0] ?? null);
  const question = missingBlocker
    ? missingBlocker === definition.firstBlockerAttribute
      ? definition.firstQuestion
      : `What ${missingBlocker.replaceAll("_", " ")} do you need?`
    : null;
  const hasApprovedEvidence =
    definition.managerApproved &&
    definition.evidenceConfidence > 0 &&
    Boolean(definition.lastReviewedAt) &&
    definition.evidenceSources.length > 0;
  const evidenceGatedConfidence: AuraConfidenceLabel = !hasApprovedEvidence
    ? "Needs Confirmation"
    : definition.confidenceLabel === "Exact Match"
      ? "Likely Match"
      : definition.confidenceLabel;
  return {
    customerWording: value,
    recognizedProduct: definition.genericProduct,
    commonMaterialKey: definition.key,
    department: definition.department,
    knownSpecifications,
    missingBlocker,
    nextQuestion: question,
    // A synonym match cannot manufacture evidence. Unreviewed seeds remain
    // Needs Confirmation, and a generic map entry can never become an exact
    // SKU/model match without a verified provider or manufacturer identity.
    confidence: evidenceGatedConfidence,
    source: "common_materials_map",
    mode: "shadow_draft_only",
  };
}

export function oneQuestionOnly(value: string | null) {
  if (!value) return null;
  const first = value.match(/^[\s\S]*?\?/)?.[0]?.trim();
  return first || value.trim();
}
