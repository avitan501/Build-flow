-- Do not report a supplier as saved until the final row state proves that the
-- supplier survived the write and the deleted-supplier protection trigger.
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
  current_qualification_settings jsonb;
  current_suppliers jsonb;
  requested_id text;
  saved_supplier jsonb;
  persisted_suppliers jsonb;
  persisted_supplier jsonb;
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

  if exists (
    select 1
      from private.supplier_directory_tombstones
     where supplier_id = requested_id
  ) then
    raise exception 'supplier_not_found';
  end if;

  select state
    into current_state
    from public.workflow_manager_settings
   where id = 'singleton'
   for update;

  if current_state is null or jsonb_typeof(current_state) <> 'object' then
    raise exception 'Supplier directory settings are unavailable.';
  end if;

  current_qualification_settings := coalesce(
    current_state -> 'qualificationSettings',
    '{}'::jsonb
  );
  if jsonb_typeof(current_qualification_settings) <> 'object' then
    raise exception 'Supplier directory is invalid.';
  end if;

  current_suppliers := coalesce(
    current_qualification_settings -> 'suppliers',
    '[]'::jsonb
  );
  if jsonb_typeof(current_suppliers) <> 'array' then
    raise exception 'Supplier directory is invalid.';
  end if;

  if p_create then
    select entry
      into persisted_supplier
      from jsonb_array_elements(current_suppliers) entry
     where entry ->> 'id' = requested_id
     limit 1;

    if persisted_supplier is not null then
      return persisted_supplier;
    end if;
  end if;

  saved_supplier := jsonb_set(p_supplier, '{id}', to_jsonb(requested_id), true);

  select coalesce(jsonb_agg(entry order by ordinal), '[]'::jsonb)
    into current_suppliers
    from jsonb_array_elements(current_suppliers) with ordinality as existing(entry, ordinal)
   where entry ->> 'id' <> requested_id;

  current_suppliers := current_suppliers || jsonb_build_array(saved_supplier);
  current_qualification_settings := jsonb_set(
    current_qualification_settings,
    '{suppliers}',
    current_suppliers,
    true
  );

  update public.workflow_manager_settings
     set state = jsonb_set(
           current_state,
           '{qualificationSettings}',
           current_qualification_settings,
           true
         ),
         updated_by = (select auth.uid()),
         updated_at = now()
   where id = 'singleton'
   returning state #> '{qualificationSettings,suppliers}'
        into persisted_suppliers;

  if persisted_suppliers is null or jsonb_typeof(persisted_suppliers) <> 'array' then
    raise exception 'supplier_persistence_failed';
  end if;

  select entry
    into persisted_supplier
    from jsonb_array_elements(persisted_suppliers) entry
   where entry ->> 'id' = requested_id
   limit 1;

  if persisted_supplier is null or persisted_supplier <> saved_supplier then
    raise exception 'supplier_persistence_failed';
  end if;

  return persisted_supplier;
end;
$$;

revoke all on function public.staff_upsert_supplier_directory_entry(jsonb, boolean)
  from public, anon;
grant execute on function public.staff_upsert_supplier_directory_entry(jsonb, boolean)
  to authenticated, service_role;
