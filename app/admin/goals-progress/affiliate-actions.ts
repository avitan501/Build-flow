"use server";

import { revalidatePath } from "next/cache";

import { requireAdminProfile } from "@/lib/auth";
import { AFFILIATE_STATUSES, type AffiliateStatus } from "@/lib/affiliate-tracker";

type Result = { ok: true } | { ok: false; error: string };
const PAGE = "/admin/goals-progress";
const clean = (value: unknown, max = 2000) => String(value ?? "").trim().slice(0, max);
const validStatus = (value: string): value is AffiliateStatus => AFFILIATE_STATUSES.includes(value as AffiliateStatus);

function optionalHttpUrl(value: unknown): { ok: true; value: string | null } | { ok: false } {
  const text = clean(value, 2000);
  if (!text) return { ok: true, value: null };
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false };
    return { ok: true, value: url.toString() };
  } catch {
    return { ok: false };
  }
}

async function programExists(supabase: Awaited<ReturnType<typeof requireAdminProfile>>["supabase"], id: string) {
  const { data } = await supabase.from("affiliate_programs").select("id").eq("id", id).maybeSingle();
  return Boolean(data);
}

export async function updateAffiliateProgramAction(input: {
  id: string;
  assignedOwner?: string;
  nextAction?: string;
  notes?: string;
  requirements?: string;
  restrictions?: string;
  affiliateTestUrl?: string;
}): Promise<Result> {
  const { supabase } = await requireAdminProfile();
  if (!await programExists(supabase, input.id)) return { ok: false, error: "Supplier program not found." };
  const affiliateTestUrl = optionalHttpUrl(input.affiliateTestUrl);
  if (!affiliateTestUrl.ok) return { ok: false, error: "Enter a valid http or https affiliate link." };
  const { error } = await supabase.from("affiliate_programs").update({
    assigned_owner: clean(input.assignedOwner, 160) || null,
    next_action: clean(input.nextAction, 1000),
    notes: clean(input.notes, 5000),
    application_requirements: clean(input.requirements, 5000),
    program_restrictions: clean(input.restrictions, 5000),
    affiliate_test_url: affiliateTestUrl.value,
    updated_at: new Date().toISOString(),
  }).eq("id", input.id);
  if (error) return { ok: false, error: "Could not save this supplier." };
  revalidatePath(PAGE);
  return { ok: true };
}

const AMAZON_AFFILIATE_LINK = "https://www.amazon.com/?linkCode=sl2&tag=avantiabuild2-20&linkId=37ba5983fc2a19619d802dd9b6680c4d&language=en_US&ref_=as_li_ss_tl";
const AMAZON_LINK_NOTE = "Verified Amazon SiteStripe homepage affiliate link recorded on 2026-08-27 for StoreID avantiabuild2-20.";

export async function recordAmazonAffiliateLinkAction(): Promise<Result> {
  const { supabase, user } = await requireAdminProfile();
  const { data: program, error: findError } = await supabase.from("affiliate_programs").select("id,notes").eq("supplier_name", "Amazon Associates").maybeSingle<{ id: string; notes: string }>();
  if (findError || !program) return { ok: false, error: "Amazon Associates was not found." };
  const notes = program.notes.includes(AMAZON_LINK_NOTE) ? program.notes : `${program.notes.trim()}\n\n${AMAZON_LINK_NOTE}`.trim();
  const { error } = await supabase.from("affiliate_programs").update({
    affiliate_test_url: AMAZON_AFFILIATE_LINK,
    safe_tracking_id: "avantiabuild2-20",
    assigned_owner: "David Avitan",
    next_action: "Publish relevant Amazon product links with the required disclosure, complete U.S. tax and payment setup, and reach 3 qualifying purchases within 180 days for Amazon's final review.",
    notes,
    last_verified_date: "2026-08-27",
    updated_at: new Date().toISOString(),
  }).eq("id", program.id);
  if (error) return { ok: false, error: "Could not save the verified Amazon affiliate link." };
  await supabase.from("affiliate_program_checklist").update({ completed: true, completed_at: new Date().toISOString(), completed_by: user.id }).eq("program_id", program.id).in("item_key", ["commission", "cookie", "tracking", "test_link", "test_click", "redirect", "no_secrets", "integration_notes"]);
  await supabase.from("affiliate_program_activities").insert({ program_id: program.id, activity_type: "note", title: "Verified affiliate link recorded", details: AMAZON_LINK_NOTE, created_by: user.id });
  revalidatePath(PAGE);
  return { ok: true };
}

const IMPACT_APPROVAL_NOTE = "Impact Marketplace publisher account 7653928 was re-screened and approved on 2026-08-27. This approves AvantiaBuild as an Impact partner; each retailer still requires a separate brand application and approval.";
const IMPACT_NEXT_ACTIONS: Record<string, string> = {
  "Ace Hardware": "Open Ace Hardware in the approved Impact Marketplace account and submit the brand application.",
  "Acme Tools": "Open Acme Tools in the approved Impact Marketplace account and submit the brand application.",
  "Blinds.com": "Open Blinds.com in the approved Impact Marketplace account and submit the brand application.",
  Castlery: "Complete the Castlery Ambassador form, then submit or connect the brand application in the approved Impact account.",
  "Ferguson Home": "Find Ferguson Home in the approved Impact Marketplace account and submit as a professional builder and remodeling platform.",
  "Home Depot": "Open The Home Depot campaign in the approved Impact Marketplace account and submit the brand application.",
  Lightology: "Find Lightology in the approved Impact Marketplace account and submit the brand application.",
  "Lights.com": "Search the approved Impact Marketplace account for Lights.com; submit if its campaign is available, otherwise await the partnerships team's campaign link.",
  Lumens: "Find Lumens in the approved Impact Marketplace account and submit the brand application.",
  "Target Partners": "Open Target Partners in the approved Impact Marketplace account and submit after the core construction retailers.",
  "The RTA Store": "Open The RTA Store in the approved Impact Marketplace account and submit the brand application.",
  "The Tool Nut": "Open The Tool Nut in the approved Impact Marketplace account and submit the brand application.",
};

export async function recordImpactMarketplaceApprovalAction(): Promise<Result> {
  const { supabase, user } = await requireAdminProfile();
  const { data: programs, error: findError } = await supabase.from("affiliate_programs").select("id,supplier_name,notes,next_action").ilike("affiliate_network", "%Impact%");
  if (findError || !programs) return { ok: false, error: "Could not load the Impact retailer list." };

  for (const program of programs) {
    const notes = program.notes.includes(IMPACT_APPROVAL_NOTE) ? program.notes : `${program.notes.trim()}\n\n${IMPACT_APPROVAL_NOTE}`.trim();
    const nextAction = IMPACT_NEXT_ACTIONS[program.supplier_name] ?? program.next_action;
    const { error } = await supabase.from("affiliate_programs").update({ notes, next_action: nextAction, last_verified_date: "2026-08-27", updated_at: new Date().toISOString() }).eq("id", program.id);
    if (error) return { ok: false, error: `Could not update ${program.supplier_name}.` };
  }

  const { data: existing } = await supabase.from("affiliate_integrations").select("id").eq("supplier_name", "Impact Marketplace").limit(1).maybeSingle<{ id: string }>();
  const integration = {
    supplier_name: "Impact Marketplace",
    relationship_type: "Publisher network",
    status: "Approved",
    submitted_at: "2026-08-23",
    submission_result: "Publisher application re-screened and accepted",
    current_stage: "Publisher account active",
    requested_capabilities: ["Brand marketplace", "Tracked affiliate links", "Campaign reporting"],
    next_action: "Apply to each relevant retailer separately and record every brand decision.",
    notes: IMPACT_APPROVAL_NOTE,
    updated_at: new Date().toISOString(),
  };
  const { error: integrationError } = existing
    ? await supabase.from("affiliate_integrations").update(integration).eq("id", existing.id)
    : await supabase.from("affiliate_integrations").insert(integration);
  if (integrationError) return { ok: false, error: "The retailer records were updated, but the Impact network status could not be saved." };

  if (programs.length) await supabase.from("affiliate_program_activities").insert(programs.map((program) => ({ program_id: program.id, activity_type: "note", title: "Impact publisher account approved", details: IMPACT_APPROVAL_NOTE, created_by: user.id })));
  revalidatePath(PAGE);
  return { ok: true };
}

export async function changeAffiliateStatusAction(input: {
  id: string;
  status: string;
  applicationDate?: string;
  applicationEmail?: string;
  confirmationReceived?: boolean;
  followUpDate?: string;
  approvalDate?: string;
  approvedCommission?: string;
  cookieWindow?: string;
  promotionalMethods?: string;
  affiliateNetwork?: string;
  safeTrackingId?: string;
  productFeedsAllowed?: boolean;
  deepLinksAllowed?: boolean;
  apiAllowed?: boolean;
  productImagesAllowed?: boolean;
}): Promise<Result> {
  const { supabase, user } = await requireAdminProfile();
  if (!validStatus(input.status)) return { ok: false, error: "Choose a valid status." };
  const { data: current } = await supabase.from("affiliate_programs").select("affiliate_status").eq("id", input.id).maybeSingle<{ affiliate_status: AffiliateStatus }>();
  if (!current) return { ok: false, error: "Supplier program not found." };

  if (input.status === "Set Up") {
    const { count } = await supabase.from("affiliate_program_checklist").select("id", { count: "exact", head: true }).eq("program_id", input.id).eq("completed", false);
    if ((count ?? 1) > 0) return { ok: false, error: "Complete every setup checklist item before marking this program Set Up." };
  }
  if (input.status === "Applied" && (!input.applicationDate || !clean(input.applicationEmail, 254))) {
    return { ok: false, error: "Application date and application email are required." };
  }
  if (input.status === "Approved" && (!input.approvalDate || !clean(input.approvedCommission))) {
    return { ok: false, error: "Approval date and approved commission are required." };
  }

  const update: Record<string, unknown> = { affiliate_status: input.status, updated_at: new Date().toISOString() };
  if (input.status === "Applied") Object.assign(update, {
    application_date: input.applicationDate,
    application_email: clean(input.applicationEmail, 254),
    confirmation_received: Boolean(input.confirmationReceived),
    next_follow_up_date: input.followUpDate || null,
  });
  if (input.status === "Approved") Object.assign(update, {
    approval_date: input.approvalDate,
    approved_commission: clean(input.approvedCommission, 160),
    cookie_window: clean(input.cookieWindow, 160),
    approved_promotional_methods: clean(input.promotionalMethods, 1000),
    affiliate_network: clean(input.affiliateNetwork, 160),
    safe_tracking_id: clean(input.safeTrackingId, 200) || null,
    product_feeds_allowed: Boolean(input.productFeedsAllowed),
    deep_links_allowed: Boolean(input.deepLinksAllowed),
    api_allowed: Boolean(input.apiAllowed),
    product_images_allowed: Boolean(input.productImagesAllowed),
  });
  if (input.status === "Set Up") update.setup_date = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("affiliate_programs").update(update).eq("id", input.id);
  if (error) return { ok: false, error: error.message.includes("checklist") ? error.message : "Could not change the affiliate status." };
  await supabase.from("affiliate_program_activities").insert({
    program_id: input.id, activity_type: "status", title: `Status changed to ${input.status}`,
    old_status: current.affiliate_status, new_status: input.status, created_by: user.id,
  });
  revalidatePath(PAGE);
  return { ok: true };
}

export async function addAffiliateActivityAction(input: { id: string; type: "note" | "contact" | "follow_up"; details: string; followUpDate?: string }): Promise<Result> {
  const { supabase, user } = await requireAdminProfile();
  const details = clean(input.details, 5000);
  if (!details) return { ok: false, error: "Enter a note or contact summary." };
  if (!await programExists(supabase, input.id)) return { ok: false, error: "Supplier program not found." };
  const title = input.type === "contact" ? "Contact recorded" : input.type === "follow_up" ? "Follow-up scheduled" : "Note added";
  const { error } = await supabase.from("affiliate_program_activities").insert({ program_id: input.id, activity_type: input.type, title, details, created_by: user.id });
  if (!error && input.type === "contact") await supabase.from("affiliate_programs").update({ last_contact_date: new Date().toISOString().slice(0, 10) }).eq("id", input.id);
  if (!error && input.type === "follow_up" && input.followUpDate) await supabase.from("affiliate_programs").update({ next_follow_up_date: input.followUpDate }).eq("id", input.id);
  if (error) return { ok: false, error: "Could not save this activity." };
  revalidatePath(PAGE);
  return { ok: true };
}

export async function toggleAffiliateChecklistAction(input: { id: string; completed: boolean }): Promise<Result> {
  const { supabase, user } = await requireAdminProfile();
  const { error } = await supabase.from("affiliate_program_checklist").update({ completed: input.completed, completed_at: input.completed ? new Date().toISOString() : null, completed_by: input.completed ? user.id : null }).eq("id", input.id);
  if (error) return { ok: false, error: "Could not update the checklist." };
  revalidatePath(PAGE);
  return { ok: true };
}

export async function saveAffiliateReadinessAction(input: { readiness: Record<string, boolean>; applicationDescription: string; audienceDescription: string; promotionDescription: string }): Promise<Result> {
  const { supabase } = await requireAdminProfile();
  const { error } = await supabase.from("affiliate_tracker_settings").update({
    readiness: input.readiness,
    application_description: clean(input.applicationDescription, 5000),
    audience_description: clean(input.audienceDescription, 5000),
    promotion_description: clean(input.promotionDescription, 5000),
    updated_at: new Date().toISOString(),
  }).eq("id", "global");
  if (error) return { ok: false, error: "Could not save application readiness." };
  revalidatePath(PAGE);
  return { ok: true };
}

export async function createAffiliateUploadAction(input: { programId: string; fileName: string; mimeType: string; fileSize: number }): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  const { supabase, user } = await requireAdminProfile();
  if (!await programExists(supabase, input.programId)) return { ok: false, error: "Supplier program not found." };
  if (input.fileSize <= 0 || input.fileSize > 10_485_760 || !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(input.mimeType)) return { ok: false, error: "Use a PDF, PNG, JPG, or WebP file under 10 MB." };
  const extension = input.fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${user.id}/${input.programId}/${crypto.randomUUID()}.${extension}`;
  const { data, error } = await supabase.storage.from("affiliate-confirmations").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "Could not prepare the confirmation upload." };
  return { ok: true, path, token: data.token };
}

export async function confirmAffiliateUploadAction(input: { programId: string; fileName: string; filePath: string; mimeType: string; fileSize: number }): Promise<Result> {
  const { supabase, user } = await requireAdminProfile();
  if (!input.filePath.startsWith(`${user.id}/${input.programId}/`)) return { ok: false, error: "Invalid confirmation file path." };
  const { error } = await supabase.from("affiliate_program_attachments").insert({ program_id: input.programId, file_name: clean(input.fileName, 240), file_path: input.filePath, mime_type: input.mimeType, file_size: input.fileSize, uploaded_by: user.id });
  if (error) return { ok: false, error: "The file uploaded, but its record could not be saved." };
  revalidatePath(PAGE);
  return { ok: true };
}
