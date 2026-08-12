create or replace function public.staff_delete_supplier_quote_request(
  p_request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.';
  end if;

  if not (select private.has_staff_capability('suppliers'))
     and not (select private.is_admin()) then
    raise exception 'Supplier management permission is required.';
  end if;

  delete from public.supplier_quote_requests
   where id = p_request_id;

  get diagnostics deleted_count = row_count;
  return deleted_count = 1;
end;
$$;

revoke all on function public.staff_delete_supplier_quote_request(uuid)
  from public, anon;
grant execute on function public.staff_delete_supplier_quote_request(uuid)
  to authenticated, service_role;
