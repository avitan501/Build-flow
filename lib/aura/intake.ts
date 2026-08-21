import "server-only";

import { randomBytes } from "node:crypto";

import { openai } from "@ai-sdk/openai";
import { generateText, Output, transcribe } from "ai";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";

const optionalText = z.string().max(500).nullable();

export const auraProposalSchema = z.object({
  summary: z.string().min(1).max(400),
  contact: z
    .object({
      fullName: optionalText,
      phone: optionalText,
      email: optionalText,
      company: optionalText,
      notes: optionalText,
    })
    .nullable(),
  lead: z
    .object({
      title: z.string().min(1).max(160),
      description: optionalText,
      location: optionalText,
    })
    .nullable(),
  tasks: z
    .array(
      z.object({
        title: z.string().min(1).max(160),
        notes: optionalText,
        dueAt: z.string().max(80).nullable(),
        priority: z.enum(["low", "normal", "high", "urgent"]),
      }),
    )
    .max(10),
  missingInformation: z.array(z.string().min(1).max(160)).max(8),
  needsFollowUp: z.boolean(),
});

export type AuraProposal = z.infer<typeof auraProposalSchema>;

const selectedModel = process.env.OPENAI_AURA_MODEL || "gpt-5-mini";

function compact(value: string | null | undefined) {
  return value?.trim() || null;
}

function confirmationCode() {
  return randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
}

function normalizeDueAt(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeProposal(proposal: AuraProposal): AuraProposal {
  return {
    ...proposal,
    contact: proposal.contact
      ? {
          fullName: compact(proposal.contact.fullName),
          phone: compact(proposal.contact.phone),
          email: compact(proposal.contact.email)?.toLowerCase() || null,
          company: compact(proposal.contact.company),
          notes: compact(proposal.contact.notes),
        }
      : null,
    lead: proposal.lead
      ? {
          title: proposal.lead.title.trim(),
          description: compact(proposal.lead.description),
          location: compact(proposal.lead.location),
        }
      : null,
    tasks: proposal.tasks.map((task) => ({
      title: task.title.trim(),
      notes: compact(task.notes),
      dueAt: normalizeDueAt(task.dueAt),
      priority: task.priority,
    })),
    missingInformation: proposal.missingInformation.map((item) => item.trim()).filter(Boolean),
  };
}

export async function extractAuraProposal(
  messageText: string,
  image?: { data: Uint8Array; mediaType: string },
) {
  const now = new Date();
  const timeZone = process.env.AURA_TIME_ZONE || "America/New_York";
  const instructions = `You are Aura, a private intake assistant for the owner of a construction business.

Convert the owner's message and any attached image into a reviewable contact, lead, and task proposal.

Rules:
- Never invent a name, phone, email, company, address, deadline, or job detail.
- Read visible contact or job information from an attached business card, screenshot, or document image when present.
- A contact is a person or company the owner may need to reach.
- A lead is a possible job, customer opportunity, or sales opportunity.
- A task is a concrete follow-up action for the owner.
- A single message may contain a contact, a lead, multiple tasks, or any combination.
- Resolve relative dates using the supplied current time and time zone. Return dueAt as an ISO 8601 timestamp with an offset, or null when no reliable deadline exists.
- If important information is unclear, list it in missingInformation and set needsFollowUp to true.
- Keep summaries, notes, and titles short and factual.
- This is a draft only. Do not claim that anything has been saved or sent.`;
  const prompt = `Current time: ${now.toISOString()}
Business time zone: ${timeZone}

Owner message:
${messageText || "Please extract the useful contact, lead, or task details from the attached image."}`;
  const common = {
    model: openai(selectedModel),
    output: Output.object({
      name: "aura_intake_proposal",
      description: "A reviewable proposal for contacts, leads, and tasks. Nothing is saved until confirmed.",
      schema: auraProposalSchema,
    }),
    instructions,
  } as const;
  const { output } = image
    ? await generateText({
        ...common,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image", image: image.data, mediaType: image.mediaType },
            ],
          },
        ],
      })
    : await generateText({ ...common, prompt });

  return {
    proposal: normalizeProposal(output),
    model: selectedModel,
  };
}

export async function transcribeAuraAudio(audio: Uint8Array) {
  const result = await transcribe({
    model: openai.transcription("gpt-4o-mini-transcribe"),
    audio,
  });
  return result.text.trim();
}

export function buildAuraPreview(proposal: AuraProposal, code: string) {
  const lines = ["Aura understood:", proposal.summary];

  if (proposal.contact) {
    const identity = [proposal.contact.fullName, proposal.contact.company, proposal.contact.phone, proposal.contact.email]
      .filter(Boolean)
      .join(" · ");
    lines.push(`Contact: ${identity || "details not provided"}`);
  }
  if (proposal.lead) {
    lines.push(`Lead: ${proposal.lead.title}${proposal.lead.location ? ` · ${proposal.lead.location}` : ""}`);
  }
  for (const task of proposal.tasks) {
    lines.push(`Task: ${task.title}${task.dueAt ? ` · ${new Date(task.dueAt).toLocaleString("en-US", { timeZone: process.env.AURA_TIME_ZONE || "America/New_York" })}` : ""}`);
  }
  if (proposal.missingInformation.length > 0) {
    lines.push(`Missing: ${proposal.missingInformation.join("; ")}`);
  }

  lines.push(`Reply CONFIRM ${code} to save, or CANCEL ${code}.`);
  return lines.join("\n").slice(0, 3900);
}

export async function createAuraIntake(params: {
  externalMessageId: string;
  senderPhone: string;
  messageType: string;
  messageText: string;
  rawPayload: unknown;
  image?: { data: Uint8Array; mediaType: string };
}) {
  const supabase = createAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from("aura_intakes")
    .select("id, confirmation_code, proposal, status")
    .eq("external_message_id", params.externalMessageId)
    .maybeSingle();

  if (existingError) throw new Error(`Failed to check Aura intake idempotency: ${existingError.message}`);
  if (existing) {
    const proposal = auraProposalSchema.parse(existing.proposal);
    return {
      id: existing.id as string,
      code: existing.confirmation_code as string,
      proposal,
      status: existing.status as string,
      duplicate: true,
    };
  }

  const { proposal, model } = await extractAuraProposal(params.messageText, params.image);
  const code = confirmationCode();
  const status = proposal.needsFollowUp ? "needs_follow_up" : "pending";
  const { data, error } = await supabase
    .from("aura_intakes")
    .insert({
      source: "whatsapp",
      external_message_id: params.externalMessageId,
      sender_phone: params.senderPhone,
      message_type: params.messageType,
      message_text: params.messageText,
      raw_payload: params.rawPayload,
      proposal,
      status,
      confirmation_code: code,
      ai_model: model,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to save Aura intake: ${error.message}`);

  await supabase.from("aura_audit_log").insert({
    intake_id: data.id,
    action: "intake_created",
    details: { source: "whatsapp", externalMessageId: params.externalMessageId, status },
  });

  return { id: data.id as string, code, proposal, status, duplicate: false };
}

export async function confirmAuraIntakeByCode(code: string) {
  const supabase = createAdminClient();
  const normalizedCode = code.trim().toUpperCase();
  const { data: intake, error: intakeError } = await supabase
    .from("aura_intakes")
    .select("id, status")
    .eq("confirmation_code", normalizedCode)
    .maybeSingle();

  if (intakeError) throw new Error(`Failed to find Aura intake: ${intakeError.message}`);
  if (!intake) return { ok: false as const, reason: "not_found" as const };
  if (intake.status === "cancelled") return { ok: false as const, reason: "cancelled" as const };

  const { data, error } = await supabase.rpc("confirm_aura_intake", {
    p_intake_id: intake.id,
    p_actor_user_id: null,
  });
  if (error) throw new Error(`Failed to confirm Aura intake: ${error.message}`);
  return { ok: true as const, result: data };
}

export async function cancelAuraIntakeByCode(code: string) {
  const supabase = createAdminClient();
  const normalizedCode = code.trim().toUpperCase();
  const { data: intake, error: intakeError } = await supabase
    .from("aura_intakes")
    .select("id, status")
    .eq("confirmation_code", normalizedCode)
    .maybeSingle();

  if (intakeError) throw new Error(`Failed to find Aura intake: ${intakeError.message}`);
  if (!intake) return { ok: false as const, reason: "not_found" as const };
  if (intake.status === "confirmed") return { ok: false as const, reason: "confirmed" as const };

  const { error } = await supabase.from("aura_intakes").update({ status: "cancelled" }).eq("id", intake.id);
  if (error) throw new Error(`Failed to cancel Aura intake: ${error.message}`);
  await supabase.from("aura_audit_log").insert({ intake_id: intake.id, action: "intake_cancelled", details: {} });
  return { ok: true as const };
}
