import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
import {
  attachmentCapability,
  classifyProviderOutcome,
  safeRetryDelaySeconds,
  type CommunicationOutboxChannel,
} from "../_shared/communication-outbox-policy.ts";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, {
  max: 1,
  prepare: false,
});
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const secretKeys = JSON.parse(
  Deno.env.get("SUPABASE_SECRET_KEYS") || "{}",
) as Record<string, string>;
const serviceKey =
  secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

type OutboxRow = {
  id: string;
  channel: CommunicationOutboxChannel;
  provider: "quo" | "two_chat" | "resend";
  communication_id: string | null;
  source_communication_id: string | null;
  destination: string;
  subject: string | null;
  message_body: string;
  lock_token: string;
  attempt_count: number;
};

type AttachmentRow = {
  storage_bucket: string;
  storage_path: string;
  filename: string;
  content_type: string;
  byte_size: number;
};

type MetaWhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  graphVersion: string;
};

async function metaWhatsAppConfig(): Promise<MetaWhatsAppConfig | null> {
  const [provider, accessToken, phoneNumberId, graphVersion] = await Promise.all([
    vaultSecret("aura_whatsapp_provider"),
    vaultSecret("aura_meta_whatsapp_access_token"),
    vaultSecret("aura_meta_whatsapp_phone_number_id"),
    vaultSecret("aura_meta_whatsapp_graph_version"),
  ]);
  if (
    provider !== "meta" ||
    !accessToken ||
    phoneNumberId !== "1266268263238386" ||
    !/^v\d+\.\d+$/.test(graphVersion || "")
  ) return null;
  return { accessToken, phoneNumberId, graphVersion: graphVersion! };
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function constantTimeEqual(left: string, right: string) {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.length !== rightBytes.length) return false;
  let result = 0;
  for (let index = 0; index < leftBytes.length; index += 1)
    result |= leftBytes[index] ^ rightBytes[index];
  return result === 0;
}

async function vaultSecret(name: string) {
  const rows = await sql<{ decrypted_secret: string }[]>`
    select decrypted_secret from vault.decrypted_secrets
    where name = ${name} limit 1
  `;
  return rows[0]?.decrypted_secret || null;
}

async function claimNext(): Promise<OutboxRow | null> {
  const rows = await sql.begin(async (transaction) => {
    await transaction`
      update public.aura_message_outbox
      set status = 'ambiguous', lock_token = null, locked_at = null,
          last_error_code = 'worker_stopped_during_send',
          last_error = 'The worker stopped after delivery began. The message will not be sent twice.'
      where status = 'sending' and locked_at < now() - interval '5 minutes'
    `;
    await transaction`
      update public.aura_message_outbox
      set status = 'retry_wait', lock_token = null, locked_at = null,
          available_at = now(), last_error_code = 'stale_claim_recovered',
          last_error = 'A claim expired before provider delivery began; safe retry scheduled.'
      where status = 'claimed' and locked_at < now() - interval '5 minutes'
    `;
    return await transaction<OutboxRow[]>`
      with candidate as (
        select candidate_outbox.id from public.aura_message_outbox as candidate_outbox
        where candidate_outbox.status in ('pending', 'retry_wait')
          and candidate_outbox.available_at <= now() and candidate_outbox.attempt_count < 10
          and not exists (
            select 1 from public.aura_message_outbox as prior
            where prior.package_key = candidate_outbox.package_key
              and prior.package_index < candidate_outbox.package_index
              and prior.status not in ('accepted', 'sent', 'delivered', 'read')
          )
        order by candidate_outbox.created_at, candidate_outbox.package_index nulls first, candidate_outbox.id
        limit 1
        for update skip locked
      )
      update public.aura_message_outbox as outbox
      set status = 'claimed', lock_token = gen_random_uuid(), locked_at = now(),
          attempt_count = outbox.attempt_count + 1,
          last_error = null, last_error_code = null
      from candidate where outbox.id = candidate.id
      returning outbox.id, outbox.channel, outbox.provider,
        outbox.communication_id, outbox.source_communication_id,
        outbox.destination, outbox.subject, outbox.message_body,
        outbox.lock_token, outbox.attempt_count
    `;
  });
  return rows[0] || null;
}

async function loadAttachments(outboxId: string) {
  return await sql<AttachmentRow[]>`
    select storage_bucket, storage_path, filename, content_type, byte_size
    from public.aura_message_outbox_attachments
    where outbox_id = ${outboxId}::uuid
    order by position
  `;
}

async function signedAttachment(attachment: AttachmentRow) {
  const signed = await admin.storage
    .from(attachment.storage_bucket)
    .createSignedUrl(attachment.storage_path, 15 * 60);
  if (signed.error || !signed.data?.signedUrl)
    throw new Error("attachment_signing_failed");
  return signed.data.signedUrl;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
}

async function emailAttachments(attachments: AttachmentRow[]) {
  const encoded: Array<{ filename: string; content: string }> = [];
  let totalBytes = 0;
  for (const attachment of attachments) {
    totalBytes += attachment.byte_size;
    if (totalBytes > 25 * 1024 * 1024)
      throw new Error("email_attachments_too_large");
    const downloaded = await admin.storage
      .from(attachment.storage_bucket)
      .download(attachment.storage_path);
    if (downloaded.error || !downloaded.data)
      throw new Error("attachment_download_failed");
    encoded.push({
      filename: attachment.filename,
      content: bytesToBase64(
        new Uint8Array(await downloaded.data.arrayBuffer()),
      ),
    });
  }
  return encoded;
}

async function providerRequest(row: OutboxRow, attachments: AttachmentRow[]) {
  if (row.provider === "quo") {
    const [apiKey, from] = await Promise.all([
      vaultSecret("aura_quo_api_key"),
      vaultSecret("aura_quo_from_number"),
    ]);
    if (!apiKey || !from) throw new Error("provider_not_configured");
    return await fetch("https://api.openphone.com/v1/messages", {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        content: row.message_body.slice(0, 1600),
        from,
        to: [row.destination],
      }),
    });
  }

  if (row.provider === "two_chat") {
    const selectedProvider = await vaultSecret("aura_whatsapp_provider");
    if (selectedProvider === "meta") {
      const meta = await metaWhatsAppConfig();
      if (!meta) throw new Error("provider_not_configured");
      const attachment = attachments[0];
      const mediaUrl = attachment ? await signedAttachment(attachment) : null;
      const type = attachment?.content_type.startsWith("image/")
        ? "image"
        : attachment?.content_type.startsWith("video/")
          ? "video"
          : attachment?.content_type.startsWith("audio/")
            ? "audio"
            : "document";
      const message = mediaUrl
        ? {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: row.destination.replace(/[^0-9]/g, ""),
            type,
            [type]: {
              link: mediaUrl,
              ...(type === "document" ? { filename: attachment.filename } : {}),
              ...(type !== "audio" && row.message_body ? { caption: row.message_body.slice(0, 1024) } : {}),
            },
          }
        : {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: row.destination.replace(/[^0-9]/g, ""),
            type: "text",
            text: { preview_url: true, body: row.message_body.slice(0, 4096) },
          };
      return await fetch(
        `https://graph.facebook.com/${meta.graphVersion}/${meta.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${meta.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        },
      );
    }
    const [apiKey, from] = await Promise.all([
      vaultSecret("aura_2chat_api_key"),
      vaultSecret("aura_2chat_whatsapp_from"),
    ]);
    if (!apiKey || !from) throw new Error("provider_not_configured");
    const mediaUrl = attachments[0]
      ? await signedAttachment(attachments[0])
      : undefined;
    return await fetch("https://api.p.2chat.io/open/whatsapp/send-message", {
      method: "POST",
      headers: {
        "X-User-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from_number: from,
        to_number: row.destination,
        text: row.message_body.slice(0, 4096),
        url: mediaUrl,
      }),
    });
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("provider_not_configured");
  return await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `avantia-outbox/${row.id}`,
    },
    body: JSON.stringify({
      from:
        Deno.env.get("RESEND_FROM_EMAIL") ||
        "Avantia Build <office@build.avantiap.com>",
      to: [row.destination],
      reply_to: "office@build.avantiap.com",
      subject: row.subject || "Message from Avantia Build",
      text: row.message_body,
      attachments: attachments.length
        ? await emailAttachments(attachments)
        : undefined,
    }),
  });
}

async function acceptedProviderId(
  provider: OutboxRow["provider"],
  payload: Record<string, unknown>,
) {
  if (provider === "quo") {
    const data = payload.data as Record<string, unknown> | undefined;
    return typeof data?.id === "string" ? data.id : null;
  }
  if (provider === "two_chat")
    return Array.isArray(payload.messages) &&
        typeof (payload.messages[0] as Record<string, unknown> | undefined)?.id === "string"
      ? String((payload.messages[0] as Record<string, unknown>).id)
      : typeof payload.message_uuid === "string"
        ? payload.message_uuid
        : null;
  return typeof payload.id === "string" ? payload.id : null;
}

async function markAccepted(
  row: OutboxRow,
  providerMessageId: string,
  providerStatus: string,
  attachments: AttachmentRow[],
) {
  await sql.begin(async (transaction) => {
    await transaction`
      update public.aura_message_outbox
      set status = 'accepted', provider_message_id = ${providerMessageId},
          provider_status = ${providerStatus}, provider_accepted_at = now(),
          sent_at = now(), lock_token = null, locked_at = null,
          last_error = null, last_error_code = null
      where id = ${row.id}::uuid and lock_token = ${row.lock_token}::uuid
        and status = 'sending'
    `;
    if (row.communication_id) {
      await transaction`
        update public.aura_communications
        set external_activity_id = ${providerMessageId},
            status = ${providerStatus || "accepted"},
            media = ${sql.json(
              attachments.map((attachment) => ({
                name: attachment.filename,
                type: attachment.content_type,
                storageBucket: attachment.storage_bucket,
                storagePath: attachment.storage_path,
              })),
            )},
            last_event_at = now(), updated_at = now()
        where id = ${row.communication_id}::uuid
      `;
    }
  });

  if (row.communication_id && row.source_communication_id && row.channel !== "email")
    await sql`
      insert into public.aura_request_state_communications
        (state_id, communication_id, channel, direction, delivery_status, occurred_at)
      select state.id, ${row.communication_id}::uuid, ${row.channel}, 'outgoing',
        'accepted', communication.occurred_at
      from public.aura_sms_request_states as state
      join public.aura_communications as communication
        on communication.id = ${row.communication_id}::uuid
      left join public.quote_requests as request on request.id = state.created_request_id
      where state.id = coalesce((
        select source_ledger.state_id
        from public.aura_request_state_communications as source_ledger
        where source_ledger.communication_id = ${row.source_communication_id}::uuid
        limit 1
      ), (
        select exact_state.id from public.aura_sms_request_states as exact_state
        where exact_state.last_inbound_communication_id = ${row.source_communication_id}::uuid
        order by exact_state.updated_at desc limit 1
      ))
      and (state.status in ('collecting', 'awaiting_confirmation')
        or (state.status = 'confirmed' and request.status <> 'closed'))
      on conflict (communication_id) do nothing
    `;
}

async function processOne(row: OutboxRow) {
  const attachments = await loadAttachments(row.id);
  const capability = attachmentCapability(row.channel, attachments.length);
  if (!capability.supported) {
    await sql`
      update public.aura_message_outbox
      set status = 'needs_review', lock_token = null, locked_at = null,
          last_error_code = ${capability.reason},
          last_error = 'This provider cannot safely deliver the selected attachments through its API.'
      where id = ${row.id}::uuid and lock_token = ${row.lock_token}::uuid
    `;
    return;
  }

  await sql`
    update public.aura_message_outbox
    set status = 'sending', send_started_at = now()
    where id = ${row.id}::uuid and lock_token = ${row.lock_token}::uuid
      and status = 'claimed'
  `;

  let providerResponse: Response;
  try {
    providerResponse = await providerRequest(row, attachments);
  } catch (error) {
    const safeCode = error instanceof Error && [
      "provider_not_configured",
      "attachment_signing_failed",
      "attachment_download_failed",
      "email_attachments_too_large",
    ].includes(error.message)
      ? error.message
      : "transport_outcome_unknown";
    await sql`
      update public.aura_message_outbox
      set status = ${safeCode === "transport_outcome_unknown" ? "ambiguous" : "needs_review"},
          lock_token = null, locked_at = null, last_error_code = ${safeCode},
          last_error = ${safeCode === "transport_outcome_unknown"
            ? "The connection ended after delivery began. The message will not be sent twice."
            : "Delivery requires configuration or attachment review."}
      where id = ${row.id}::uuid and lock_token = ${row.lock_token}::uuid
    `;
    return;
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await providerResponse.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }
  const outcome = classifyProviderOutcome(providerResponse.status);
  if (outcome.kind === "accepted") {
    const providerMessageId = await acceptedProviderId(row.provider, payload);
    if (!providerMessageId) {
      await sql`
        update public.aura_message_outbox
        set status = 'ambiguous', lock_token = null, locked_at = null,
            last_http_status = ${providerResponse.status},
            last_error_code = 'provider_id_missing',
            last_error = 'The provider accepted the request without a trackable message ID; no duplicate will be sent.'
        where id = ${row.id}::uuid and lock_token = ${row.lock_token}::uuid
      `;
      return;
    }
    const providerStatus = row.provider === "quo"
      ? String((payload.data as Record<string, unknown> | undefined)?.status || "queued")
      : row.provider === "two_chat" && Array.isArray(payload.messages) ? "accepted"
        : row.provider === "two_chat" ? "queued" : "sent";
    await markAccepted(row, providerMessageId, providerStatus, attachments);
    return;
  }

  if (outcome.kind === "retry") {
    const retryAfter = Number(providerResponse.headers.get("retry-after"));
    const delay = safeRetryDelaySeconds(row.attempt_count, retryAfter);
    await sql`
      update public.aura_message_outbox
      set status = 'retry_wait', available_at = now() + (${delay}::text || ' seconds')::interval,
          lock_token = null, locked_at = null, last_http_status = ${providerResponse.status},
          last_error_code = ${outcome.errorCode || "rate_limited"},
          last_error = 'The provider rate-limited delivery; a safe retry is scheduled.'
      where id = ${row.id}::uuid and lock_token = ${row.lock_token}::uuid
    `;
    return;
  }

  await sql`
    update public.aura_message_outbox
    set status = ${outcome.status}, lock_token = null, locked_at = null,
        failed_at = case when ${outcome.status} = 'failed' then now() else failed_at end,
        last_http_status = ${providerResponse.status},
        last_error_code = ${outcome.errorCode || "provider_rejected"},
        last_error = ${outcome.kind === "ambiguous"
          ? "The provider outcome is unknown; no duplicate will be sent."
          : "The provider rejected the message before acceptance."}
    where id = ${row.id}::uuid and lock_token = ${row.lock_token}::uuid
  `;
  if (row.communication_id)
    await sql`
      update public.aura_communications
      set status = ${outcome.status === "failed" ? "failed" : "needs_review"},
          last_event_at = now(), updated_at = now()
      where id = ${row.communication_id}::uuid
    `;
}

async function drain() {
  let processed = 0;
  for (; processed < 10; processed += 1) {
    const row = await claimNext();
    if (!row) break;
    await processOne(row);
  }
  return processed;
}

Deno.serve(async (request: Request) => {
  if (
    request.method !== "POST" ||
    new URL(request.url).searchParams.get("mode") !==
      "communication-outbox-dispatch"
  )
    return response({ error: "Method not allowed" }, 405);
  const expected = await vaultSecret("sms_automation_dispatch_secret");
  const supplied = request.headers.get("x-communication-outbox-dispatch") || "";
  if (!expected || !constantTimeEqual(expected, supplied))
    return response({ error: "Invalid dispatch secret" }, 401);
  try {
    return response({ ok: true, processed: await drain() });
  } catch {
    return response({ error: "Outbox processing failed" }, 500);
  }
});
