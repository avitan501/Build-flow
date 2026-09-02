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
});

const discoveredSupplierSchema = z.object({
  name: z.string().trim().min(2).max(160),
  department: z.string().trim().min(2).max(100),
  zipCode: z.string().regex(/^\d{5}(?:-\d{4})?$/),
  url: z.string().url().max(1200),
  summary: z.string().trim().max(1000),
});

export async function addDiscoveredSupplierNetworkAction(input: z.infer<typeof discoveredSupplierSchema>) {
  const parsed = discoveredSupplierSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "This supplier could not be added." };
  const { supabase, user } = await requireStaffProfile("suppliers");
  const key = canonicalSupplierKey(parsed.data.name).slice(0, 160);
  const { data: snapshotData, error: snapshotError } = await supabase.rpc("staff_load_supplier_directory_snapshot");
  const snapshot = snapshotData as { settings?: { suppliers?: SupplierRoutingOption[] } } | null;
  if (snapshotError || !Array.isArray(snapshot?.settings?.suppliers)) {
    return { ok: false as const, error: "The Supplier Directory could not be checked." };
  }
  const existing = findCanonicalSupplier(snapshot.settings.suppliers, {
    name: parsed.data.name,
  });
  const supplierId = existing?.id || canonicalSupplierId(parsed.data.name);
  const supplier = {
    id: supplierId,
    name: parsed.data.name,
    contactLabel: "Supplier contact",
    contactName: "",
    email: "",
    phone: "",
    whatsapp: "",
    portalUrl: parsed.data.url,
    preferredDeliveryMethod: "manual",
    contactMethods: ["manual"],
    materials: parsed.data.department,
    deliveryNotes: `AI-discovered near ${parsed.data.zipCode}. Confirm products, delivery area, and contractor pricing.`,
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
  if (!existing) {
    const { error } = await supabase.rpc("staff_upsert_supplier_directory_entry", { p_supplier: supplier, p_create: true });
    if (error) return { ok: false as const, error: "The supplier could not be added to the directory." };
  }
  await saveSupplierNetworkOptions(supabase, user.id, key, parsed.data.name, {
    channels: [], stage: "more", status: "Research ready", note: parsed.data.summary, hidden: false, priority: false,
  });
  revalidatePath("/admin/supplier-network");
  revalidatePath("/admin/vendors");
  return { ok: true as const };
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
      const { data: snapshotData } = await supabase.rpc("staff_load_supplier_directory_snapshot");
      const snapshot = snapshotData as { settings?: { suppliers?: SupplierRoutingOption[] } } | null;
      const suppliers = snapshot?.settings?.suppliers ?? [];
      const existing = findCanonicalSupplier(suppliers, {
        supplierId: parsed.data.directorySupplierId,
        name: parsed.data.supplierName,
      });
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
        trustLevel: parsed.data.stage === "approved" ? (parsed.data.priority ? "preferred" : "verified") : String(existing?.trustLevel || "first-time"),
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
