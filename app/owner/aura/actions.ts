"use server";

import { revalidatePath } from "next/cache";

import {
  normalizeAuraPhone,
  normalizeAuraEmail,
  sendAuraEmail,
  sendAuraQuoText,
  storeAuraCommunication,
  type AuraMessageChannel,
} from "@/lib/aura/communications";
import { sendAuraWhatsAppText } from "@/lib/aura/whatsapp";
import { findAuraShareVideo } from "@/lib/aura/share-videos";
import { sendTwilioWhatsAppMessage } from "@/lib/aura/twilio-whatsapp";
import { requireOwnerAccess } from "@/lib/owner-access";
import { requireManagerPortalProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRODUCTION_SITE_ORIGIN } from "@/lib/site-url";

function requireUuid(value: FormDataEntryValue | null) {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Invalid Aura intake ID.");
  }
  return id;
}

export type SendAuraMessageResult = { ok: true } | { ok: false; error: string };
export type PrepareQuoPhotoResult = { ok: true; deepLink: string } | { ok: false; error: string };
export type SendAuraVideoResult = { ok: true; title: string } | { ok: false; error: string };

type BrokerResult = { ok?: boolean; error?: string; id?: string };

async function invokeMessagingBroker(
  supabase: Awaited<ReturnType<typeof requireOwnerAccess>>["supabase"],
  body: Record<string, unknown>,
) {
  const { data, error } = await supabase.functions.invoke<BrokerResult>("aura-messaging-broker", { body });
  if (error || !data?.ok) throw new Error(data?.error || error?.message || "Messaging service is unavailable.");
  return data;
}

export async function sendAuraMessageAction(input: {
  channel: AuraMessageChannel;
  recipient: string;
  subject?: string;
  message: string;
}): Promise<SendAuraMessageResult> {
  const { supabase, access } = await requireManagerPortalProfile();
  if (!access.customers) return { ok: false, error: "Customer communication access is required." };
  const channel = input.channel;
  const message = input.message.trim();
  const phone = input.channel === "email" ? null : normalizeAuraPhone(input.recipient);
  const email = input.channel === "email" ? normalizeAuraEmail(input.recipient) : null;
  if (input.channel === "email" ? !email : !phone) {
    return { ok: false, error: `Enter a valid customer ${input.channel === "email" ? "email address" : "phone number"}.` };
  }
  if (!message) return { ok: false, error: "Enter a message." };
  const messageLimit = channel === "email" ? 10_000 : 1_600;
  if (message.length > messageLimit) return { ok: false, error: `Keep the ${channel === "email" ? "email" : "message"} under ${messageLimit.toLocaleString("en-US")} characters.` };

  try {
    if (channel === "sms") {
      try {
        await invokeMessagingBroker(supabase, { action: "send_sms", to: phone, message });
      } catch {
        await sendAuraQuoText(phone!, message);
      }
    } else if (channel === "whatsapp") {
      try {
        await invokeMessagingBroker(supabase, { action: "send_whatsapp", to: phone, message });
      } catch {
        const sent = await sendAuraWhatsAppText(phone!, message);
        if (!sent.sent) return { ok: false, error: "WhatsApp sending is not configured." };
        await storeAuraCommunication({
          provider: "whatsapp",
          channel: "whatsapp",
          externalActivityId: sent.messageId || `whatsapp-out-${crypto.randomUUID()}`,
          direction: "outgoing",
          counterpartyPhone: phone,
          body: message,
          status: "sent",
        });
      }
    } else if (channel === "email") {
      try {
        await invokeMessagingBroker(supabase, { action: "send_email", to: email, subject: input.subject || "", message });
      } catch {
        await sendAuraEmail(email!, input.subject || "", message);
      }
    } else {
      return { ok: false, error: "Choose SMS, WhatsApp, or email." };
    }
  } catch {
    const channelName = channel === "sms" ? "Q U O" : channel === "whatsapp" ? "WhatsApp" : "Email";
    return { ok: false, error: `${channelName} could not send this message.` };
  }

  revalidatePath("/owner/aura");
  revalidatePath("/admin/communications");
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function prepareQuoPhotoMessageAction(formData: FormData): Promise<PrepareQuoPhotoResult> {
  const { supabase, user, access } = await requireManagerPortalProfile();
  if (!access.customers) return { ok: false, error: "Customer communication access is required." };
  const phone = normalizeAuraPhone(String(formData.get("phone") || ""));
  const message = String(formData.get("message") || "").trim().slice(0, 1600);
  const photo = formData.get("photo");
  if (!phone || !message) return { ok: false, error: "Enter a valid phone number and message." };
  if (!(photo instanceof File) || photo.size === 0) return { ok: false, error: "Choose a photo." };
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(photo.type)) return { ok: false, error: "Use a JPG, PNG, or WEBP photo." };
  if (photo.size > 600 * 1024) return { ok: false, error: "Keep Q U O photos under 600 KB for reliable carrier delivery." };
  const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/communications/${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage.from("project-uploads").upload(path, photo, { contentType: photo.type, upsert: false });
  if (upload.error) return { ok: false, error: "The photo could not be prepared." };
  const signed = await supabase.storage.from("project-uploads").createSignedUrl(path, 60 * 60);
  if (signed.error || !signed.data?.signedUrl) {
    await supabase.storage.from("project-uploads").remove([path]);
    return { ok: false, error: "The photo link could not be prepared." };
  }
  const params = new URLSearchParams({ number: phone, from: "+15169088319", text: message, attachments: signed.data.signedUrl });
  return { ok: true, deepLink: `openphone://message?${params.toString()}` };
}

export async function sendAuraVideoAction(input: {
  recipient: string;
  videoId: string;
}): Promise<SendAuraVideoResult> {
  const { supabase, access } = await requireManagerPortalProfile();
  if (!access.customers) return { ok: false, error: "Customer communication access is required." };
  const phone = normalizeAuraPhone(input.recipient);
  const video = findAuraShareVideo(input.videoId);
  if (!phone) return { ok: false, error: "This contact needs a valid WhatsApp number." };
  if (!video) return { ok: false, error: "Choose an Avantia video." };

  const mediaUrl = new URL(video.path, PRODUCTION_SITE_ORIGIN).toString();
  const caption = `Avantia Build — ${video.title}`;
  try {
    try {
      await invokeMessagingBroker(supabase, {
        action: "send_whatsapp",
        to: phone,
        message: caption,
        mediaUrl,
      });
    } catch {
      const sent = await sendTwilioWhatsAppMessage(phone, caption, mediaUrl);
      if (!sent.sent) return { ok: false, error: "WhatsApp sending is not configured." };
      await storeAuraCommunication({
        provider: "whatsapp",
        channel: "whatsapp",
        externalActivityId: sent.messageId || `whatsapp-video-${crypto.randomUUID()}`,
        direction: "outgoing",
        counterpartyPhone: phone,
        body: caption,
        status: "queued",
        media: [{ url: mediaUrl, type: "video/mp4", duration: 20 }],
      });
    }
  } catch {
    return { ok: false, error: "The WhatsApp video could not be sent. Confirm that this contact can receive WhatsApp messages." };
  }

  revalidatePath("/owner/aura");
  revalidatePath("/admin/communications");
  revalidatePath("/admin/users");
  return { ok: true, title: video.title };
}

export async function configureAuraProviderAction(formData: FormData): Promise<SendAuraMessageResult> {
  const { supabase } = await requireOwnerAccess("/owner/aura");
  const provider = String(formData.get("provider") || "");
  try {
    if (provider === "twilio") {
      await invokeMessagingBroker(supabase, {
        action: "configure_twilio",
        accountSid: String(formData.get("accountSid") || ""),
        authToken: String(formData.get("authToken") || ""),
        from: String(formData.get("from") || ""),
      });
    } else if (provider === "quo") {
      await invokeMessagingBroker(supabase, {
        action: "configure_quo",
        apiKey: String(formData.get("apiKey") || ""),
        from: String(formData.get("from") || ""),
      });
    } else {
      return { ok: false, error: "Choose a supported connection." };
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Connection could not be saved." };
  }
  revalidatePath("/owner/aura");
  return { ok: true };
}

export async function confirmAuraIntakeAction(formData: FormData) {
  const { user } = await requireOwnerAccess("/owner/aura");
  const intakeId = requireUuid(formData.get("intakeId"));
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("confirm_aura_intake", {
    p_intake_id: intakeId,
    p_actor_user_id: user.id,
  });
  if (error) throw new Error(`Unable to confirm Aura intake: ${error.message}`);
  revalidatePath("/owner/aura");
}

export async function cancelAuraIntakeAction(formData: FormData) {
  const { user } = await requireOwnerAccess("/owner/aura");
  const intakeId = requireUuid(formData.get("intakeId"));
  const supabase = createAdminClient();
  const { data: intake, error: readError } = await supabase
    .from("aura_intakes")
    .select("status")
    .eq("id", intakeId)
    .maybeSingle();
  if (readError) throw new Error(`Unable to load Aura intake: ${readError.message}`);
  if (!intake || intake.status === "confirmed") throw new Error("This Aura intake cannot be cancelled.");

  const { error } = await supabase.from("aura_intakes").update({ status: "cancelled" }).eq("id", intakeId);
  if (error) throw new Error(`Unable to cancel Aura intake: ${error.message}`);
  await supabase.from("aura_audit_log").insert({
    intake_id: intakeId,
    actor_user_id: user.id,
    action: "intake_cancelled",
    details: { source: "owner_dashboard" },
  });
  revalidatePath("/owner/aura");
}
