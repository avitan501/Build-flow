create or replace function public.staff_upsert_supplier_directory_entry(
  p_supplier jsonb,
  p_create boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_state jsonb;
  current_suppliers jsonb;
  requested_id text;
  saved_id text;
  saved_supplier jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.';
  end if;

  if not (select private.has_staff_capability('suppliers'))
     and not (select private.is_admin()) then
    raise exception 'Supplier management permission is required.';
  end if;

  if jsonb_typeof(p_supplier) <> 'object' then
    raise exception 'Supplier entry must be an object.';
  end if;

  requested_id := left(trim(coalesce(p_supplier ->> 'id', '')), 160);
  if requested_id = '' or trim(coalesce(p_supplier ->> 'name', '')) = '' then
    raise exception 'Supplier id and name are required.';
  end if;

  select state
    into current_state
    from public.workflow_manager_settings
   where id = 'singleton'
   for update;

  if current_state is null then
    raise exception 'Supplier directory settings are unavailable.';
  end if;

  current_suppliers := coalesce(
    current_state #> '{qualificationSettings,suppliers}',
    '[]'::jsonb
  );

  if jsonb_typeof(current_suppliers) <> 'array' then
    raise exception 'Supplier directory is invalid.';
  end if;

  saved_id := requested_id;
  if p_create and exists (
    select 1
      from jsonb_array_elements(current_suppliers) as entry
     where entry ->> 'id' = requested_id
  ) then
    saved_id := left(requested_id, 151) || '-' || left(replace(gen_random_uuid()::text, '-', ''), 8);
  end if;

  saved_supplier := jsonb_set(p_supplier, '{id}', to_jsonb(saved_id), true);

  select coalesce(jsonb_agg(entry order by ordinal), '[]'::jsonb)
    into current_suppliers
    from jsonb_array_elements(current_suppliers) with ordinality as existing(entry, ordinal)
   where entry ->> 'id' <> saved_id;

  current_suppliers := current_suppliers || jsonb_build_array(saved_supplier);

  update public.workflow_manager_settings
     set state = jsonb_set(
           current_state,
           '{qualificationSettings,suppliers}',
           current_suppliers,
           true
         ),
         updated_by = (select auth.uid()),
         updated_at = now()
   where id = 'singleton';

  return saved_supplier;
end;
$$;

revoke all on function public.staff_upsert_supplier_directory_entry(jsonb, boolean)
  from public, anon;
grant execute on function public.staff_upsert_supplier_directory_entry(jsonb, boolean)
  to authenticated, service_role;
