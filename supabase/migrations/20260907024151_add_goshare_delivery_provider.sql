create or replace function public.get_goshare_credentials()
returns table (
  api_key text,
  api_base_url text
)
language sql
security definer
set search_path = ''
as $$
  select
    max(secret.decrypted_secret) filter (where secret.name = 'goshare_api_key'),
    coalesce(
      max(secret.decrypted_secret) filter (where secret.name = 'goshare_api_base_url'),
      'https://api.goshare.co'
    )
  from vault.decrypted_secrets as secret
  where secret.name in ('goshare_api_key', 'goshare_api_base_url')
  having count(*) filter (where secret.name = 'goshare_api_key') = 1;
$$;

revoke all on function public.get_goshare_credentials() from public;
revoke all on function public.get_goshare_credentials() from anon;
revoke all on function public.get_goshare_credentials() from authenticated;
grant execute on function public.get_goshare_credentials() to service_role;

select vault.create_secret(
  replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  'goshare_webhook_token',
  'Secret token generated for the Avantia GoShare delivery webhook'
)
where not exists (select 1 from vault.secrets where name = 'goshare_webhook_token');

create or replace function public.get_goshare_webhook_token()
returns text
language sql
security definer
set search_path = ''
as $$
  select secret.decrypted_secret
  from vault.decrypted_secrets as secret
  where secret.name = 'goshare_webhook_token'
  limit 1;
$$;

revoke all on function public.get_goshare_webhook_token() from public;
revoke all on function public.get_goshare_webhook_token() from anon;
revoke all on function public.get_goshare_webhook_token() from authenticated;
grant execute on function public.get_goshare_webhook_token() to service_role;

alter table public.delivery_booking_locks
  drop constraint if exists delivery_booking_locks_provider_check;

alter table public.delivery_booking_locks
  add constraint delivery_booking_locks_provider_check
  check (provider in ('Uber Direct', 'Curri', 'GoShare'));
