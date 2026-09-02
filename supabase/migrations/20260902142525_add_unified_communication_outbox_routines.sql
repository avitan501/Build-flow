create or replace function public.enqueue_aura_message_outbox(
  p_dedupe_key text,
  p_payload_hash text,
  p_channel text,
  p_destination text,
  p_subject text,
  p_message_body text,
  p_source_communication_id uuid,
  p_created_by uuid,
  p_attachments jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_row public.aura_message_outbox%rowtype;
  new_outbox_id uuid := gen_random_uuid();
  new_communication_id uuid;
  communication_provider text;
  delivery_provider text;
  linked_contact_id uuid;
  attachment jsonb;
  attachment_position integer := 0;
begin
  if p_channel not in ('sms', 'whatsapp', 'email') then
    raise exception 'unsupported communication channel';
  end if;
  if p_created_by is null then raise exception 'created_by is required'; end if;
  if p_dedupe_key is null or char_length(p_dedupe_key) not between 10 and 256 then
    raise exception 'invalid dedupe key';
  end if;
  if p_payload_hash is null or p_payload_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid payload hash';
  end if;
  if p_message_body is null or char_length(p_message_body) not between 1 and 10000 then
    raise exception 'invalid message body';
  end if;
  if jsonb_typeof(coalesce(p_attachments, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_attachments, '[]'::jsonb)) > 10 then
    raise exception 'invalid attachments';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('aura-outbox:' || p_dedupe_key, 0));
  select * into existing_row
  from public.aura_message_outbox
  where dedupe_key = p_dedupe_key
  limit 1;
  if found then
    if existing_row.payload_hash <> p_payload_hash then
      raise exception 'idempotency key reused with a different payload';
    end if;
    return jsonb_build_object(
      'outboxId', existing_row.id,
      'communicationId', existing_row.communication_id,
      'status', existing_row.status,
      'duplicate', true
    );
  end if;

  communication_provider := case p_channel
    when 'sms' then 'quo'
    when 'whatsapp' then 'whatsapp'
    else 'manual'
  end;
  delivery_provider := case p_channel
    when 'sms' then 'quo'
    when 'whatsapp' then 'two_chat'
    else 'resend'
  end;

  select id into linked_contact_id
  from public.aura_contacts
  where (p_channel = 'email' and lower(email) = lower(p_destination))
     or (p_channel <> 'email' and normalized_phone = p_destination)
  order by updated_at desc
  limit 1;

  insert into public.aura_communications (
    provider, channel, external_activity_id, contact_id, direction,
    counterparty_phone, counterparty_email, subject, body, media, status,
    occurred_at, last_event_at
  ) values (
    communication_provider,
    p_channel,
    new_outbox_id::text,
    linked_contact_id,
    'outgoing',
    case when p_channel <> 'email' then p_destination else null end,
    case when p_channel = 'email' then lower(p_destination) else null end,
    nullif(left(coalesce(p_subject, ''), 200), ''),
    p_message_body,
    coalesce(p_attachments, '[]'::jsonb),
    'queued',
    now(),
    now()
  ) returning id into new_communication_id;

  insert into public.aura_message_outbox (
    id, dedupe_key, payload_hash, channel, provider, communication_id,
    source_communication_id, created_by, destination, subject, message_body
  ) values (
    new_outbox_id, p_dedupe_key, p_payload_hash, p_channel, delivery_provider,
    new_communication_id, p_source_communication_id, p_created_by,
    case when p_channel = 'email' then lower(p_destination) else p_destination end,
    nullif(left(coalesce(p_subject, ''), 200), ''), p_message_body
  );

  for attachment in select value from jsonb_array_elements(coalesce(p_attachments, '[]'::jsonb)) loop
    if coalesce(attachment ->> 'storageBucket', '') <> 'project-uploads'
       or coalesce(attachment ->> 'storagePath', '') not like p_created_by::text || '/communications/%'
       or coalesce((attachment ->> 'byteSize')::bigint, 0) not between 1 and 26214400 then
      raise exception 'invalid attachment reference';
    end if;
    insert into public.aura_message_outbox_attachments (
      outbox_id, position, storage_bucket, storage_path, filename,
      content_type, byte_size, content_sha256
    ) values (
      new_outbox_id,
      attachment_position,
      attachment ->> 'storageBucket',
      attachment ->> 'storagePath',
      left(coalesce(nullif(attachment ->> 'filename', ''), 'attachment'), 180),
      left(coalesce(nullif(attachment ->> 'contentType', ''), 'application/octet-stream'), 120),
      (attachment ->> 'byteSize')::bigint,
      nullif(attachment ->> 'contentSha256', '')
    );
    attachment_position := attachment_position + 1;
  end loop;

  return jsonb_build_object(
    'outboxId', new_outbox_id,
    'communicationId', new_communication_id,
    'status', 'pending',
    'duplicate', false
  );
end;
$$;

revoke all on function public.enqueue_aura_message_outbox(
  text, text, text, text, text, text, uuid, uuid, jsonb
) from public, anon, authenticated;
grant execute on function public.enqueue_aura_message_outbox(
  text, text, text, text, text, text, uuid, uuid, jsonb
) to service_role;

create or replace function private.sync_aura_message_outbox_from_communication()
returns trigger language plpgsql set search_path = '' as $$
declare mapped_status text;
begin
  mapped_status := case lower(coalesce(new.status, ''))
    when 'accepted' then 'accepted'
    when 'queued' then 'accepted'
    when 'sent' then 'sent'
    when 'delivered' then 'delivered'
    when 'read' then 'read'
    when 'failed' then 'failed'
    when 'bounced' then 'bounced'
    when 'complained' then 'complained'
    else null
  end;
  if mapped_status is null then return new; end if;

  update public.aura_message_outbox
  set status = mapped_status,
      provider_status = left(new.status, 100),
      sent_at = case when mapped_status = 'sent' then coalesce(sent_at, now()) else sent_at end,
      delivered_at = case when mapped_status = 'delivered' then coalesce(delivered_at, now()) else delivered_at end,
      read_at = case when mapped_status = 'read' then coalesce(read_at, now()) else read_at end,
      failed_at = case when mapped_status in ('failed', 'bounced', 'complained') then coalesce(failed_at, now()) else failed_at end
  where communication_id = new.id
    and status not in ('cancelled', 'needs_review')
    and (
      mapped_status in ('failed', 'bounced', 'complained')
      or case mapped_status
        when 'accepted' then 1 when 'sent' then 2 when 'delivered' then 3 when 'read' then 4
        else 0
      end >= case status
        when 'pending' then 0 when 'claimed' then 0 when 'sending' then 0
        when 'retry_wait' then 0 when 'accepted' then 1 when 'sent' then 2
        when 'delivered' then 3 when 'read' then 4 else 0
      end
    );
  return new;
end;
$$;

revoke all on function private.sync_aura_message_outbox_from_communication() from public;

drop trigger if exists sync_aura_message_outbox_from_communication on public.aura_communications;
create trigger sync_aura_message_outbox_from_communication
after update of status on public.aura_communications
for each row when (new.status is distinct from old.status)
execute function private.sync_aura_message_outbox_from_communication();
