import type { SupplierRoutingOption } from "@/lib/shop-qualification";

export type CanonicalSupplierSource =
  | "directory"
  | "affiliate_program"
  | "show_partner"
  | "researched_target"
  | "request_route";

export type CanonicalSupplierSourceRef = {
  source: CanonicalSupplierSource;
  sourceId: string;
};

export type CanonicalSupplierRouteSelection = {
  supplierId: string | null;
  name: string;
  note: string;
};

const SUPPLIER_NAME_ALIASES: Array<[pattern: RegExp, replacement: string]> = [
  [/the home depot pro|home depot pro|the home depot/g, "home depot"],
  [/lowe['’]s creator|lowe['’]s pro/g, "lowes"],
  [/build\.com \/ ferguson home|ferguson home/g, "ferguson"],
  [/abc supply api \/ integration partnership/g, "abc supply"],
  [/builders firstsource \/ mybldr \(trade account\)/g, "builders firstsource"],
  [/u\.s\. electrical services \/ lade/g, "us electrical services"],
];

/**
 * Stable cross-source identity used only for joining supplier read models.
 * Persisted directory IDs and historical supplier snapshots remain untouched.
 */
export function canonicalSupplierKey(value: string) {
  let normalized = value.toLowerCase();
  for (const [pattern, replacement] of SUPPLIER_NAME_ALIASES) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized.replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Deterministic id for a supplier that does not exist in the live directory yet.
 * Alias names intentionally produce the same id so concurrent request/network
 * saves remain idempotent through the existing directory RPC.
 */
export function canonicalSupplierId(value: string) {
  return (
    canonicalSupplierKey(value)
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 160) || "supplier"
  );
}

export function isSupplierDirectoryId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-z0-9][a-z0-9._:-]{0,159}$/i.test(value.trim())
  );
}

type CanonicalSupplierIdentity = Pick<SupplierRoutingOption, "id" | "name"> &
  Partial<Pick<SupplierRoutingOption, "trustLevel" | "email" | "phone" | "whatsapp" | "portalUrl">>;

function supplierAuthorityRank(
  supplier: CanonicalSupplierIdentity,
) {
  const trustRank: Record<string, number> = {
    preferred: 60,
    trusted: 50,
    verified: 40,
    "first-time": 30,
    "not-reviewed": 20,
    "do-not-use": 10,
  };
  const contactRank = [
    supplier.email,
    supplier.phone,
    supplier.whatsapp,
    supplier.portalUrl,
  ].filter(Boolean).length;
  return (trustRank[supplier.trustLevel || "not-reviewed"] || 0) + contactRank;
}

export function findCanonicalSupplier<T extends CanonicalSupplierIdentity>(
  suppliers: T[],
  identity: { supplierId?: string | null; name?: string | null },
) {
  const supplierId = String(identity.supplierId || "").trim();
  if (supplierId) {
    const exact = suppliers.find((supplier) => supplier.id === supplierId);
    if (exact) return exact;
  }
  const key = canonicalSupplierKey(String(identity.name || ""));
  if (!key) return undefined;
  return suppliers
    .map((supplier, index) => ({ supplier, index }))
    .filter(({ supplier }) => canonicalSupplierKey(supplier.name) === key)
    .sort((left, right) => {
      const leftRank = supplierAuthorityRank(left.supplier);
      const rightRank = supplierAuthorityRank(right.supplier);
      return rightRank - leftRank || left.index - right.index;
    })[0]?.supplier;
}

export function canonicalSupplierDirectory<T extends CanonicalSupplierIdentity>(
  suppliers: T[],
) {
  const keys: string[] = [];
  for (const supplier of suppliers) {
    const key = canonicalSupplierKey(supplier.name) || `id:${supplier.id}`;
    if (!keys.includes(key)) keys.push(key);
  }
  return keys.flatMap((key) => {
    const supplier = key.startsWith("id:")
      ? suppliers.find((entry) => entry.id === key.slice(3))
      : findCanonicalSupplier(suppliers, { name: key });
    return supplier ? [supplier] : [];
  });
}

export function uniqueCanonicalSupplierNames(values: string[]) {
  const names = new Map<string, string>();
  for (const value of values) {
    const name = String(value || "").trim().replace(/\s+/g, " ").slice(0, 160);
    const key = canonicalSupplierKey(name);
    if (name && key && !names.has(key)) names.set(key, name);
  }
  return [...names.values()];
}

function routeNotes(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }
  return value as Record<string, unknown>;
}

function routeNote(
  notes: Record<string, unknown>,
  snapshotName: string,
  currentName: string,
) {
  const direct = notes[snapshotName] ?? notes[currentName];
  if (typeof direct === "string") return direct.trim().slice(0, 800);
  const key = canonicalSupplierKey(snapshotName || currentName);
  const alias = Object.entries(notes).find(
    ([name, note]) =>
      typeof note === "string" && canonicalSupplierKey(name) === key,
  );
  return typeof alias?.[1] === "string" ? alias[1].trim().slice(0, 800) : "";
}

/**
 * Reads current and legacy request metadata through the directory identity.
 * A directory rename therefore appears on existing requests without rewriting
 * the historical name snapshot stored on the request item.
 */
export function resolveRequestSupplierRouteSelections(
  items: Array<{ metadata?: Record<string, unknown> | null }>,
  suppliers: Array<Pick<SupplierRoutingOption, "id" | "name">>,
) {
  const selections = new Map<string, CanonicalSupplierRouteSelection>();
  for (const item of items) {
    const metadata = item.metadata ?? {};
    const notes = routeNotes(metadata.supplier_route_notes);
    const structured = Array.isArray(metadata.supplier_route_entries)
      ? metadata.supplier_route_entries
      : [];
    const structuredKeys = new Set<string>();

    for (const rawEntry of structured) {
      if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) continue;
      const entry = rawEntry as Record<string, unknown>;
      const snapshotName = typeof entry.name === "string" ? entry.name.trim() : "";
      const supplierId = isSupplierDirectoryId(entry.supplier_id)
        ? entry.supplier_id.trim()
        : null;
      const supplier = findCanonicalSupplier(suppliers, {
        supplierId,
        name: snapshotName,
      });
      const name = supplier?.name || snapshotName;
      const key = supplier
        ? `id:${supplier.id}`
        : `name:${canonicalSupplierKey(name)}`;
      if (!name || key === "name:") continue;
      structuredKeys.add(canonicalSupplierKey(snapshotName || name));
      const note = routeNote(notes, snapshotName, name);
      const current = selections.get(key);
      if (!current || (!current.note && note)) {
        selections.set(key, {
          supplierId: supplier?.id || supplierId,
          name,
          note: note || current?.note || "",
        });
      }
    }

    const legacyNames = Array.isArray(metadata.supplier_route_names)
      ? metadata.supplier_route_names.filter(
          (name): name is string => typeof name === "string" && Boolean(name.trim()),
        )
      : [];
    for (const snapshotName of uniqueCanonicalSupplierNames(legacyNames)) {
      const canonicalKey = canonicalSupplierKey(snapshotName);
      if (structuredKeys.has(canonicalKey)) continue;
      const supplier = findCanonicalSupplier(suppliers, { name: snapshotName });
      const name = supplier?.name || snapshotName;
      const key = supplier ? `id:${supplier.id}` : `name:${canonicalKey}`;
      const note = routeNote(notes, snapshotName, name);
      const current = selections.get(key);
      if (!current || (!current.note && note)) {
        selections.set(key, {
          supplierId: supplier?.id || null,
          name,
          note: note || current?.note || "",
        });
      }
    }
  }
  return [...selections.values()];
}

export function mergeCanonicalSupplierSourceRefs(
  ...groups: CanonicalSupplierSourceRef[][]
) {
  const refs = new Map<string, CanonicalSupplierSourceRef>();
  for (const ref of groups.flat()) {
    const sourceId = String(ref.sourceId || "").trim();
    if (!sourceId) continue;
    refs.set(`${ref.source}:${sourceId}`, { ...ref, sourceId });
  }
  return [...refs.values()];
}
