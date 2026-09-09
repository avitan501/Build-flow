create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

alter table public.aura_webhook_events
  add column if not exists attempts integer not null default 0,
  add column if not exists next_retry_at timestamptz;

create index if not exists aura_webhook_events_retry_idx
  on public.aura_webhook_events(next_retry_at, created_at)
  where provider = 'whatsapp' and processed_at is null and error_message is not null;

create table if not exists public.aura_channel_health (
  channel text primary key check (channel in ('whatsapp', 'sms', 'email', 'voice')),
  provider text,
  status text not null check (status in ('healthy', 'degraded', 'down')),
  checked_at timestamptz not null,
  last_success_at timestamptz,
  last_inbound_at timestamptz,
  last_error text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.aura_channel_health enable row level security;
revoke all on table public.aura_channel_health from public, anon, authenticated;
grant all on table public.aura_channel_health to service_role;

drop trigger if exists set_aura_channel_health_updated_at on public.aura_channel_health;
create trigger set_aura_channel_health_updated_at
before update on public.aura_channel_health
for each row execute function public.set_aura_updated_at();

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'aura_whatsapp_health_dispatch_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'aura_whatsapp_health_dispatch_secret',
      'Authenticates scheduled WhatsApp health checks and safe repair attempts'
    );
  end if;
end;
$$;

create or replace function public.dispatch_whatsapp_health_check()
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
  from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into dispatch_secret
  from vault.decrypted_secrets where name = 'aura_whatsapp_health_dispatch_secret' limit 1;
  if project_url is null or dispatch_secret is null then return null; end if;
  if project_url <> 'https://nprfhspwdflpqlopydmp.supabase.co' then return null; end if;

  select net.http_post(
    url := project_url || '/functions/v1/aura-messaging-broker?mode=whatsapp-health',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-WhatsApp-Health-Dispatch', dispatch_secret
    ),
    body := jsonb_build_object('repair', true),
    timeout_milliseconds := 45000
  ) into request_id;
  return request_id;
end;
$$;

revoke all on function public.dispatch_whatsapp_health_check() from public, anon, authenticated;
grant execute on function public.dispatch_whatsapp_health_check() to service_role;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job from cron.job
  where jobname = 'monitor-whatsapp-health' limit 1;
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule(
    'monitor-whatsapp-health',
    '*/5 * * * *',
    'select public.dispatch_whatsapp_health_check();'
  );
end;
$$;

comment on table public.aura_channel_health is
  'Private live integration health snapshots. Read and written only through authenticated server-side broker actions.';
comment on function public.dispatch_whatsapp_health_check() is
  'Runs an authenticated Meta WhatsApp subscription check, safe repair, and failed-event retry every five minutes.';
