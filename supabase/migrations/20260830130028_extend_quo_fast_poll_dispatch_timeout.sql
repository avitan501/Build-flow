-- Allow one transient Edge gateway delay without missing the current fast-poll
-- window. The broker lease still prevents overlapping ingestion windows, and
-- the normal response returns in under one second.
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
    url := project_url || '/functions/v1/aura-messaging-broker?mode=quo-fast-poll',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Quo-Fast-Poll', dispatch_secret
    ),
    body := jsonb_build_object('action', 'start_fast_poll_window'),
    timeout_milliseconds := 30000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function public.dispatch_quo_fast_poll() from public, anon, authenticated;

comment on function public.dispatch_quo_fast_poll() is
  'Starts the authenticated Quo fast-poll fallback once per minute with a 30-second transient gateway allowance; the broker performs idempotent ingestion.';
