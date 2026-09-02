-- One durable ledger for manager-originated SMS, WhatsApp, and email sends.
-- The existing aura_sms_outbox is intentionally preserved because it owns the
-- specialized automated-reply state machine and historical records.
create table if not exists public.aura_message_outbox (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique check (char_length(dedupe_key) between 10 and 256),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  channel text not null check (channel in ('sms', 'whatsapp', 'email')),
  provider text not null check (provider in ('quo', 'two_chat', 'resend')),
  communication_id uuid references public.aura_communications(id) on delete set null,
  source_communication_id uuid references public.aura_communications(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  destination text not null check (char_length(destination) between 3 and 320),
  subject text check (subject is null or char_length(subject) <= 200),
  message_body text not null check (char_length(message_body) between 1 and 10000),
  status text not null default 'pending' check (status in (
    'pending', 'claimed', 'sending', 'retry_wait', 'accepted', 'sent',
    'delivered', 'read', 'failed', 'bounced', 'complained', 'ambiguous',
    'needs_review', 'cancelled'
  )),
  provider_message_id text,
  provider_status text check (provider_status is null or char_length(provider_status) <= 100),
  lock_token uuid,
  locked_at timestamptz,
  send_started_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count between 0 and 20),
  available_at timestamptz not null default now(),
  last_http_status integer,
  last_error_code text check (last_error_code is null or char_length(last_error_code) <= 100),
  last_error text check (last_error is null or char_length(last_error) <= 500),
  provider_accepted_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (channel = 'email' and destination ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or (channel in ('sms', 'whatsapp') and destination ~ '^\+[1-9][0-9]{7,14}$')
  )
);

create table if not exists public.aura_message_outbox_attachments (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid not null references public.aura_message_outbox(id) on delete restrict,
  position integer not null check (position between 0 and 9),
  storage_bucket text not null default 'project-uploads'
    check (storage_bucket = 'project-uploads'),
  storage_path text not null check (
    char_length(storage_path) between 10 and 500
    and storage_path !~ '(^|/)\.\.(/|$)'
  ),
  filename text not null check (char_length(filename) between 1 and 180),
  content_type text not null check (char_length(content_type) between 3 and 120),
  byte_size bigint not null check (byte_size between 1 and 26214400),
  content_sha256 text check (content_sha256 is null or content_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique (outbox_id, position),
  unique (outbox_id, storage_bucket, storage_path)
);

create table if not exists public.aura_message_outbox_events (
  id bigint generated always as identity primary key,
  outbox_id uuid not null references public.aura_message_outbox(id) on delete restrict,
  from_status text,
  to_status text not null,
  provider_message_id text,
  provider_status text,
  error_code text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists aura_message_outbox_provider_message_uidx
  on public.aura_message_outbox(provider, provider_message_id)
  where provider_message_id is not null;
create index if not exists aura_message_outbox_claim_idx
  on public.aura_message_outbox(status, available_at, created_at)
  where status in ('pending', 'retry_wait');
create index if not exists aura_message_outbox_communication_idx
  on public.aura_message_outbox(communication_id)
  where communication_id is not null;
create index if not exists aura_message_outbox_events_history_idx
  on public.aura_message_outbox_events(outbox_id, created_at, id);

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
     or new.message_body is distinct from old.message_body then
    raise exception 'Aura message outbox payload is immutable';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.prevent_aura_message_outbox_attachment_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Aura message outbox attachments are immutable';
end;
$$;

create or replace function private.prevent_aura_message_outbox_event_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Aura message outbox events are append-only';
end;
$$;

create or replace function private.record_aura_message_outbox_event()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status
     or new.provider_status is distinct from old.provider_status
     or new.last_error_code is distinct from old.last_error_code then
    insert into public.aura_message_outbox_events
      (outbox_id, from_status, to_status, provider_message_id, provider_status, error_code)
    values (
      new.id,
      case when tg_op = 'UPDATE' then old.status else null end,
      new.status,
      new.provider_message_id,
      new.provider_status,
      new.last_error_code
    );
  end if;
  return new;
end;
$$;

revoke all on function private.protect_aura_message_outbox_payload() from public;
revoke all on function private.prevent_aura_message_outbox_attachment_change() from public;
revoke all on function private.prevent_aura_message_outbox_event_change() from public;
revoke all on function private.record_aura_message_outbox_event() from public;

drop trigger if exists protect_aura_message_outbox_payload on public.aura_message_outbox;
create trigger protect_aura_message_outbox_payload
before update on public.aura_message_outbox
for each row execute function private.protect_aura_message_outbox_payload();

drop trigger if exists protect_aura_message_outbox_attachments on public.aura_message_outbox_attachments;
create trigger protect_aura_message_outbox_attachments
before update or delete on public.aura_message_outbox_attachments
for each row execute function private.prevent_aura_message_outbox_attachment_change();

drop trigger if exists protect_aura_message_outbox_events on public.aura_message_outbox_events;
create trigger protect_aura_message_outbox_events
before update or delete on public.aura_message_outbox_events
for each row execute function private.prevent_aura_message_outbox_event_change();

drop trigger if exists record_aura_message_outbox_event on public.aura_message_outbox;
create trigger record_aura_message_outbox_event
after insert or update on public.aura_message_outbox
for each row execute function private.record_aura_message_outbox_event();

alter table public.aura_message_outbox enable row level security;
alter table public.aura_message_outbox_attachments enable row level security;
alter table public.aura_message_outbox_events enable row level security;

revoke all on table public.aura_message_outbox from public, anon, authenticated;
revoke all on table public.aura_message_outbox_attachments from public, anon, authenticated;
revoke all on table public.aura_message_outbox_events from public, anon, authenticated;
grant all on table public.aura_message_outbox to service_role;
grant all on table public.aura_message_outbox_attachments to service_role;
grant select, insert on table public.aura_message_outbox_events to service_role;
grant usage, select on sequence public.aura_message_outbox_events_id_seq to service_role;

comment on table public.aura_message_outbox is
  'Immutable, service-role-only send intents for SMS, WhatsApp, and email. Provider delivery transitions are retained in the append-only event ledger.';
comment on table public.aura_message_outbox_attachments is
  'Private Storage object references resolved into fresh provider-safe URLs or bytes only at send time.';
comment on table public.aura_message_outbox_events is
  'Append-only delivery history. No communication or provider transition is overwritten.';

create or replace function public.dispatch_communication_outbox()
returns bigint language plpgsql security definer set search_path = '' as $$
declare project_url text; dispatch_secret text; request_id bigint;
begin
  select decrypted_secret into project_url
  from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into dispatch_secret
  from vault.decrypted_secrets where name = 'sms_automation_dispatch_secret' limit 1;
  if project_url is null or dispatch_secret is null then return null; end if;
  if project_url <> 'https://nprfhspwdflpqlopydmp.supabase.co' then return null; end if;
  select net.http_post(
    url := project_url || '/functions/v1/aura-communication-outbox-worker?mode=communication-outbox-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Communication-Outbox-Dispatch', dispatch_secret
    ),
    body := jsonb_build_object('action', 'drain'),
    timeout_milliseconds := 10000
  ) into request_id;
  return request_id;
end;
$$;
revoke all on function public.dispatch_communication_outbox() from public, anon, authenticated;

do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job
  where jobname = 'dispatch-communication-outbox' limit 1;
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule(
    'dispatch-communication-outbox',
    '30 seconds',
    'select public.dispatch_communication_outbox();'
  );
end;
$$;
