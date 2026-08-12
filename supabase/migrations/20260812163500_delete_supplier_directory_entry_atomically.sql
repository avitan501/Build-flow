create or replace function public.staff_delete_supplier_directory_entry(
  p_supplier_id text
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
  next_suppliers jsonb;
  next_products jsonb;
  fallback_supplier_id text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.';
  end if;

  if not (select private.has_staff_capability('suppliers'))
     and not (select private.is_admin()) then
    raise exception 'Supplier management permission is required.';
  end if;

  p_supplier_id := left(trim(coalesce(p_supplier_id, '')), 160);
  if p_supplier_id = '' then raise exception 'supplier_id_required'; end if;

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

  if not exists (
    select 1 from jsonb_array_elements(current_suppliers) entry
     where entry ->> 'id' = p_supplier_id
  ) then
    raise exception 'supplier_not_found';
  end if;

  select coalesce(jsonb_agg(entry order by ordinal), '[]'::jsonb)
    into next_suppliers
    from jsonb_array_elements(current_suppliers) with ordinality as supplier(entry, ordinal)
   where entry ->> 'id' <> p_supplier_id;

  fallback_supplier_id := next_suppliers -> 0 ->> 'id';

  select coalesce(
    jsonb_object_agg(
      product_key,
      case
        when product_value ->> 'supplierId' <> p_supplier_id then product_value
        when fallback_supplier_id is null then product_value - 'supplierId'
        else jsonb_set(product_value, '{supplierId}', to_jsonb(fallback_supplier_id), true)
      end
    ),
    '{}'::jsonb
  )
    into next_products
    from jsonb_each(current_products) as product(product_key, product_value);

  current_state := jsonb_set(
    jsonb_set(current_state, '{qualificationSettings,suppliers}', next_suppliers, true),
    '{qualificationSettings,products}',
    next_products,
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

revoke all on function public.staff_delete_supplier_directory_entry(text)
  from public, anon;
grant execute on function public.staff_delete_supplier_directory_entry(text)
  to authenticated, service_role;
