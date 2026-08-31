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
    url := project_url || '/functions/v1/aura-sms-automation-worker?mode=sms-automation-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Sms-Automation-Dispatch', dispatch_secret
    ),
    body := jsonb_build_object('action', 'drain'),
    timeout_milliseconds := 10000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function public.dispatch_sms_automation_queue()
  from public, anon, authenticated;
