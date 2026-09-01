"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaffProfile } from "@/lib/auth";
import { SUPPLIER_NETWORK_CHANNELS } from "@/lib/supplier-network";
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
});

export async function updateSupplierNetworkOptionsAction(
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
      parsed.data.channels,
    );
  } catch {
    return {
      ok: false as const,
      error: "The supplier options could not be saved. Please try again.",
    };
  }
  revalidatePath("/admin/supplier-network");
  return { ok: true as const };
}
