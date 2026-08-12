create or replace function public.staff_create_supplier_quote_request(
  p_supplier_id text,
  p_material_list text,
  p_job_address text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  supplier_entry jsonb;
  supplier_email text;
  request_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.';
  end if;

  if not (select private.has_staff_capability('suppliers'))
     and not (select private.is_admin()) then
    raise exception 'Supplier management permission is required.';
  end if;

  p_supplier_id := left(trim(coalesce(p_supplier_id, '')), 160);
  p_material_list := trim(coalesce(p_material_list, ''));
  p_job_address := left(trim(coalesce(p_job_address, '')), 500);

  if p_supplier_id = '' then raise exception 'supplier_not_found'; end if;
  if p_material_list = '' then raise exception 'material_list_required'; end if;
  if length(p_material_list) > 20000 then raise exception 'material_list_too_long'; end if;
  if p_job_address = '' then raise exception 'job_address_required'; end if;

  select supplier
    into supplier_entry
    from public.workflow_manager_settings
    cross join lateral jsonb_array_elements(state #> '{qualificationSettings,suppliers}') supplier
   where id = 'singleton'
     and supplier ->> 'id' = p_supplier_id
   limit 1;

  if supplier_entry is null then raise exception 'supplier_not_found'; end if;

  supplier_email := lower(trim(coalesce(supplier_entry ->> 'email', '')));
  if supplier_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'supplier_email_required';
  end if;

  insert into public.supplier_quote_requests (
    supplier_id,
    supplier_name,
    supplier_email,
    job_address,
    subject,
    material_list,
    status,
    sent_by
  ) values (
    p_supplier_id,
    supplier_entry ->> 'name',
    supplier_email,
    p_job_address,
    'Quote Request - ' || p_job_address,
    p_material_list,
    'sending',
    (select auth.uid())
  )
  returning id into request_id;

  return request_id;
end;
$$;

revoke all on function public.staff_create_supplier_quote_request(text, text, text)
  from public, anon;
grant execute on function public.staff_create_supplier_quote_request(text, text, text)
  to authenticated, service_role;
