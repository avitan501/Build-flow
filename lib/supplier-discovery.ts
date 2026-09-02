import {
  normalizeSupplierDomain,
  primarySupplierIdentity,
  safeSupplierSourceUrl,
  supplierIdentityKeys,
} from "@/lib/supplier-identity";

export const SUPPLIER_DISCOVERY_RESULT_LIMIT = 10;

export type SupplierDiscoverySource = {
  title?: unknown;
  url?: unknown;
  summary?: unknown;
};

export type SupplierDiscoveryCandidate = {
  identity: string;
  name: string;
  url: string;
  domain: string;
  summary: string;
  reviewStatus: "needs-review";
};

function clean(value: unknown, max: number) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, max)
    : "";
}

function sourceBackedCompanyName(value: unknown) {
  const title = clean(value, 240);
  if (!title) return "";
  const firstSegment = title.split(/[|–—]/)[0]?.trim() ?? "";
  const cleaned = firstSegment
    .replace(/\b(home|official site|contact us|locations?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length < 2 || !/[a-z0-9]/i.test(cleaned)) return "";
  return cleaned.slice(0, 160);
}

export function selectSafeSupplierCandidates(input: {
  sources: SupplierDiscoverySource[];
  excludedIdentities?: Iterable<string>;
  existingSuppliers?: Array<{
    name?: string | null;
    domain?: string | null;
    url?: string | null;
  }>;
  limit?: number;
}) {
  const excluded = new Set(input.excludedIdentities ?? []);
  for (const supplier of input.existingSuppliers ?? []) {
    for (const identity of supplierIdentityKeys(supplier)) excluded.add(identity);
  }

  const seen = new Set(excluded);
  const candidates: SupplierDiscoveryCandidate[] = [];
  const limit = Math.max(
    0,
    Math.min(input.limit ?? SUPPLIER_DISCOVERY_RESULT_LIMIT, SUPPLIER_DISCOVERY_RESULT_LIMIT),
  );

  for (const source of input.sources) {
    const url = safeSupplierSourceUrl(clean(source.url, 1200));
    const name = sourceBackedCompanyName(source.title);
    if (!url || !name) continue;

    const domain = normalizeSupplierDomain(url.hostname);
    const identities = supplierIdentityKeys({ name, domain });
    if (!identities.length || identities.some((identity) => seen.has(identity))) continue;

    for (const identity of identities) seen.add(identity);
    candidates.push({
      identity: primarySupplierIdentity({ name, domain }),
      name,
      url: url.toString(),
      domain,
      summary: clean(source.summary, 500),
      reviewStatus: "needs-review",
    });
    if (candidates.length === limit) break;
  }

  return candidates;
}
