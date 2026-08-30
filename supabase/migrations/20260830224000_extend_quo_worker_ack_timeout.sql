-- The isolated recovery worker can cold-start close to the former five-second
-- pg_net deadline. Ten seconds remains below the 30-second cron interval and
-- prevents a healthy dispatch from being abandoned during a cold start.
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

  if project_url is null or dispatch_secret is null then return null; end if;
  if project_url <> 'https://nprfhspwdflpqlopydmp.supabase.co' then return null; end if;

  select net.http_post(
    url := project_url || '/functions/v1/aura-quo-fast-poll-worker?mode=quo-fast-poll',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Quo-Fast-Poll', dispatch_secret
    ),
    body := jsonb_build_object('action', 'run_bounded_recovery_poll'),
    timeout_milliseconds := 10000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function public.dispatch_quo_fast_poll() from public, anon, authenticated;

comment on function public.dispatch_quo_fast_poll() is
  'Dispatches bounded Quo recovery to its isolated Edge worker with a cold-start-safe ACK deadline.';
