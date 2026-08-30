create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- The Edge Function validates this secret with a constant-time comparison.
-- Keep it in Vault; never place the decrypted value in cron.job.command.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'quo_fast_poll_dispatch_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'quo_fast_poll_dispatch_secret',
      'Authenticates the scheduled Quo fast-ingress fallback'
    );
  end if;
end;
$$;

create or replace function public.dispatch_quo_fast_poll()
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
  where name = 'quo_fast_poll_dispatch_secret'
  limit 1;

  -- Fail closed when the established project URL or generated credential is
  -- unavailable. This avoids unauthenticated or cross-project dispatches.
  if project_url is null or dispatch_secret is null then return null; end if;
  if project_url <> 'https://nprfhspwdflpqlopydmp.supabase.co' then return null; end if;

  select net.http_post(
    url := project_url || '/functions/v1/aura-messaging-broker?mode=quo-fast-poll',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Quo-Fast-Poll', dispatch_secret
    ),
    body := jsonb_build_object('action', 'start_fast_poll_window'),
    timeout_milliseconds := 15000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function public.dispatch_quo_fast_poll() from public, anon, authenticated;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'dispatch-quo-fast-poll'
  limit 1;

  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule(
    'dispatch-quo-fast-poll',
    '* * * * *',
    'select public.dispatch_quo_fast_poll();'
  );
end;
$$;

comment on function public.dispatch_quo_fast_poll() is
  'Starts the authenticated Quo fast-poll fallback once per minute; the broker performs idempotent ingestion.';
