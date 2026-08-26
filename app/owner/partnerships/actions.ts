"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaffProfile } from "@/lib/auth";
import { canSendAuraEmail, sendAuraEmail } from "@/lib/aura/communications";
import {
  SUPPLIER_PARTNER_STATUSES,
  emptySupplierPartnerProgress,
  findSupplierPartner,
  type SupplierPartnerActivity,
} from "@/lib/supplier-partners/catalog";
import { loadSupplierPartnerProgress, saveSupplierPartnerProgress } from "@/lib/supplier-partners/store";

const inputSchema = z.object({
  slug: z.string().min(1).max(120),
  status: z.enum(SUPPLIER_PARTNER_STATUSES).optional(),
  contactEmail: z.string().trim().max(240).optional(),
  followUpDate: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(6000).optional(),
  activityType: z.enum(["status", "call", "email", "note", "application"]).optional(),
  activityDetail: z.string().trim().max(1000).optional(),
});

export type SupplierPartnerUpdateInput = z.infer<typeof inputSchema>;

export async function updateSupplierPartnerAction(input: SupplierPartnerUpdateInput) {
  const { supabase, user } = await requireStaffProfile("suppliers");
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Please check the information and try again." };

  const partner = findSupplierPartner(parsed.data.slug);
  if (!partner) return { ok: false as const, error: "Supplier was not found." };

  const allProgress = await loadSupplierPartnerProgress(supabase);
  const current = allProgress[partner.slug] || emptySupplierPartnerProgress(partner);
  const now = new Date().toISOString();
  const activities = [...current.activities];

  if (parsed.data.activityType && parsed.data.activityDetail) {
    const activity: SupplierPartnerActivity = {
      id: crypto.randomUUID(),
      type: parsed.data.activityType,
      detail: parsed.data.activityDetail,
      at: now,
    };
    activities.unshift(activity);
  } else if (parsed.data.status && parsed.data.status !== current.status) {
    activities.unshift({
      id: crypto.randomUUID(),
      type: "status",
      detail: `Status changed to ${parsed.data.status}`,
      at: now,
    });
  }

  const progress = {
    ...current,
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
    ...(parsed.data.contactEmail !== undefined ? { contactEmail: parsed.data.contactEmail } : {}),
    ...(parsed.data.followUpDate !== undefined ? { followUpDate: parsed.data.followUpDate } : {}),
    ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    activities: activities.slice(0, 30),
    updatedAt: now,
  };

  try {
    await saveSupplierPartnerProgress(supabase, user.id, partner.slug, progress);
  } catch {
    return { ok: false as const, error: "The supplier record could not be saved. Please try again." };
  }
  revalidatePath("/owner/partnerships");
  revalidatePath("/owner/aura");
  return { ok: true as const, progress };
}

const emailSchema = z.object({
  slug: z.string().min(1).max(120),
  recipient: z.string().trim().email().max(240),
});

export async function sendSupplierPartnerEmailAction(input: z.infer<typeof emailSchema>) {
  const { supabase, user } = await requireStaffProfile("suppliers");
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Add the correct supplier email first." };
  const partner = findSupplierPartner(parsed.data.slug);
  if (!partner) return { ok: false as const, error: "Supplier was not found." };
  if (!canSendAuraEmail()) return { ok: false as const, error: "AvantiaBuild email sending is not connected." };

  try {
    await sendAuraEmail(parsed.data.recipient, partner.emailSubject, partner.emailBody);
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "The email could not be sent." };
  }

  const allProgress = await loadSupplierPartnerProgress(supabase);
  const current = allProgress[partner.slug] || emptySupplierPartnerProgress(partner);
  const now = new Date().toISOString();
  const progress = {
    ...current,
    contactEmail: parsed.data.recipient,
    status: current.status === "Research ready" || current.status === "Call needed" || current.status === "Email drafted" ? "In progress" as const : current.status,
    activities: [{ id: crypto.randomUUID(), type: "email" as const, detail: `Email sent to ${parsed.data.recipient}`, at: now }, ...current.activities].slice(0, 30),
    updatedAt: now,
  };
  try {
    await saveSupplierPartnerProgress(supabase, user.id, partner.slug, progress);
  } catch {
    return { ok: false as const, error: "The email was sent, but the supplier status could not be saved." };
  }
  revalidatePath("/owner/partnerships");
  revalidatePath("/owner/aura");
  return { ok: true as const, progress };
}
