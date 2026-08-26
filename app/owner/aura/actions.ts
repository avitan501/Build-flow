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
import { buildAuraShareVideoCaption, findAuraShareVideo } from "@/lib/aura/share-videos";
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
export type PrepareQuoAttachmentResult = { ok: true; deepLink: string; attachmentUrl: string; quoWebUrl: string } | { ok: false; error: string };
export type SendAuraVideoResult = { ok: true; title: string } | { ok: false; error: string };

type BrokerResult = { ok?: boolean; error?: string; id?: string };
export type TwoChatVoiceTokenResult =
  | { ok: true; token: string; from: string; expiresAt: string | null }
  | { ok: false; error: string };

async function invokeMessagingBroker(
  supabase: Awaited<ReturnType<typeof requireOwnerAccess>>["supabase"],
  body: Record<string, unknown>,
) {
  const { data, error } = await supabase.functions.invoke<BrokerResult>("aura-messaging-broker", { body });
  if (error || !data?.ok) throw new Error(data?.error || error?.message || "Messaging service is unavailable.");
  return data;
}

function whatsappSendError(error: unknown) {
  const detail = error instanceof Error ? error.message : "";
  if (/2Chat/i.test(detail)) return detail;
  if (detail.includes("63016") || /outside.*window|template/i.test(detail)) {
    return "This WhatsApp conversation is outside the 24-hour reply window. Start it with an approved WhatsApp template, or ask the recipient to message Avantia first.";
  }
  if (detail.includes("63015") || /sandbox|not.*joined/i.test(detail)) {
    return "This recipient has not joined the Avantia Twilio Sandbox. They must join and message the Sandbox before this test connection can reach them.";
  }
  return "WhatsApp could not deliver this message. Confirm that the business number is connected and try again.";
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
      let brokerError: unknown = null;
      try {
        await invokeMessagingBroker(supabase, { action: "send_whatsapp", to: phone, message });
      } catch (error) {
        brokerError = error;
        const sent = await sendAuraWhatsAppText(phone!, message);
        if (!sent.sent) return { ok: false, error: whatsappSendError(brokerError) };
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
  } catch (error) {
    const channelName = channel === "sms" ? "Q U O" : channel === "whatsapp" ? "WhatsApp" : "Email";
    return { ok: false, error: channel === "whatsapp" ? whatsappSendError(error) : `${channelName} could not send this message.` };
  }

  revalidatePath("/owner/aura");
  revalidatePath("/admin/communications");
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function getTwoChatVoiceTokenAction(): Promise<TwoChatVoiceTokenResult> {
  const { supabase, access } = await requireManagerPortalProfile();
  if (!access.customers) return { ok: false, error: "Customer communication access is required." };
  try {
    const { data, error } = await supabase.functions.invoke<BrokerResult & { token?: string; from?: string; expiresAt?: string | null }>("aura-messaging-broker", {
      body: { action: "twochat_voice_token" },
    });
    if (error || !data?.ok || !data.token || !data.from) throw new Error(data?.error || error?.message || "2Chat calling is unavailable.");
    return { ok: true, token: data.token, from: data.from, expiresAt: data.expiresAt || null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "2Chat calling is unavailable." };
  }
}

export async function activateAuraTwoChatChannelAction(channel: "voice" | "whatsapp"): Promise<SendAuraMessageResult> {
  const { supabase } = await requireOwnerAccess("/owner/aura/connect");
  try {
    await invokeMessagingBroker(supabase, {
      action: channel === "voice" ? "activate_2chat_voice" : "activate_2chat_whatsapp",
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The 2Chat channel could not be activated." };
  }
  revalidatePath("/owner/aura");
  revalidatePath("/owner/aura/connect");
  revalidatePath("/admin/communications");
  return { ok: true };
}

const QUO_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/webp",
  "text/csv",
  "text/plain",
  "video/mp4",
  "video/quicktime",
]);

const QUO_ATTACHMENT_EXTENSIONS = new Set([
  "csv", "doc", "docx", "gif", "heic", "heif", "jpeg", "jpg", "mov", "mp4", "pdf", "png", "ppt", "pptx", "tif", "tiff", "txt", "webp", "xls", "xlsx",
]);

export async function prepareQuoAttachmentMessageAction(formData: FormData): Promise<PrepareQuoAttachmentResult> {
  const { supabase, user, access } = await requireManagerPortalProfile();
  if (!access.customers) return { ok: false, error: "Customer communication access is required." };
  const phone = normalizeAuraPhone(String(formData.get("phone") || ""));
  const message = String(formData.get("message") || "").trim().slice(0, 1600);
  const attachment = formData.get("attachment");
  if (!phone || !message) return { ok: false, error: "Enter a valid phone number and message." };
  if (!(attachment instanceof File) || attachment.size === 0) return { ok: false, error: "Choose a file." };
  if (attachment.size > 5 * 1024 * 1024) return { ok: false, error: "Keep Q U O attachments under 5 MB." };
  const originalExtension = attachment.name.split(".").pop()?.toLowerCase() || "";
  if (!QUO_ATTACHMENT_EXTENSIONS.has(originalExtension) || (attachment.type && attachment.type !== "application/octet-stream" && !QUO_ATTACHMENT_TYPES.has(attachment.type))) {
    return { ok: false, error: "Attach a common image, PDF, document, spreadsheet, presentation, text, or video file." };
  }
  const extension = originalExtension.replace(/[^a-z0-9]/g, "");
  const path = `${user.id}/communications/${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage.from("project-uploads").upload(path, attachment, { contentType: attachment.type || "application/octet-stream", upsert: false });
  if (upload.error) return { ok: false, error: "The attachment could not be prepared." };
  const signed = await supabase.storage.from("project-uploads").createSignedUrl(path, 24 * 60 * 60);
  if (signed.error || !signed.data?.signedUrl) {
    await supabase.storage.from("project-uploads").remove([path]);
    return { ok: false, error: "The attachment link could not be prepared." };
  }
  const params = new URLSearchParams({ number: phone, from: "+15169088319", text: message, attachments: signed.data.signedUrl });
  return {
    ok: true,
    deepLink: `openphone://message?${params.toString()}`,
    attachmentUrl: signed.data.signedUrl,
    quoWebUrl: "https://my.quo.com/inbox",
  };
}

export async function sendAuraVideoAction(input: {
  recipient: string;
  recipientName?: string;
  videoId: string;
}): Promise<SendAuraVideoResult> {
  const { supabase, access } = await requireManagerPortalProfile();
  if (!access.customers) return { ok: false, error: "Customer communication access is required." };
  const phone = normalizeAuraPhone(input.recipient);
  const video = findAuraShareVideo(input.videoId);
  if (!phone) return { ok: false, error: "This contact needs a valid WhatsApp number." };
  if (!video) return { ok: false, error: "Choose an Avantia video." };

  const mediaUrl = new URL(video.path, PRODUCTION_SITE_ORIGIN).toString();
  const caption = buildAuraShareVideoCaption(video, input.recipientName);
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
    if (provider === "2chat") {
      await invokeMessagingBroker(supabase, {
        action: "configure_2chat",
        apiKey: String(formData.get("apiKey") || ""),
        from: String(formData.get("from") || ""),
      });
    } else if (provider === "quo") {
      await invokeMessagingBroker(supabase, {
        action: "configure_quo",
        apiKey: String(formData.get("apiKey") || ""),
        from: String(formData.get("from") || ""),
      });
    } else if (provider === "quo-webhook") {
      await invokeMessagingBroker(supabase, {
        action: "configure_quo_webhook",
        signingSecret: String(formData.get("signingSecret") || ""),
        phoneNumberId: String(formData.get("phoneNumberId") || ""),
      });
    } else {
      return { ok: false, error: "Choose a supported connection." };
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Connection could not be saved." };
  }
  revalidatePath("/owner/aura");
  revalidatePath("/owner/aura/connect");
  revalidatePath("/admin/communications");
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
