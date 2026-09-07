create or replace function public.get_uber_direct_webhook_signing_key()
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  return (
    select secret.decrypted_secret
    from vault.decrypted_secrets as secret
    where secret.name = 'uber_direct_webhook_signing_key'
    limit 1
  );
end;
$$;

revoke all on function public.get_uber_direct_webhook_signing_key() from public;
revoke all on function public.get_uber_direct_webhook_signing_key() from anon;
revoke all on function public.get_uber_direct_webhook_signing_key() from authenticated;
grant execute on function public.get_uber_direct_webhook_signing_key() to service_role;
