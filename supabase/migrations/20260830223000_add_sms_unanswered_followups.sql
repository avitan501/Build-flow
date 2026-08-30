create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create table if not exists public.aura_sms_unanswered_followups (
  id uuid primary key default gen_random_uuid(),
  source_communication_id uuid not null references public.aura_communications(id) on delete cascade,
  contact_id uuid references public.aura_contacts(id) on delete set null,
  counterparty_phone text not null,
  initial_outgoing_external_id text not null,
  prompt_text text not null check (char_length(prompt_text) between 2 and 320 and btrim(prompt_text) !~ '^[?？]+$'),
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'cancelled', 'failed')),
  claimed_at timestamptz,
  sent_at timestamptz,
  sent_communication_id uuid references public.aura_communications(id) on delete set null,
  cancel_reason text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_communication_id),
  check (due_at >= created_at + interval '10 minutes')
);

create index if not exists aura_sms_unanswered_followups_due_idx
  on public.aura_sms_unanswered_followups(due_at, created_at)
  where status = 'pending';

alter table public.aura_sms_unanswered_followups enable row level security;
revoke all on table public.aura_sms_unanswered_followups from public, anon, authenticated;
grant all on table public.aura_sms_unanswered_followups to service_role;

drop trigger if exists set_aura_sms_unanswered_followups_updated_at on public.aura_sms_unanswered_followups;
create trigger set_aura_sms_unanswered_followups_updated_at
before update on public.aura_sms_unanswered_followups
for each row execute function public.set_aura_updated_at();

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'sms_unanswered_followup_dispatch_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'sms_unanswered_followup_dispatch_secret',
      'Authenticates one-shot unanswered SMS follow-up dispatch'
    );
  end if;
end;
$$;

create or replace function public.dispatch_sms_unanswered_followups()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
  dispatch_secret text;
  request_id bigint;
begin
  if not exists (
    select 1 from public.aura_sms_unanswered_followups
    where status = 'pending' and due_at <= now()
  ) then return null; end if;

  select decrypted_secret into project_url
  from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into dispatch_secret
  from vault.decrypted_secrets where name = 'sms_unanswered_followup_dispatch_secret' limit 1;
  if project_url is null or dispatch_secret is null then return null; end if;

  select net.http_post(
    url := project_url || '/functions/v1/aura-messaging-broker?mode=sms-followup-dispatch',
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-SMS-Followup-Dispatch', dispatch_secret),
    body := jsonb_build_object('action', 'deliver_due'),
    timeout_milliseconds := 15000
  ) into request_id;
  return request_id;
end;
$$;

revoke all on function public.dispatch_sms_unanswered_followups() from public, anon, authenticated;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'dispatch-sms-unanswered-followups' limit 1;
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule('dispatch-sms-unanswered-followups', '* * * * *', 'select public.dispatch_sms_unanswered_followups();');
end;
$$;

comment on table public.aura_sms_unanswered_followups is
  'At-most-once customer intake reminders, due ten minutes after an unanswered safe AI question.';
