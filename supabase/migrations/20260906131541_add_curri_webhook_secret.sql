select vault.create_secret(
  replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  'curri_webhook_token',
  'Secret token generated for the Avantia Curri delivery webhook'
)
where not exists (select 1 from vault.secrets where name = 'curri_webhook_token');

create or replace function public.get_curri_webhook_token()
returns text
language sql
security definer
set search_path = ''
as $$
  select secret.decrypted_secret
  from vault.decrypted_secrets as secret
  where secret.name = 'curri_webhook_token'
  limit 1;
$$;

revoke all on function public.get_curri_webhook_token() from public;
revoke all on function public.get_curri_webhook_token() from anon;
revoke all on function public.get_curri_webhook_token() from authenticated;
grant execute on function public.get_curri_webhook_token() to service_role;
