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
import {
  buildAuraShareVideoCaption,
  findAuraShareVideo,
} from "@/lib/aura/share-videos";
import { sendTwilioWhatsAppMessage } from "@/lib/aura/twilio-whatsapp";
import { requireOwnerAccess } from "@/lib/owner-access";
import { requireManagerPortalProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRODUCTION_SITE_ORIGIN } from "@/lib/site-url";
import { addAuraCommunicationLinks } from "@/lib/aura/email-links";
import { extractAuraProposal } from "@/lib/aura/intake";

function requireUuid(value: FormDataEntryValue | null) {
  const id = typeof value === "string" ? value.trim() : "";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    throw new Error("Invalid Aura intake ID.");
  }
  return id;
}

export type SendAuraMessageResult = { ok: true } | { ok: false; error: string };
export type PrepareQuoAttachmentResult =
  | { ok: true; deepLink: string; attachmentUrl: string; quoWebUrl: string }
  | { ok: false; error: string };
export type SendAuraVideoResult =
  { ok: true; title: string } | { ok: false; error: string };

type BrokerResult = { ok?: boolean; error?: string; id?: string };
export type TwoChatVoiceTokenResult =
  | { ok: true; token: string; from: string; expiresAt: string | null }
  | { ok: false; error: string };

async function invokeMessagingBroker(
  supabase: Awaited<ReturnType<typeof requireOwnerAccess>>["supabase"],
  body: Record<string, unknown>,
) {
  const { data, error } = await supabase.functions.invoke<BrokerResult>(
    "aura-messaging-broker",
    { body },
  );
  if (error || !data?.ok)
    throw new Error(
      data?.error || error?.message || "Messaging service is unavailable.",
    );
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
  supplierId?: string;
  supplierName?: string;
  materialRequestId?: string;
  materialRequestTitle?: string;
  sourceCommunicationId?: string;
}): Promise<SendAuraMessageResult> {
  const { supabase, access } = await requireManagerPortalProfile();
  if (!access.customers)
    return { ok: false, error: "Customer communication access is required." };
  const channel = input.channel;
  const message = input.message.trim();
  const phone =
    input.channel === "email" ? null : normalizeAuraPhone(input.recipient);
  const email =
    input.channel === "email" ? normalizeAuraEmail(input.recipient) : null;
  if (input.channel === "email" ? !email : !phone) {
    return {
      ok: false,
      error: `Enter a valid customer ${input.channel === "email" ? "email address" : "phone number"}.`,
    };
  }
  if (!message) return { ok: false, error: "Enter a message." };
  const messageLimit = channel === "email" ? 10_000 : 1_600;
  if (message.length > messageLimit)
    return {
      ok: false,
      error: `Keep the ${channel === "email" ? "email" : "message"} under ${messageLimit.toLocaleString("en-US")} characters.`,
    };

  try {
    if (channel === "sms") {
      try {
        await invokeMessagingBroker(supabase, {
          action: "send_sms",
          to: phone,
          message,
        });
      } catch {
        await sendAuraQuoText(phone!, message);
      }
    } else if (channel === "whatsapp") {
      let brokerError: unknown = null;
      try {
        await invokeMessagingBroker(supabase, {
          action: "send_whatsapp",
          to: phone,
          message,
          sourceCommunicationId: input.sourceCommunicationId,
        });
      } catch (error) {
        brokerError = error;
        const sent = await sendAuraWhatsAppText(phone!, message);
        if (!sent.sent)
          return { ok: false, error: whatsappSendError(brokerError) };
        await storeAuraCommunication({
          provider: "whatsapp",
          channel: "whatsapp",
          externalActivityId:
            sent.messageId || `whatsapp-out-${crypto.randomUUID()}`,
          direction: "outgoing",
          counterpartyPhone: phone,
          body: message,
          status: "sent",
        });
      }
    } else if (channel === "email") {
      const requestReference =
        input.materialRequestId &&
        /^[0-9a-f-]{36}$/i.test(input.materialRequestId)
          ? `[AVB-${input.materialRequestId.slice(0, 8).toUpperCase()}] `
          : "";
      const emailSubject = `${requestReference}${input.subject || ""}`.trim();
      let providerId: string | null = null;
      try {
        providerId =
          (
            await invokeMessagingBroker(supabase, {
              action: "send_email",
              to: email,
              subject: emailSubject,
              message,
            })
          ).id || null;
      } catch {
        providerId = (await sendAuraEmail(email!, emailSubject, message)).id;
      }
      if (providerId) {
        const admin = createAdminClient();
        const { data: communication } = await admin
          .from("aura_communications")
          .select("id")
          .eq("channel", "email")
          .eq("external_activity_id", providerId)
          .maybeSingle<{ id: string }>();
        if (communication?.id) {
          await addAuraCommunicationLinks(
            communication.id ? [communication.id] : [],
            [
              ...(input.supplierId
                ? [
                    {
                      entity_type: "supplier" as const,
                      entity_id: input.supplierId,
                      entity_label: input.supplierName || email!,
                      link_source: "manual" as const,
                      confidence: 1,
                    },
                  ]
                : []),
              ...(input.materialRequestId
                ? [
                    {
                      entity_type: "material_request" as const,
                      entity_id: input.materialRequestId,
                      entity_label:
                        input.materialRequestTitle || "Material request",
                      link_source: "manual" as const,
                      confidence: 1,
                    },
                  ]
                : []),
            ],
          );
        }
      }
    } else {
      return { ok: false, error: "Choose SMS, WhatsApp, or email." };
    }
  } catch (error) {
    const channelName =
      channel === "sms"
        ? "Q U O"
        : channel === "whatsapp"
          ? "WhatsApp"
          : "Email";
    return {
      ok: false,
      error:
        channel === "whatsapp"
          ? whatsappSendError(error)
          : `${channelName} could not send this message.`,
    };
  }

  revalidatePath("/owner/aura");
  revalidatePath("/admin/communications");
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function getTwoChatVoiceTokenAction(): Promise<TwoChatVoiceTokenResult> {
  const { supabase, access } = await requireManagerPortalProfile();
  if (!access.customers)
    return { ok: false, error: "Customer communication access is required." };
  try {
    const { data, error } = await supabase.functions.invoke<
      BrokerResult & {
        token?: string;
        from?: string;
        expiresAt?: string | null;
      }
    >("aura-messaging-broker", {
      body: { action: "twochat_voice_token" },
    });
    if (error || !data?.ok || !data.token || !data.from)
      throw new Error(
        data?.error || error?.message || "2Chat calling is unavailable.",
      );
    return {
      ok: true,
      token: data.token,
      from: data.from,
      expiresAt: data.expiresAt || null,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "2Chat calling is unavailable.",
    };
  }
}

export async function activateAuraTwoChatChannelAction(
  channel: "voice" | "whatsapp",
): Promise<SendAuraMessageResult> {
  const { supabase } = await requireOwnerAccess("/owner/aura/connect");
  try {
    await invokeMessagingBroker(supabase, {
      action:
        channel === "voice"
          ? "activate_2chat_voice"
          : "activate_2chat_whatsapp",
    });
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "The 2Chat channel could not be activated.",
    };
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
  "csv",
  "doc",
  "docx",
  "gif",
  "heic",
  "heif",
  "jpeg",
  "jpg",
  "mov",
  "mp4",
  "pdf",
  "png",
  "ppt",
  "pptx",
  "tif",
  "tiff",
  "txt",
  "webp",
  "xls",
  "xlsx",
]);

export async function prepareQuoAttachmentMessageAction(
  formData: FormData,
): Promise<PrepareQuoAttachmentResult> {
  const { supabase, user, access } = await requireManagerPortalProfile();
  if (!access.customers)
    return { ok: false, error: "Customer communication access is required." };
  const phone = normalizeAuraPhone(String(formData.get("phone") || ""));
  const message = String(formData.get("message") || "")
    .trim()
    .slice(0, 1600);
  const attachment = formData.get("attachment");
  if (!phone || !message)
    return { ok: false, error: "Enter a valid phone number and message." };
  if (!(attachment instanceof File) || attachment.size === 0)
    return { ok: false, error: "Choose a file." };
  if (attachment.size > 5 * 1024 * 1024)
    return { ok: false, error: "Keep Q U O attachments under 5 MB." };
  const originalExtension =
    attachment.name.split(".").pop()?.toLowerCase() || "";
  if (
    !QUO_ATTACHMENT_EXTENSIONS.has(originalExtension) ||
    (attachment.type &&
      attachment.type !== "application/octet-stream" &&
      !QUO_ATTACHMENT_TYPES.has(attachment.type))
  ) {
    return {
      ok: false,
      error:
        "Attach a common image, PDF, document, spreadsheet, presentation, text, or video file.",
    };
  }
  const extension = originalExtension.replace(/[^a-z0-9]/g, "");
  const path = `${user.id}/communications/${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage
    .from("project-uploads")
    .upload(path, attachment, {
      contentType: attachment.type || "application/octet-stream",
      upsert: false,
    });
  if (upload.error)
    return { ok: false, error: "The attachment could not be prepared." };
  const signed = await supabase.storage
    .from("project-uploads")
    .createSignedUrl(path, 24 * 60 * 60);
  if (signed.error || !signed.data?.signedUrl) {
    await supabase.storage.from("project-uploads").remove([path]);
    return { ok: false, error: "The attachment link could not be prepared." };
  }
  const params = new URLSearchParams({
    number: phone,
    from: "+15169088319",
    text: message,
    attachments: signed.data.signedUrl,
  });
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
  if (!access.customers)
    return { ok: false, error: "Customer communication access is required." };
  const phone = normalizeAuraPhone(input.recipient);
  const video = findAuraShareVideo(input.videoId);
  if (!phone)
    return { ok: false, error: "This contact needs a valid WhatsApp number." };
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
      if (!sent.sent)
        return { ok: false, error: "WhatsApp sending is not configured." };
      await storeAuraCommunication({
        provider: "whatsapp",
        channel: "whatsapp",
        externalActivityId:
          sent.messageId || `whatsapp-video-${crypto.randomUUID()}`,
        direction: "outgoing",
        counterpartyPhone: phone,
        body: caption,
        status: "queued",
        media: [{ url: mediaUrl, type: "video/mp4", duration: 20 }],
      });
    }
  } catch {
    return {
      ok: false,
      error:
        "The WhatsApp video could not be sent. Confirm that this contact can receive WhatsApp messages.",
    };
  }

  revalidatePath("/owner/aura");
  revalidatePath("/admin/communications");
  revalidatePath("/admin/users");
  return { ok: true, title: video.title };
}

export async function configureAuraProviderAction(
  formData: FormData,
): Promise<SendAuraMessageResult> {
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
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Connection could not be saved.",
    };
  }
  revalidatePath("/owner/aura");
  revalidatePath("/owner/aura/connect");
  revalidatePath("/admin/communications");
  return { ok: true };
}

export async function confirmAuraIntakeAction(formData: FormData) {
  const { supabase } = await requireOwnerAccess("/owner/ai-inbox");
  const intakeId = requireUuid(formData.get("intakeId"));
  const { data: intake, error: readError } = await supabase
    .from("aura_intakes")
    .select("status,proposal,message_text")
    .eq("id", intakeId)
    .maybeSingle<{
      status: string;
      proposal: Record<string, unknown>;
      message_text: string | null;
    }>();
  if (readError || !intake)
    throw new Error(
      `Unable to load AI Inbox item: ${readError?.message || "Not found"}`,
    );
  if (!["pending", "needs_follow_up"].includes(intake.status))
    throw new Error("This instruction is no longer waiting for approval.");

  if (intake.proposal.recordType === "supplier") {
    const supplier = intake.proposal.supplier as {
      name?: unknown;
      contactName?: unknown;
      phone?: unknown;
      email?: unknown;
      address?: unknown;
      notes?: unknown;
    } | null;
    const name =
      typeof supplier?.name === "string"
        ? supplier.name.trim().slice(0, 160)
        : "";
    if (!name)
      throw new Error(
        "Run the AI check again or add the supplier name before approval.",
      );
    const phone =
      typeof supplier?.phone === "string"
        ? supplier.phone.trim().slice(0, 80)
        : "";
    const email =
      typeof supplier?.email === "string"
        ? supplier.email.trim().toLowerCase().slice(0, 320)
        : "";
    const supplierId = `ai-phone-${intakeId}`;
    const { data: saved, error: supplierError } = await supabase.rpc(
      "staff_upsert_supplier_directory_entry",
      {
        p_supplier: {
          id: supplierId,
          name,
          contactLabel: "Phone intake",
          contactName:
            typeof supplier?.contactName === "string"
              ? supplier.contactName.trim().slice(0, 160)
              : "",
          phone,
          whatsapp: phone,
          email,
          address:
            typeof supplier?.address === "string"
              ? supplier.address.trim().slice(0, 500)
              : "",
          notes: [
            typeof supplier?.notes === "string" ? supplier.notes.trim() : "",
            intake.message_text
              ? `Added from owner phone instruction: ${intake.message_text.slice(0, 1200)}`
              : "",
          ]
            .filter(Boolean)
            .join("\n")
            .slice(0, 4000),
          trustLevel: "not-reviewed",
          preferredDeliveryMethod: email ? "email" : phone ? "phone" : "manual",
          catalogDepartments: [],
          catalogEnabledDepartments: [],
        },
        p_create: false,
      },
    );
    const savedId =
      saved &&
      typeof saved === "object" &&
      typeof (saved as { id?: unknown }).id === "string"
        ? (saved as { id: string }).id
        : supplierId;
    if (supplierError)
      throw new Error(`Unable to add supplier: ${supplierError.message}`);
    await invokeMessagingBroker(supabase, {
      action: "finalize_trusted_sms_supplier",
      intakeId,
      supplierId: savedId,
    });
  } else if (intake.proposal.recordType === "material_request") {
    const customerId = requireUuid(formData.get("customerId"));
    const request = intake.proposal.request as {
      title?: unknown;
      department?: unknown;
      notes?: unknown;
      projectAddress?: unknown;
      items?: unknown;
    } | null;
    const lines = Array.isArray(request?.items)
      ? request.items.flatMap((value) => {
          if (!value || typeof value !== "object") return [];
          const item = value as {
            name?: unknown;
            quantity?: unknown;
            unit?: unknown;
          };
          const name =
            typeof item.name === "string" ? item.name.trim().slice(0, 300) : "";
          const quantity =
            typeof item.quantity === "number" &&
            Number.isFinite(item.quantity) &&
            item.quantity > 0
              ? item.quantity
              : 1;
          if (!name) return [];
          return [
            {
              name,
              quantity,
              unit:
                typeof item.unit === "string" && item.unit.trim()
                  ? item.unit.trim().slice(0, 40)
                  : "each",
            },
          ];
        })
      : [];
    if (!lines.length)
      throw new Error(
        "Run AI check again so the request has at least one material item.",
      );
    const requestTitle =
      typeof request?.title === "string" && request.title.trim()
        ? request.title.trim().slice(0, 180)
        : "Material request from phone";
    const department =
      typeof request?.department === "string" && request.department.trim()
        ? request.department.trim().slice(0, 100)
        : "Unassigned";
    const notes = [
      typeof request?.notes === "string" ? request.notes.trim() : "",
      typeof request?.projectAddress === "string" &&
      request.projectAddress.trim()
        ? `Project address: ${request.projectAddress.trim()}`
        : "",
      intake.message_text
        ? `Original phone instruction: ${intake.message_text.slice(0, 1600)}`
        : "",
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 4000);
    await invokeMessagingBroker(supabase, {
      action: "claim_trusted_sms_material_request",
      intakeId,
    });
    const { data: requestId, error: requestError } = await supabase.rpc(
      "staff_create_client_request",
      {
        p_customer_id: customerId,
        p_department: department,
        p_title: requestTitle,
        p_lines: lines,
        p_notes: notes,
      },
    );
    if (requestError || typeof requestId !== "string") {
      await invokeMessagingBroker(supabase, {
        action: "release_trusted_sms_material_request",
        intakeId,
        error: requestError?.message || "Material request could not be created",
      });
      throw new Error(
        `Unable to create material request: ${requestError?.message || "No request ID returned"}`,
      );
    }
    await invokeMessagingBroker(supabase, {
      action: "finalize_trusted_sms_material_request",
      intakeId,
      requestId,
      customerId,
    });
  } else {
    await invokeMessagingBroker(supabase, {
      action: "confirm_trusted_sms_intake",
      intakeId,
    });
  }
  revalidatePath("/owner/aura");
  revalidatePath("/owner/ai-inbox");
  revalidatePath("/owner/materials/requests");
}

export async function reviewTrustedSmsIntakeAction(formData: FormData) {
  const { user, supabase } = await requireOwnerAccess("/owner/ai-inbox");
  const intakeId = requireUuid(formData.get("intakeId"));
  try {
    await invokeMessagingBroker(supabase, {
      action: "review_trusted_sms_intake",
      intakeId,
    });
    revalidatePath("/owner/ai-inbox");
    revalidatePath("/owner/aura");
    revalidatePath("/admin/goals-progress/website-work");
    return;
  } catch {
    // Keep the website-side AI path as a safe fallback when the broker is temporarily unavailable.
  }
  const admin = createAdminClient();
  const { data: intake, error: readError } = await admin
    .from("aura_intakes")
    .select("message_text,status,source,sender_phone")
    .eq("id", intakeId)
    .maybeSingle<{
      message_text: string | null;
      status: string;
      source: string;
      sender_phone: string;
    }>();
  if (readError || !intake)
    throw new Error(
      `Unable to load AI Inbox item: ${readError?.message || "Not found"}`,
    );
  if (
    intake.source !== "sms" ||
    intake.sender_phone !== "+13475675077" ||
    !intake.message_text ||
    !["pending", "needs_follow_up", "failed"].includes(intake.status)
  )
    throw new Error("This phone instruction cannot be reviewed.");
  const { proposal, model } = await extractAuraProposal(intake.message_text);
  const status = proposal.needsFollowUp ? "needs_follow_up" : "pending";
  const { error: updateError } = await admin
    .from("aura_intakes")
    .update({ proposal, ai_model: model, status, error_message: null })
    .eq("id", intakeId)
    .in("status", ["pending", "needs_follow_up", "failed"]);
  if (updateError)
    throw new Error(`AI review could not be saved: ${updateError.message}`);
  await admin.from("aura_audit_log").insert({
    intake_id: intakeId,
    actor_user_id: user.id,
    action: "ai_review_completed",
    details: { model, status },
  });
  revalidatePath("/owner/ai-inbox");
  revalidatePath("/owner/aura");
  revalidatePath("/admin/goals-progress/website-work");
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
  if (readError)
    throw new Error(`Unable to load Aura intake: ${readError.message}`);
  if (!intake || intake.status === "confirmed")
    throw new Error("This Aura intake cannot be cancelled.");

  const { error } = await supabase
    .from("aura_intakes")
    .update({ status: "cancelled" })
    .eq("id", intakeId);
  if (error) throw new Error(`Unable to cancel Aura intake: ${error.message}`);
  await supabase.from("aura_audit_log").insert({
    intake_id: intakeId,
    actor_user_id: user.id,
    action: "intake_cancelled",
    details: { source: "owner_dashboard" },
  });
  revalidatePath("/owner/aura");
  revalidatePath("/owner/ai-inbox");
}
