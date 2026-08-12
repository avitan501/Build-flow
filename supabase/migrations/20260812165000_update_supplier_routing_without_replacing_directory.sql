create or replace function public.staff_update_supplier_routing_products(
  p_products jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_state jsonb;
  current_suppliers jsonb;
  current_products jsonb;
  entry record;
  requested_supplier_id text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.';
  end if;

  if not (select private.has_staff_capability('suppliers'))
     and not (select private.is_admin()) then
    raise exception 'Supplier management permission is required.';
  end if;

  if jsonb_typeof(p_products) <> 'object' then
    raise exception 'Supplier routing must be an object.';
  end if;

  select state
    into current_state
    from public.workflow_manager_settings
   where id = 'singleton'
   for update;

  if current_state is null then
    raise exception 'Supplier directory settings are unavailable.';
  end if;

  current_suppliers := coalesce(current_state #> '{qualificationSettings,suppliers}', '[]'::jsonb);
  current_products := coalesce(current_state #> '{qualificationSettings,products}', '{}'::jsonb);

  for entry in select key, value from jsonb_each(p_products)
  loop
    requested_supplier_id := trim(coalesce(entry.value ->> 'supplierId', ''));
    if requested_supplier_id <> '' and not exists (
      select 1 from jsonb_array_elements(current_suppliers) supplier
       where supplier ->> 'id' = requested_supplier_id
    ) then
      raise exception 'supplier_not_found';
    end if;
  end loop;

  current_products := current_products || p_products;
  current_state := jsonb_set(
    current_state,
    '{qualificationSettings,products}',
    current_products,
    true
  );

  update public.workflow_manager_settings
     set state = current_state,
         updated_by = (select auth.uid()),
         updated_at = now()
   where id = 'singleton';

  return current_state -> 'qualificationSettings';
end;
$$;

revoke all on function public.staff_update_supplier_routing_products(jsonb)
  from public, anon;
grant execute on function public.staff_update_supplier_routing_products(jsonb)
  to authenticated, service_role;
