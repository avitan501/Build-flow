create table public.aura_sms_automation_queue (
  id bigint generated always as identity primary key,
  communication_id uuid not null
    references public.aura_communications(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  completed_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (communication_id)
);

comment on table public.aura_sms_automation_queue is
  'Durable, idempotent inbox for customer SMS automation. Webhooks acknowledge only after enqueue; workers retry transient failures.';

create index aura_sms_automation_queue_ready_idx
  on public.aura_sms_automation_queue(status, available_at, id)
  where status in ('pending', 'processing');

create trigger set_aura_sms_automation_queue_updated_at
before update on public.aura_sms_automation_queue
for each row execute function public.set_aura_updated_at();

alter table public.aura_sms_automation_queue enable row level security;
revoke all on table public.aura_sms_automation_queue from public, anon, authenticated;
revoke all on sequence public.aura_sms_automation_queue_id_seq from public, anon, authenticated;
grant all on table public.aura_sms_automation_queue to service_role;
grant usage, select on sequence public.aura_sms_automation_queue_id_seq to service_role;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'sms_automation_dispatch_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'sms_automation_dispatch_secret',
      'Authenticates the durable SMS automation queue worker'
    );
  end if;
end;
$$;

create or replace function public.dispatch_sms_automation_queue()
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
  select decrypted_secret into project_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;

  select decrypted_secret into dispatch_secret
  from vault.decrypted_secrets
  where name = 'sms_automation_dispatch_secret'
  limit 1;

  if project_url is null or dispatch_secret is null then return null; end if;
  if project_url <> 'https://nprfhspwdflpqlopydmp.supabase.co' then return null; end if;

  select net.http_post(
    url := project_url || '/functions/v1/aura-messaging-broker?mode=sms-automation-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Sms-Automation-Dispatch', dispatch_secret
    ),
    body := jsonb_build_object('action', 'drain'),
    timeout_milliseconds := 50000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function public.dispatch_sms_automation_queue() from public, anon, authenticated;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'dispatch-sms-automation-queue'
  limit 1;

  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule(
    'dispatch-sms-automation-queue',
    '30 seconds',
    'select public.dispatch_sms_automation_queue();'
  );
end;
$$;
