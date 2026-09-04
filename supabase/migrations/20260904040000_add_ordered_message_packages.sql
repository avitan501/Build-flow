alter table public.aura_message_outbox
  add column if not exists package_key text,
  add column if not exists package_index smallint;

alter table public.aura_message_outbox
  drop constraint if exists aura_message_outbox_package_pair_check;
alter table public.aura_message_outbox
  add constraint aura_message_outbox_package_pair_check check (
    (package_key is null and package_index is null)
    or (char_length(package_key) between 10 and 256 and package_index between 0 and 20)
  );

create unique index if not exists aura_message_outbox_package_part_uidx
  on public.aura_message_outbox(package_key, package_index)
  where package_key is not null;

create or replace function private.protect_aura_message_outbox_payload()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.dedupe_key is distinct from old.dedupe_key
     or new.payload_hash is distinct from old.payload_hash
     or new.channel is distinct from old.channel
     or new.provider is distinct from old.provider
     or new.communication_id is distinct from old.communication_id
     or new.source_communication_id is distinct from old.source_communication_id
     or new.created_by is distinct from old.created_by
     or new.destination is distinct from old.destination
     or new.subject is distinct from old.subject
     or new.message_body is distinct from old.message_body
     or (old.package_key is not null and new.package_key is distinct from old.package_key)
     or (old.package_index is not null and new.package_index is distinct from old.package_index) then
    raise exception 'Aura message outbox payload is immutable';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.enqueue_aura_message_package_outbox(
  p_package_key text,
  p_channel text,
  p_destination text,
  p_messages jsonb,
  p_created_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  message_text text;
  message_index integer;
  payload_hash text;
  part_result jsonb;
  first_outbox_id uuid;
  existing_part_count integer;
  duplicate_package boolean := true;
begin
  if p_channel not in ('sms', 'whatsapp') then raise exception 'unsupported package channel'; end if;
  if p_package_key is null or char_length(p_package_key) not between 10 and 220 then
    raise exception 'invalid package key';
  end if;
  if jsonb_typeof(p_messages) <> 'array' or jsonb_array_length(p_messages) <> 2 then
    raise exception 'a Welcome Package requires exactly two messages';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('aura-package:' || p_package_key, 0));

  select min(id) filter (where package_index = 0), count(*)
  into first_outbox_id, existing_part_count
  from public.aura_message_outbox
  where package_key = p_package_key;
  if existing_part_count > 0 then
    if existing_part_count <> 2 or first_outbox_id is null then
      raise exception 'incomplete Welcome Package';
    end if;
    return jsonb_build_object(
      'outboxId', first_outbox_id,
      'partCount', 2,
      'duplicate', true
    );
  end if;

  for message_text, message_index in
    select value #>> '{}', ordinality::integer - 1
    from jsonb_array_elements(p_messages) with ordinality
  loop
    if message_text is null or char_length(trim(message_text)) not between 1 and 1600 then
      raise exception 'invalid package message';
    end if;
    payload_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.jsonb_build_object(
      'channel', p_channel,
      'destination', p_destination,
      'subject', null,
      'body', trim(message_text),
      'sourceCommunicationId', null,
      'attachments', '[]'::jsonb
    )::text, 'UTF8'), 'sha256'), 'hex');
    part_result := public.enqueue_aura_message_outbox(
      p_package_key || '/' || message_index::text,
      payload_hash,
      p_channel,
      p_destination,
      null,
      trim(message_text),
      null,
      p_created_by,
      '[]'::jsonb
    );
    update public.aura_message_outbox
    set package_key = p_package_key, package_index = message_index
    where id = (part_result ->> 'outboxId')::uuid
      and package_key is null;
    if message_index = 0 then first_outbox_id := (part_result ->> 'outboxId')::uuid; end if;
    duplicate_package := duplicate_package and coalesce((part_result ->> 'duplicate')::boolean, false);
  end loop;

  return jsonb_build_object(
    'outboxId', first_outbox_id,
    'partCount', 2,
    'duplicate', duplicate_package
  );
end;
$$;

revoke all on function public.enqueue_aura_message_package_outbox(text, text, text, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.enqueue_aura_message_package_outbox(text, text, text, jsonb, uuid)
  to service_role;
