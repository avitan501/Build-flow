import "server-only";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";

export { verifyQuoSignature } from "@/lib/aura/quo-signature";
import { normalizeAuraPhone } from "@/lib/aura/identity";

const quoMediaSchema = z.object({
  url: z.string().url().max(4000),
  type: z.string().max(120).optional(),
  duration: z.number().nonnegative().optional(),
});

const quoObjectSchema = z
  .object({
    id: z.string().max(200).optional(),
    callId: z.string().max(200).optional(),
    object: z.string().max(80).optional(),
    from: z.string().max(100).optional(),
    to: z.union([z.string().max(100), z.array(z.string().max(100)).max(20)]).optional(),
    direction: z.enum(["incoming", "outgoing", "internal"]).optional(),
    body: z.string().max(100_000).optional(),
    text: z.string().max(100_000).optional(),
    status: z.string().max(100).optional(),
    createdAt: z.string().max(100).optional(),
    completedAt: z.string().max(100).nullable().optional(),
    answeredAt: z.string().max(100).nullable().optional(),
    phoneNumberId: z.string().max(200).optional(),
    conversationId: z.string().max(200).optional(),
    media: z.array(quoMediaSchema).max(20).optional(),
    voicemail: quoMediaSchema.nullable().optional(),
    summary: z.array(z.string().max(10_000)).max(100).optional(),
    nextSteps: z.array(z.string().max(2_000)).max(100).optional(),
    dialogue: z
      .array(
        z.object({
          content: z.string().max(100_000),
          identifier: z.string().max(200).optional(),
          start: z.number().optional(),
          end: z.number().optional(),
        }),
      )
      .max(10_000)
      .optional(),
    duration: z.number().nonnegative().optional(),
  })
  .passthrough();

const quoEventSchema = z.object({
  id: z.string().min(1).max(200),
  object: z.literal("event"),
  apiVersion: z.string().max(40).optional(),
  createdAt: z.string().max(100),
  type: z.enum([
    "message.received",
    "message.delivered",
    "call.ringing",
    "call.completed",
    "call.recording.completed",
    "call.summary.completed",
    "call.transcript.completed",
  ]),
  data: z.object({ object: quoObjectSchema }),
});

export type QuoWebhookEvent = z.infer<typeof quoEventSchema>;

function safeDate(value: string | null | undefined, fallback: string) {
  const date = new Date(value || fallback);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function allowedPhoneNumberIds() {
  return new Set(
    (process.env.AURA_QUO_PHONE_NUMBER_IDS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export function parseQuoEvent(payload: unknown) {
  return quoEventSchema.safeParse(payload);
}

function stringTo(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function communicationFields(event: QuoWebhookEvent) {
  const object = event.data.object;
  const isCall = event.type.startsWith("call.");
  const activityId = object.callId || object.id;
  if (!activityId) throw new Error("Quo event is missing an activity ID.");

  const direction = object.direction || null;
  const to = stringTo(object.to);
  const counterpartyPhone = normalizeAuraPhone(direction === "outgoing" ? to : object.from);
  const businessPhone = normalizeAuraPhone(direction === "outgoing" ? object.from : to);
  const transcript = object.dialogue
    ?.map((line) => `${line.identifier ? `${line.identifier}: ` : ""}${line.content}`)
    .join("\n");
  const media = [...(object.media || []), ...(object.voicemail ? [object.voicemail] : [])];
  const createdAt = safeDate(object.createdAt, event.createdAt);
  const completedAt = object.completedAt ? safeDate(object.completedAt, event.createdAt) : null;
  const calculatedDuration = completedAt
    ? Math.max(0, Math.round((new Date(completedAt).getTime() - new Date(createdAt).getTime()) / 1000))
    : null;

  return {
    activityId,
    channel: isCall ? ("call" as const) : ("sms" as const),
    externalConversationId: object.conversationId || null,
    direction,
    counterpartyPhone,
    businessPhone,
    body: object.body || object.text || null,
    summary: object.summary?.join("\n") || null,
    transcript: transcript || null,
    nextSteps: object.nextSteps || [],
    media,
    status: object.status || null,
    durationSeconds: object.duration == null ? calculatedDuration : Math.round(object.duration),
    occurredAt: createdAt,
    lastEventAt: safeDate(event.createdAt, event.createdAt),
    phoneNumberId: object.phoneNumberId || null,
  };
}

export async function storeQuoEvent(event: QuoWebhookEvent) {
  const supabase = createAdminClient();
  const fields = communicationFields(event);
  const allowedIds = allowedPhoneNumberIds();

  if (fields.phoneNumberId && (allowedIds.size === 0 || !allowedIds.has(fields.phoneNumberId))) {
    return { accepted: false as const, reason: "phone_number_not_allowed" as const };
  }

  const { data: priorEvent, error: eventCheckError } = await supabase
    .from("aura_webhook_events")
    .select("id, processed_at")
    .eq("provider", "quo")
    .eq("external_event_id", event.id)
    .maybeSingle();
  if (eventCheckError) throw new Error(`Unable to check Quo event: ${eventCheckError.message}`);
  if (priorEvent?.processed_at) return { accepted: true as const, duplicate: true as const };

  const { data: savedEvent, error: eventError } = await supabase
    .from("aura_webhook_events")
    .upsert(
      {
        provider: "quo",
        external_event_id: event.id,
        event_type: event.type,
        activity_id: fields.activityId,
        raw_payload: event,
        error_message: null,
      },
      { onConflict: "provider,external_event_id" },
    )
    .select("id")
    .single();
  if (eventError) throw new Error(`Unable to save Quo event: ${eventError.message}`);

  const { data: existing, error: existingError } = await supabase
    .from("aura_communications")
    .select("*")
    .eq("provider", "quo")
    .eq("external_activity_id", fields.activityId)
    .maybeSingle();
  if (existingError) throw new Error(`Unable to load Quo communication: ${existingError.message}`);

  if (!fields.phoneNumberId && !existing) {
    await supabase
      .from("aura_webhook_events")
      .update({ error_message: "Related call has not arrived yet." })
      .eq("id", savedEvent.id);
    throw new Error("Related Quo call has not arrived yet.");
  }

  const phone = fields.counterpartyPhone || existing?.counterparty_phone || null;
  let contactId = existing?.contact_id || null;
  if (!contactId && phone) {
    const { data: contact } = await supabase
      .from("aura_contacts")
      .select("id")
      .eq("normalized_phone", phone)
      .maybeSingle();
    contactId = contact?.id || null;
  }

  const lastEventAt = existing?.last_event_at && existing.last_event_at > fields.lastEventAt
    ? existing.last_event_at
    : fields.lastEventAt;
  const { error: communicationError } = await supabase.from("aura_communications").upsert(
    {
      provider: "quo",
      channel: fields.channel,
      external_activity_id: fields.activityId,
      external_conversation_id: fields.externalConversationId || existing?.external_conversation_id || null,
      contact_id: contactId,
      direction: fields.direction || existing?.direction || null,
      counterparty_phone: phone,
      business_phone: fields.businessPhone || existing?.business_phone || null,
      body: fields.body || existing?.body || null,
      summary: fields.summary || existing?.summary || null,
      transcript: fields.transcript || existing?.transcript || null,
      next_steps: fields.nextSteps.length ? fields.nextSteps : existing?.next_steps || [],
      media: fields.media.length ? fields.media : existing?.media || [],
      status: fields.status || existing?.status || null,
      duration_seconds: fields.durationSeconds ?? existing?.duration_seconds ?? null,
      occurred_at: existing?.occurred_at || fields.occurredAt,
      last_event_at: lastEventAt,
    },
    { onConflict: "provider,external_activity_id" },
  );
  if (communicationError) {
    await supabase
      .from("aura_webhook_events")
      .update({ error_message: communicationError.message })
      .eq("id", savedEvent.id);
    throw new Error(`Unable to save Quo communication: ${communicationError.message}`);
  }

  await supabase
    .from("aura_webhook_events")
    .update({ processed_at: new Date().toISOString(), error_message: null })
    .eq("id", savedEvent.id);
  return { accepted: true as const, duplicate: false as const };
}
