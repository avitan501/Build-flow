"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaffProfile } from "@/lib/auth";
import {
  SUPPLIER_NETWORK_CHANNELS,
  type SupplierNetworkOverride,
} from "@/lib/supplier-network";
import { saveSupplierNetworkOptions } from "@/lib/supplier-network-options";

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
      const snapshot = snapshotData as { settings?: { suppliers?: Array<Record<string, unknown>> } } | null;
      const suppliers = snapshot?.settings?.suppliers ?? [];
      const existing = suppliers.find((supplier) => supplier.id === parsed.data.directorySupplierId);
      const supplierId = parsed.data.directorySupplierId || `network-${parsed.data.key.replace(/\s+/g, "-")}`.slice(0, 160);
      const supplier = {
        ...(existing ?? {}),
        id: supplierId,
        name: parsed.data.supplierName,
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
        trustLevel: parsed.data.stage === "approved" ? "verified" : String(existing?.trustLevel || "first-time"),
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
  return { ok: true as const };
}
