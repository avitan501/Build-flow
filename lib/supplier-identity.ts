const COMMON_HOST_PREFIXES = new Set([
  "location",
  "locations",
  "pro",
  "shop",
  "store",
  "stores",
  "www",
]);

const BLOCKED_DISCOVERY_DOMAINS = new Set([
  "bing.com",
  "facebook.com",
  "google.com",
  "instagram.com",
  "linkedin.com",
  "mapquest.com",
  "x.com",
  "yellowpages.com",
  "yelp.com",
]);

export function canonicalSupplierName(value: string) {
  return canonicalSupplierKey(value);
}

export function normalizeSupplierDomain(value: string) {
  const input = value.trim().toLowerCase();
  if (!input) return "";

  try {
    const parsed = new URL(input.includes("://") ? input : `https://${input}`);
    const parts = parsed.hostname.replace(/\.$/, "").split(".").filter(Boolean);
    while (parts.length > 2 && COMMON_HOST_PREFIXES.has(parts[0] ?? "")) {
      parts.shift();
    }
    return parts.join(".");
  } catch {
    return "";
  }
}

export function safeSupplierSourceUrl(value: string) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    ) {
      return null;
    }

    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    const domain = normalizeSupplierDomain(hostname);
    if (
      !domain.includes(".") ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".invalid") ||
      /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) ||
      hostname.includes(":") ||
      [...BLOCKED_DISCOVERY_DOMAINS].some(
        (blocked) => domain === blocked || domain.endsWith(`.${blocked}`),
      )
    ) {
      return null;
    }

    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

export function supplierIdentityKeys(input: {
  name?: string | null;
  domain?: string | null;
  url?: string | null;
}) {
  const keys = new Set<string>();
  const name = canonicalSupplierName(input.name ?? "");
  const domain = normalizeSupplierDomain(input.domain || input.url || "");
  if (domain) keys.add(`domain:${domain}`);
  if (name) keys.add(`name:${name}`);
  return [...keys];
}

export function primarySupplierIdentity(input: {
  name?: string | null;
  domain?: string | null;
  url?: string | null;
}) {
  return supplierIdentityKeys(input)[0] ?? "";
}
import { canonicalSupplierKey } from "@/lib/supplier-canonical";
