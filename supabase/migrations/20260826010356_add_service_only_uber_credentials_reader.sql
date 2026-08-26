create or replace function public.get_uber_direct_credentials()
returns table (
  customer_id text,
  client_id text,
  client_secret text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  return query
  select
    max(secret.decrypted_secret) filter (where secret.name = 'uber_direct_customer_id'),
    max(secret.decrypted_secret) filter (where secret.name = 'uber_direct_client_id'),
    max(secret.decrypted_secret) filter (where secret.name = 'uber_direct_client_secret')
  from vault.decrypted_secrets as secret
  where secret.name in (
    'uber_direct_customer_id',
    'uber_direct_client_id',
    'uber_direct_client_secret'
  );
end;
$$;

revoke all on function public.get_uber_direct_credentials() from public;
revoke all on function public.get_uber_direct_credentials() from anon;
revoke all on function public.get_uber_direct_credentials() from authenticated;
grant execute on function public.get_uber_direct_credentials() to service_role;
