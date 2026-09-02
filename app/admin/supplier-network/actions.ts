"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaffProfile } from "@/lib/auth";
import {
  canonicalSupplierId,
  canonicalSupplierKey,
  findCanonicalSupplier,
} from "@/lib/supplier-canonical";
import {
  SUPPLIER_NETWORK_CHANNELS,
  type SupplierNetworkOverride,
} from "@/lib/supplier-network";
import { saveSupplierNetworkOptions } from "@/lib/supplier-network-options";
import type { SupplierRoutingOption } from "@/lib/shop-qualification";
import {
  safeSupplierSourceUrl,
  supplierIdentityKeys,
} from "@/lib/supplier-identity";

const inputSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9 ]+$/),
  supplierName: z.string().trim().min(1).max(200),
  channels: z
    .array(z.enum(SUPPLIER_NETWORK_CHANNELS))
    .max(SUPPLIER_NETWORK_CHANNELS.length),
  stage: z.enum(["approved", "contact", "more"]),
  status: z.string().trim().min(1).max(80),
  note: z.string().trim().max(2000),
  hidden: z.boolean(),
  priority: z.boolean(),
  directorySupplierId: z.string().trim().max(160).nullable(),
  departments: z.string().trim().max(2000),
  phone: z.string().trim().max(80),
  link: z.string().trim().max(500),
  ask: z.string().trim().max(4000),
  reviewConfirmed: z.boolean().default(false),
});

const discoveredSupplierSchema = z.object({
  name: z.string().trim().min(2).max(160),
  department: z.string().trim().min(2).max(100),
  zipCode: z.string().regex(/^\d{5}(?:-\d{4})?$/),
  url: z.string().url().max(1200),
  summary: z.string().trim().max(1000),
  reviewConfirmed: z.literal(true),
});

export async function addDiscoveredSupplierNetworkAction(input: z.infer<typeof discoveredSupplierSchema>) {
  const parsed = discoveredSupplierSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Review this candidate before adding it." };
  const sourceUrl = safeSupplierSourceUrl(parsed.data.url);
  if (!sourceUrl) return { ok: false as const, error: "Open and verify a safe official HTTPS source before adding this supplier." };
  const { supabase, user } = await requireStaffProfile("suppliers");
  const key = canonicalSupplierKey(parsed.data.name).slice(0, 160);
  if (!key) return { ok: false as const, error: "The supplier name could not be verified." };
  const { data: snapshotData, error: snapshotError } = await supabase.rpc("staff_load_supplier_directory_snapshot");
  const snapshot = snapshotData as { settings?: { suppliers?: SupplierRoutingOption[] } } | null;
  if (snapshotError || !Array.isArray(snapshot?.settings?.suppliers)) {
    return { ok: false as const, error: "The Supplier Directory could not be checked for duplicates." };
  }
  const candidateIdentities = new Set(
    supplierIdentityKeys({ name: parsed.data.name, url: sourceUrl.toString() }),
  );
  const duplicate = findCanonicalSupplier(snapshot.settings.suppliers, {
    name: parsed.data.name,
  }) ?? snapshot.settings.suppliers.find((supplier) =>
    supplierIdentityKeys({
      name: supplier.name,
      url: supplier.portalUrl,
    }).some((identity) => candidateIdentities.has(identity)),
  );
  if (duplicate) {
    return {
      ok: true as const,
      status: "already-exists" as const,
      supplierName: String(duplicate.name || parsed.data.name),
    };
  }
  const supplierId = canonicalSupplierId(parsed.data.name);
  const supplier = {
    id: supplierId,
    name: parsed.data.name,
    contactLabel: "Supplier contact",
    contactName: "",
    email: "",
    phone: "",
    whatsapp: "",
    portalUrl: sourceUrl.toString(),
    preferredDeliveryMethod: "manual",
    contactMethods: ["manual"],
    materials: parsed.data.department,
    deliveryNotes: `Human-reviewed discovery candidate near ${parsed.data.zipCode}. Confirm products, delivery area, and contractor pricing before use.`,
    deliveryCharge: null,
    deliveryChargeNote: "",
    notes: parsed.data.summary,
    address: "",
    catalogDepartments: [parsed.data.department],
    catalogEnabledDepartments: [],
    programChannels: [],
    trustLevel: "not-reviewed",
    additionalContacts: [],
    relationshipUpdates: [],
  };
  const { error } = await supabase.rpc("staff_upsert_supplier_directory_entry", { p_supplier: supplier, p_create: true });
  if (error) return { ok: false as const, error: "The supplier could not be added to the directory." };
  await saveSupplierNetworkOptions(supabase, user.id, key, parsed.data.name, {
    channels: [], stage: "more", status: "Research ready", note: parsed.data.summary, hidden: false, priority: false,
  });
  revalidatePath("/admin/supplier-network");
  revalidatePath("/admin/vendors");
  return { ok: true as const, status: "added" as const, supplierName: parsed.data.name };
}

export async function updateSupplierNetworkRowAction(
  input: z.infer<typeof inputSchema>,
) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false as const,
      error: "The supplier options could not be saved.",
    };
  const { supabase, user } = await requireStaffProfile("suppliers");
  try {
    let existing: SupplierRoutingOption | undefined;
    if (parsed.data.directorySupplierId || parsed.data.stage === "approved") {
      const { data: snapshotData, error: snapshotError } = await supabase.rpc("staff_load_supplier_directory_snapshot");
      if (snapshotError) throw snapshotError;
      const snapshot = snapshotData as { settings?: { suppliers?: SupplierRoutingOption[] } } | null;
      existing = findCanonicalSupplier(snapshot?.settings?.suppliers ?? [], {
        supplierId: parsed.data.directorySupplierId,
        name: parsed.data.supplierName,
      });
    }
    const trustLevel = String(existing?.trustLevel || "not-reviewed");
    const alreadyVerified = ["verified", "trusted", "preferred"].includes(trustLevel);
    const requiresReview =
      (parsed.data.stage === "approved" && !alreadyVerified) ||
      (parsed.data.stage === "contact" && trustLevel === "not-reviewed" && Boolean(existing));
    if (requiresReview && !parsed.data.reviewConfirmed) {
      return {
        ok: false as const,
        error: "Confirm the supplier review before promoting this candidate.",
      };
    }

    await saveSupplierNetworkOptions(
      supabase,
      user.id,
      parsed.data.key,
      parsed.data.supplierName,
      {
        channels: parsed.data.channels,
        stage: parsed.data.stage,
        status: parsed.data.status,
        note: parsed.data.note,
        hidden: parsed.data.hidden,
        priority: parsed.data.priority,
      } satisfies SupplierNetworkOverride,
    );
    if (parsed.data.directorySupplierId || parsed.data.stage === "approved") {
      const supplierId = existing?.id || canonicalSupplierId(parsed.data.supplierName);
      const supplier = {
        ...(existing ?? {}),
        id: supplierId,
        name: existing?.name || parsed.data.supplierName,
        contactLabel: String(existing?.contactLabel || parsed.data.phone || "Supplier contact"),
        contactName: String(existing?.contactName || ""),
        email: String(existing?.email || ""),
        phone: String(existing?.phone || parsed.data.phone || ""),
        whatsapp: String(existing?.whatsapp || ""),
        portalUrl: String(existing?.portalUrl || parsed.data.link || ""),
        preferredDeliveryMethod: String(existing?.preferredDeliveryMethod || "manual"),
        materials: String(existing?.materials || parsed.data.departments || ""),
        deliveryNotes: String(existing?.deliveryNotes || parsed.data.ask || ""),
        deliveryCharge: existing?.deliveryCharge ?? null,
        deliveryChargeNote: String(existing?.deliveryChargeNote || ""),
        notes: String(existing?.notes || parsed.data.note || ""),
        address: String(existing?.address || ""),
        catalogDepartments: Array.isArray(existing?.catalogDepartments) ? existing.catalogDepartments : [],
        catalogEnabledDepartments: Array.isArray(existing?.catalogEnabledDepartments) ? existing.catalogEnabledDepartments : [],
        programChannels: parsed.data.channels,
        trustLevel: parsed.data.stage === "approved"
          ? (parsed.data.priority ? "preferred" : "verified")
          : trustLevel === "not-reviewed" && parsed.data.reviewConfirmed
            ? "first-time"
            : String(existing?.trustLevel || "first-time"),
      };
      const { error: directoryError } = await supabase.rpc("staff_upsert_supplier_directory_entry", { p_supplier: supplier, p_create: !existing });
      if (directoryError) throw directoryError;
    }
  } catch {
    return {
      ok: false as const,
      error: "The supplier options could not be saved. Please try again.",
    };
  }
  revalidatePath("/admin/supplier-network");
  revalidatePath("/admin/vendors");
  revalidatePath("/owner/materials/requests/[requestId]", "page");
  return { ok: true as const };
}
