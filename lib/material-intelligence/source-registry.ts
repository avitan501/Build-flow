export type MaterialSourceTier = 1 | 2 | 3 | 4 | 5;

export type MaterialSourceCapability =
  | "product_identity"
  | "technical_specifications"
  | "classification"
  | "synonyms"
  | "documents"
  | "images"
  | "alternatives"
  | "public_price"
  | "private_price"
  | "availability"
  | "local_commonality"
  | "avantia_commonality";

export type MaterialSourceAccess =
  | "disabled_pending_official_access"
  | "requires_contract"
  | "requires_supplier_authorization"
  | "public_reference"
  | "manager_approved_document"
  | "internal_aggregate";

export type MaterialEvidenceConfidence =
  | "Needs Confirmation"
  | "Likely Match"
  | "Common Industry Default"
  | "Common Local Choice"
  | "Common for Avantia"
  | "Exact Match";

export type MaterialSourceDocumentation = {
  title: string;
  publisher: string;
  url: string;
  supports: string;
};

export type MaterialSourceDefinition = {
  id:
    | "handoff"
    | "home_depot_official"
    | "lowes_official"
    | "authorized_supplier"
    | "dds"
    | "idea_connector"
    | "tra_ser"
    | "official_manufacturer"
    | "etim"
    | "unspsc"
    | "approved_supplier_document"
    | "avantia_history";
  name: string;
  tier: MaterialSourceTier;
  providerPriority: number;
  access: MaterialSourceAccess;
  liveAccessConfirmed: boolean;
  enabledByDefault: boolean;
  requiresServerCredentials: boolean;
  capabilities: readonly MaterialSourceCapability[];
  maximumConfidence: MaterialEvidenceConfidence;
  licenseOrAccessRequirement: string;
  safeUse: string;
  priceRule: string;
  documentation: readonly MaterialSourceDocumentation[];
};

export type MaterialEvidenceRule = {
  claim: "exact_product" | "likely_product" | "industry_common" | "local_common" | "avantia_common";
  confidence: MaterialEvidenceConfidence;
  minimumEvidence: string;
  eligibleSourceIds: readonly MaterialSourceDefinition["id"][];
  neverProves: string;
};

/**
 * Registry semantics:
 * - Tier 1 can identify a purchasable item and may return commercial observations.
 * - Tier 2 is licensed, manufacturer-backed product content.
 * - Tier 3 is authoritative product/specification evidence, but not a price feed.
 * - Tier 4 is classification vocabulary, not proof of a specific SKU or compatibility.
 * - Tier 5 is controlled internal evidence that always retains provenance and dates.
 *
 * A registry entry documents a safe candidate; it never proves that runtime access,
 * credentials, a current price, stock, or compatibility exists.
 */
export const MATERIAL_SOURCE_REGISTRY = [
  {
    id: "handoff",
    name: "Handoff",
    tier: 1,
    providerPriority: 1,
    access: "disabled_pending_official_access",
    liveAccessConfirmed: false,
    enabledByDefault: false,
    requiresServerCredentials: true,
    capabilities: ["product_identity", "technical_specifications", "alternatives"],
    maximumConfidence: "Likely Match",
    licenseOrAccessRequirement: "Enable only after Handoff supplies a licensed server-to-server API contract, documentation, credentials, and permitted data-use terms.",
    safeUse: "Keep the existing adapter disabled and fail closed. Do not scrape, automate the website, reuse browser cookies, or infer an API from the customer application.",
    priceRule: "No Handoff price, availability, or source claim is allowed until official API access is contractually authorized and a live response is timestamped.",
    documentation: [
      {
        title: "Does Handoff have an API?",
        publisher: "Handoff Help Center",
        url: "https://help.handoff.ai/en/articles/9778505-does-handoff-have-an-api",
        supports: "Handoff explicitly states that it does not currently offer an API and directs users to its support channel for integration needs.",
      },
      {
        title: "Handoff AI Estimating",
        publisher: "Handoff",
        url: "https://www.handoff.ai/",
        supports: "Confirms the official Handoff product; it does not publish an authorized Universal Catalog API contract.",
      },
      {
        title: "Catalogs — A Smarter Way to Control Pricing in Handoff",
        publisher: "Handoff Help Center",
        url: "https://help.handoff.ai/en/articles/13251919-catalogs-a-smarter-way-to-control-pricing-in-handoff",
        supports: "Documents Handoff catalogs and supplier-document imports, not public API access for Avantia.",
      },
    ],
  },
  {
    id: "home_depot_official",
    name: "The Home Depot official affiliate feed",
    tier: 1,
    providerPriority: 2,
    access: "requires_supplier_authorization",
    liveAccessConfirmed: false,
    enabledByDefault: false,
    requiresServerCredentials: true,
    capabilities: ["product_identity", "technical_specifications", "images", "public_price"],
    maximumConfidence: "Exact Match",
    licenseOrAccessRequirement: "Avantia must be accepted into The Home Depot Affiliate Program through Impact and receive permission and credentials for the official daily product data feed.",
    safeUse: "Ingest only the licensed feed delivered to Avantia. Preserve the Home Depot item identifier, feed timestamp, product URL, and applicable program terms. Do not scrape homedepot.com.",
    priceRule: "A feed price is a dated public observation only. It is not proof of local store stock, private Pro pricing, delivery, or the final customer price.",
    documentation: [
      {
        title: "The Home Depot Affiliate Program FAQs",
        publisher: "The Home Depot",
        url: "https://www.homedepot.com/c/SF_MS_Affiliate_Program_FAQs",
        supports: "Documents application approval through Impact and the official daily product data feed available to accepted affiliates.",
      },
    ],
  },
  {
    id: "lowes_official",
    name: "Lowe's Product Catalog API",
    tier: 1,
    providerPriority: 3,
    access: "requires_supplier_authorization",
    liveAccessConfirmed: false,
    enabledByDefault: false,
    requiresServerCredentials: true,
    capabilities: ["product_identity", "technical_specifications", "images", "alternatives", "public_price", "private_price", "availability"],
    maximumConfidence: "Exact Match",
    licenseOrAccessRequirement: "Avantia must register its organization in the Lowe's Developer Hub, obtain an approved app, X-Client-Id and bearer-token access, and subscribe to the Product Catalog capabilities it is permitted to use.",
    safeUse: "Use only the documented Lowe's partner endpoints with server-side credentials. Preserve omni item ID, store or ZIP context, retrieval time, and PDP URL. Never pass customer email for contract pricing without specific authorization and manager approval.",
    priceRule: "A Lowe's price or inventory result is current only for its returned store or location and checked timestamp. Contract pricing stays manager-only and cannot be exposed to customers automatically.",
    documentation: [
      {
        title: "Lowe's Developer Hub",
        publisher: "Lowe's",
        url: "https://developer.lowes.com/",
        supports: "Documents partner onboarding, app credentials, product catalog, pricing, inventory, and production-readiness review.",
      },
      {
        title: "Lowe's Product Catalog",
        publisher: "Lowe's Developer Hub",
        url: "https://developer.lowes.com/portal/business-components/Product%20Catalog/",
        supports: "Documents product search and detail capabilities, location-aware pricing and inventory, authentication headers, and file feeds.",
      },
    ],
  },
  {
    id: "authorized_supplier",
    name: "Authorized direct supplier integration",
    tier: 1,
    providerPriority: 4,
    access: "requires_supplier_authorization",
    liveAccessConfirmed: false,
    enabledByDefault: false,
    requiresServerCredentials: true,
    capabilities: ["product_identity", "technical_specifications", "documents", "images", "alternatives", "public_price", "private_price", "availability"],
    maximumConfidence: "Exact Match",
    licenseOrAccessRequirement: "A written supplier or retailer integration agreement, documented API permissions, and server-side credentials scoped to Avantia are required per supplier.",
    safeUse: "Create a separate adapter per authorized supplier. Preserve supplier SKU, branch or ZIP, account-safe reference, direct URL, retrieval time, and response provenance.",
    priceRule: "A price is only current for the returned location/account and checked timestamp. Private prices remain manager-only; stock and delivery require manager approval.",
    documentation: [],
  },
  {
    id: "dds",
    name: "DDS Unified Product Content API",
    tier: 2,
    providerPriority: 5,
    access: "requires_contract",
    liveAccessConfirmed: false,
    enabledByDefault: false,
    requiresServerCredentials: true,
    capabilities: ["product_identity", "technical_specifications", "documents", "images", "classification"],
    maximumConfidence: "Exact Match",
    licenseOrAccessRequirement: "Requires a commercial relationship, API entitlement, credentials, and data redistribution terms from Distributor Data Solutions.",
    safeUse: "Use for normalized manufacturer-approved identity, attributes, documents, and media after entitlement. Match by stable manufacturer identifiers; do not treat content as supplier stock.",
    priceRule: "Product content is not proof of a current vendor price, private account price, availability, or delivery terms.",
    documentation: [
      {
        title: "Product Data Layer Integration for Industrial Commerce",
        publisher: "Distributor Data Solutions",
        url: "https://www.distributordatasolutions.com/software-partners/",
        supports: "Describes the Unified Product Content API and normalized manufacturer-approved product data.",
      },
    ],
  },
  {
    id: "idea_connector",
    name: "IDEA Connector",
    tier: 2,
    providerPriority: 6,
    access: "requires_contract",
    liveAccessConfirmed: false,
    enabledByDefault: false,
    requiresServerCredentials: true,
    capabilities: ["product_identity", "technical_specifications", "documents", "images", "classification"],
    maximumConfidence: "Exact Match",
    licenseOrAccessRequirement: "Requires IDEA onboarding, an eligible manufacturer/distributor relationship, contractual content rights, and approved delivery credentials or extracts.",
    safeUse: "Use as manufacturer-syndicated product content, especially for electrical and related technical products. Retain the manufacturer and IDEA identifiers.",
    priceRule: "Syndicated product content does not by itself establish a current selling price, branch availability, or private account terms.",
    documentation: [
      {
        title: "IDEA — Transform Your Data Into Action",
        publisher: "IDEA",
        url: "https://idea4industry.com/",
        supports: "Describes IDEA Connector as a product-data syndication platform for manufacturer and distributor content.",
      },
    ],
  },
  {
    id: "tra_ser",
    name: "Trimble TRA-SER",
    tier: 2,
    providerPriority: 7,
    access: "requires_contract",
    liveAccessConfirmed: false,
    enabledByDefault: false,
    requiresServerCredentials: true,
    capabilities: ["product_identity", "technical_specifications", "classification", "public_price"],
    maximumConfidence: "Likely Match",
    licenseOrAccessRequirement: "Requires the appropriate paid TRA-SER plan plus explicit integration/export rights for Avantia's use case; enterprise integration terms may require Trimble sales approval.",
    safeUse: "Use within the licensed trade scope for standardized item and estimating data. Preserve edition, effective date, trade, and export provenance.",
    priceRule: "TRA-SER data is estimating/pricing evidence, not proof of a supplier's live SKU, branch stock, private account price, or final selling price.",
    documentation: [
      {
        title: "TRA-SER for Contractors",
        publisher: "Trimble",
        url: "https://www.trimble.com/en/products/tradeservice/tra-ser-contractors",
        supports: "Documents standardized product data, pricing features, supplier data, plans, and subscription requirements.",
      },
    ],
  },
  {
    id: "official_manufacturer",
    name: "Official manufacturer product data",
    tier: 3,
    providerPriority: 8,
    access: "public_reference",
    liveAccessConfirmed: false,
    enabledByDefault: true,
    requiresServerCredentials: false,
    capabilities: ["product_identity", "technical_specifications", "documents", "images", "alternatives"],
    maximumConfidence: "Exact Match",
    licenseOrAccessRequirement: "Use only official manufacturer pages, current technical data sheets, catalogs, or an authorized manufacturer API. Respect page/API terms and media reuse rights.",
    safeUse: "An exact model or manufacturer part number can support identity and specifications. Compatibility and code-sensitive use still require the applicable manufacturer instructions and manager review.",
    priceRule: "Manufacturer content is not a current supplier price or local availability feed unless the manufacturer explicitly returns that observation for the requested location and time.",
    documentation: [],
  },
  {
    id: "etim",
    name: "ETIM",
    tier: 4,
    providerPriority: 9,
    access: "public_reference",
    liveAccessConfirmed: true,
    enabledByDefault: true,
    requiresServerCredentials: false,
    capabilities: ["classification", "synonyms", "technical_specifications"],
    maximumConfidence: "Common Industry Default",
    licenseOrAccessRequirement: "The core model is available under the Open Data Commons Attribution License. Attribute public use and preserve notices; some national translations require local membership.",
    safeUse: "Use classes, features, values, units, and synonyms to structure questions and product attributes. ETIM is a model, not a product catalog or compatibility authority.",
    priceRule: "ETIM provides no current price, stock, branch availability, or private account data.",
    documentation: [
      {
        title: "ETIM model information",
        publisher: "ETIM International",
        url: "https://www.etim-international.com/classification/model-information/",
        supports: "Defines ETIM groups, classes, synonyms, features, values, and units.",
      },
      {
        title: "ETIM product classification licence info",
        publisher: "ETIM International",
        url: "https://www.etim-international.com/classification/license-info/",
        supports: "Documents ODC Attribution licensing and language-specific access conditions.",
      },
    ],
  },
  {
    id: "unspsc",
    name: "UNSPSC / UNGM reference",
    tier: 4,
    providerPriority: 10,
    access: "public_reference",
    liveAccessConfirmed: true,
    enabledByDefault: true,
    requiresServerCredentials: false,
    capabilities: ["classification"],
    maximumConfidence: "Needs Confirmation",
    licenseOrAccessRequirement: "Use the public UNGM classification endpoints for reference and follow UNSPSC trademark/codeset terms. Do not assume public API availability grants redistribution of every commercial codeset format.",
    safeUse: "Use for procurement classification and broad category routing. A UNSPSC code does not identify an exact SKU, required technical attributes, or compatibility.",
    priceRule: "UNSPSC contains no product price, stock, availability, delivery, or private account data.",
    documentation: [
      {
        title: "Contract award API helpers: countries and UNSPSCs",
        publisher: "United Nations Global Marketplace",
        url: "https://developer.ungm.org/Article/ContractAwardHelpers",
        supports: "Documents the public UNGM UNSPSC helper endpoint and recommends using it instead of hardcoding values.",
      },
      {
        title: "United Nations Standard Products and Services Code",
        publisher: "United Nations Global Marketplace",
        url: "https://www.ungm.org/Public/UNSPSC",
        supports: "Defines UNSPSC as a global classification system for products and services.",
      },
    ],
  },
  {
    id: "approved_supplier_document",
    name: "Manager-approved supplier document",
    tier: 5,
    providerPriority: 11,
    access: "manager_approved_document",
    liveAccessConfirmed: true,
    enabledByDefault: true,
    requiresServerCredentials: false,
    capabilities: ["product_identity", "technical_specifications", "documents", "public_price", "private_price", "availability", "local_commonality"],
    maximumConfidence: "Exact Match",
    licenseOrAccessRequirement: "The document must be legitimately received by Avantia for the applicable business purpose. Preserve the original file, supplier, quote number, quote date, location, customer/privacy scope, and manager approval.",
    safeUse: "Use selected line items as lazy-catalog evidence. Exact confidence requires an exact supplier/manufacturer identifier; otherwise label the match likely or needing confirmation.",
    priceRule: "A quoted price is only valid for its supplier, unit/package, location/account, quote date, and expiration. Never expose private cost or margin to a customer without manager approval.",
    documentation: [],
  },
  {
    id: "avantia_history",
    name: "Avantia request and purchase history",
    tier: 5,
    providerPriority: 12,
    access: "internal_aggregate",
    liveAccessConfirmed: true,
    enabledByDefault: true,
    requiresServerCredentials: true,
    capabilities: ["avantia_commonality", "local_commonality", "synonyms"],
    maximumConfidence: "Common for Avantia",
    licenseOrAccessRequirement: "Internal use must follow Avantia access controls, tenant/customer isolation, retention rules, and aggregation thresholds. Do not expose customer-specific history as shared evidence.",
    safeUse: "Use repeated, normalized, manager-reviewed requests and purchases to rank common choices and learn phrasing. History may suggest the next question but cannot prove the customer's intended product.",
    priceRule: "Historical prices are stale observations, never current prices. Preserve vendor and timestamp and require a new authorized check before customer-facing use.",
    documentation: [],
  },
] as const satisfies readonly MaterialSourceDefinition[];

export const MATERIAL_EVIDENCE_CONFIDENCE_RULES = [
  {
    claim: "exact_product",
    confidence: "Exact Match",
    minimumEvidence: "An exact manufacturer part number, model, SKU, or UPC from a current authorized product record or manager-approved source document.",
    eligibleSourceIds: ["home_depot_official", "lowes_official", "authorized_supplier", "dds", "idea_connector", "official_manufacturer", "approved_supplier_document"],
    neverProves: "Application compatibility, code compliance, stock, delivery, or customer intent without the relevant independent confirmation.",
  },
  {
    claim: "likely_product",
    confidence: "Likely Match",
    minimumEvidence: "Known critical attributes match a sourced candidate, but at least one non-safety discriminator or exact identifier remains unconfirmed.",
    eligibleSourceIds: ["handoff", "home_depot_official", "lowes_official", "authorized_supplier", "dds", "idea_connector", "tra_ser", "official_manufacturer", "approved_supplier_document"],
    neverProves: "That the candidate is the product the customer intended or that substitution is safe.",
  },
  {
    claim: "industry_common",
    confidence: "Common Industry Default",
    minimumEvidence: "Corroborated classification/manufacturer/supplier evidence plus a reviewed rationale; one catalog position or model output is insufficient.",
    eligibleSourceIds: ["home_depot_official", "lowes_official", "dds", "idea_connector", "tra_ser", "official_manufacturer", "etim", "approved_supplier_document"],
    neverProves: "That the common choice is correct for this job, jurisdiction, assembly, or customer.",
  },
  {
    claim: "local_common",
    confidence: "Common Local Choice",
    minimumEvidence: "Repeated, recent observations across more than one authorized local supplier or branch, with location and checked dates retained.",
    eligibleSourceIds: ["home_depot_official", "lowes_official", "authorized_supplier", "approved_supplier_document", "avantia_history"],
    neverProves: "Current inventory or that a local common choice meets project specifications.",
  },
  {
    claim: "avantia_common",
    confidence: "Common for Avantia",
    minimumEvidence: "Repeated normalized Avantia requests, quotes, or purchases that passed manager review and privacy-safe aggregation.",
    eligibleSourceIds: ["approved_supplier_document", "avantia_history"],
    neverProves: "Industry popularity, exact product identity, current price, compatibility, or the present customer's intent.",
  },
] as const satisfies readonly MaterialEvidenceRule[];

export function materialSourceById(id: MaterialSourceDefinition["id"]) {
  return MATERIAL_SOURCE_REGISTRY.find((source) => source.id === id);
}

export function enabledMaterialSources() {
  return MATERIAL_SOURCE_REGISTRY.filter((source) => source.enabledByDefault);
}

export function sourcesWithCapability(capability: MaterialSourceCapability) {
  return MATERIAL_SOURCE_REGISTRY.filter((source) =>
    (source.capabilities as readonly MaterialSourceCapability[]).includes(capability),
  );
}

export function sourceMaySupplyDatedPriceObservation(source: MaterialSourceDefinition) {
  if (!source.liveAccessConfirmed) return false;
  if (!source.capabilities.includes("public_price") && !source.capabilities.includes("private_price")) return false;
  return ["home_depot_official", "lowes_official", "authorized_supplier", "approved_supplier_document"].includes(source.id);
}
