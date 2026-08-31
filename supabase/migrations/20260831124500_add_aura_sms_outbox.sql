create table if not exists public.aura_sms_outbox (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique check (char_length(dedupe_key) between 10 and 200),
  message_kind text not null check (message_kind in ('auto_reply', 'confirmation_summary')),
  reply_draft_id uuid references public.aura_sms_reply_drafts(id) on delete cascade,
  pending_confirmation_id uuid references public.aura_sms_request_pending_confirmations(id) on delete cascade,
  source_communication_id uuid references public.aura_communications(id) on delete set null,
  part_index integer not null default 0 check (part_index between 0 and 20),
  part_count integer not null default 1 check (part_count between 1 and 21 and part_index < part_count),
  normalized_phone text not null check (normalized_phone ~ '^\+[1-9][0-9]{7,14}$'),
  message_body text not null check (char_length(message_body) between 1 and 1600),
  message_hash text not null check (message_hash ~ '^[a-f0-9]{64}$'),
  provider_from text,
  provider_message_id text,
  outgoing_communication_id uuid references public.aura_communications(id) on delete set null,
  status text not null default 'pending' check (status in (
    'pending', 'claimed', 'sending', 'retry_wait', 'ambiguous',
    'reconciling', 'sent', 'dead_letter', 'needs_review', 'cancelled'
  )),
  lock_token uuid,
  locked_at timestamptz,
  send_started_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count between 0 and 10),
  available_at timestamptz not null default now(),
  reconcile_attempt_count integer not null default 0 check (reconcile_attempt_count between 0 and 10),
  reconcile_after timestamptz,
  reconciled_at timestamptz,
  last_http_status integer,
  last_error_code text check (last_error_code is null or char_length(last_error_code) <= 100),
  last_error text check (last_error is null or char_length(last_error) <= 500),
  provider_accepted_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(reply_draft_id, pending_confirmation_id) = 1),
  check (provider_message_id is null or provider_message_id ~ '^AC[A-Za-z0-9_-]+$')
);

create unique index if not exists aura_sms_outbox_reply_part_uidx
  on public.aura_sms_outbox(reply_draft_id, part_index) where reply_draft_id is not null;
create unique index if not exists aura_sms_outbox_confirmation_part_uidx
  on public.aura_sms_outbox(pending_confirmation_id, part_index) where pending_confirmation_id is not null;
create unique index if not exists aura_sms_outbox_provider_message_uidx
  on public.aura_sms_outbox(provider_message_id) where provider_message_id is not null;
create index if not exists aura_sms_outbox_claim_idx
  on public.aura_sms_outbox(status, available_at, created_at) where status in ('pending', 'retry_wait');
create index if not exists aura_sms_outbox_reconcile_idx
  on public.aura_sms_outbox(status, reconcile_after, created_at) where status in ('ambiguous', 'reconciling');

create or replace function private.prevent_aura_sms_outbox_payload_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.dedupe_key is distinct from old.dedupe_key
     or new.message_kind is distinct from old.message_kind
     or new.reply_draft_id is distinct from old.reply_draft_id
     or new.pending_confirmation_id is distinct from old.pending_confirmation_id
     or new.source_communication_id is distinct from old.source_communication_id
     or new.part_index is distinct from old.part_index
     or new.part_count is distinct from old.part_count
     or new.normalized_phone is distinct from old.normalized_phone
     or new.message_body is distinct from old.message_body
     or new.message_hash is distinct from old.message_hash then
    raise exception 'Aura SMS outbox payload is immutable';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists protect_aura_sms_outbox_payload on public.aura_sms_outbox;
create trigger protect_aura_sms_outbox_payload
before update on public.aura_sms_outbox
for each row execute function private.prevent_aura_sms_outbox_payload_change();

alter table public.aura_sms_reply_drafts drop constraint if exists aura_sms_reply_drafts_decision_check;
alter table public.aura_sms_reply_drafts add constraint aura_sms_reply_drafts_decision_check
  check (decision in ('draft', 'auto_queued', 'auto_sent', 'send_ambiguous', 'blocked', 'sent_manually', 'send_failed'));

alter table public.aura_sms_outbox enable row level security;
revoke all on table public.aura_sms_outbox from public, anon, authenticated;
grant all on table public.aura_sms_outbox to service_role;

comment on table public.aura_sms_outbox is
  'Immutable service-role-only send intents. Ambiguous Quo outcomes are reconciled and never automatically re-posted.';

create or replace function public.dispatch_sms_outbox()
returns bigint language plpgsql security definer set search_path = '' as $$
declare project_url text; dispatch_secret text; request_id bigint;
begin
  select decrypted_secret into project_url from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into dispatch_secret from vault.decrypted_secrets where name = 'sms_automation_dispatch_secret' limit 1;
  if project_url is null or dispatch_secret is null then return null; end if;
  if project_url <> 'https://nprfhspwdflpqlopydmp.supabase.co' then return null; end if;
  select net.http_post(
    url := project_url || '/functions/v1/aura-sms-outbox-worker?mode=sms-outbox-dispatch',
    headers := jsonb_build_object('Content-Type','application/json','X-Sms-Automation-Dispatch',dispatch_secret),
    body := jsonb_build_object('action','drain'), timeout_milliseconds := 10000
  ) into request_id;
  return request_id;
end;
$$;
revoke all on function public.dispatch_sms_outbox() from public, anon, authenticated;

do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'dispatch-sms-outbox' limit 1;
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule('dispatch-sms-outbox', '30 seconds', 'select public.dispatch_sms_outbox();');
end;
$$;
