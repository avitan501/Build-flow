create table if not exists private.supplier_directory_tombstones (
  supplier_id text primary key,
  deleted_at timestamptz not null default now(),
  deleted_by uuid references public.profiles(id) on delete set null
);

revoke all on private.supplier_directory_tombstones from public, anon, authenticated;

create or replace function private.filter_deleted_supplier_directory_entries()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  suppliers jsonb;
  filtered_suppliers jsonb;
begin
  suppliers := coalesce(new.state #> '{qualificationSettings,suppliers}', '[]'::jsonb);
  if jsonb_typeof(suppliers) <> 'array' then
    return new;
  end if;

  select coalesce(jsonb_agg(entry order by ordinal), '[]'::jsonb)
    into filtered_suppliers
    from jsonb_array_elements(suppliers) with ordinality as supplier(entry, ordinal)
   where not exists (
     select 1
       from private.supplier_directory_tombstones tombstone
      where tombstone.supplier_id = entry ->> 'id'
   );

  new.state := jsonb_set(
    new.state,
    '{qualificationSettings,suppliers}',
    filtered_suppliers,
    true
  );
  return new;
end;
$$;

drop trigger if exists filter_deleted_supplier_directory_entries on public.workflow_manager_settings;
create trigger filter_deleted_supplier_directory_entries
before insert or update of state on public.workflow_manager_settings
for each row execute function private.filter_deleted_supplier_directory_entries();

insert into private.supplier_directory_tombstones (supplier_id, deleted_by)
select candidate.supplier_id, null
from (
  values
    ('buildflow-estimating'),
    ('framing-desk'),
    ('window-supplier'),
    ('kitchen-desk'),
    ('door-trim-desk'),
    ('materials-desk'),
    ('survey-layout'),
    ('view-as-built'),
    ('source-flooring'),
    ('five-towns-builders'),
    ('five-towns-testtz'),
    ('kamco-supply')
) as candidate(supplier_id)
where not exists (
  select 1
    from public.workflow_manager_settings settings
    cross join lateral jsonb_array_elements(
      coalesce(settings.state #> '{qualificationSettings,suppliers}', '[]'::jsonb)
    ) supplier
   where settings.id = 'singleton'
     and supplier ->> 'id' = candidate.supplier_id
)
on conflict (supplier_id) do nothing;

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

  if p_create then
    delete from private.supplier_directory_tombstones where supplier_id = requested_id;
  elsif exists (
    select 1 from private.supplier_directory_tombstones where supplier_id = requested_id
  ) then
    raise exception 'supplier_not_found';
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
  if jsonb_typeof(current_suppliers) <> 'array' then
    raise exception 'Supplier directory is invalid.';
  end if;

  saved_id := requested_id;
  if p_create and exists (
    select 1 from jsonb_array_elements(current_suppliers) entry
     where entry ->> 'id' = requested_id
  ) then
    saved_id := left(requested_id, 151) || '-' || left(replace(gen_random_uuid()::text, '-', ''), 8);
  end if;

  if saved_id <> requested_id then
    delete from private.supplier_directory_tombstones where supplier_id = saved_id;
  end if;

  saved_supplier := jsonb_set(p_supplier, '{id}', to_jsonb(saved_id), true);

  select coalesce(jsonb_agg(entry order by ordinal), '[]'::jsonb)
    into current_suppliers
    from jsonb_array_elements(current_suppliers) with ordinality as existing(entry, ordinal)
   where entry ->> 'id' <> saved_id;

  current_suppliers := current_suppliers || jsonb_build_array(saved_supplier);

  update public.workflow_manager_settings
     set state = jsonb_set(current_state, '{qualificationSettings,suppliers}', current_suppliers, true),
         updated_by = (select auth.uid()),
         updated_at = now()
   where id = 'singleton';

  return saved_supplier;
end;
$$;

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

  insert into private.supplier_directory_tombstones (supplier_id, deleted_by, deleted_at)
  values (p_supplier_id, (select auth.uid()), now())
  on conflict (supplier_id) do update
    set deleted_by = excluded.deleted_by,
        deleted_at = excluded.deleted_at;

  current_suppliers := coalesce(current_state #> '{qualificationSettings,suppliers}', '[]'::jsonb);
  current_products := coalesce(current_state #> '{qualificationSettings,products}', '{}'::jsonb);

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

revoke all on function public.staff_upsert_supplier_directory_entry(jsonb, boolean) from public, anon;
grant execute on function public.staff_upsert_supplier_directory_entry(jsonb, boolean) to authenticated, service_role;
revoke all on function public.staff_delete_supplier_directory_entry(text) from public, anon;
grant execute on function public.staff_delete_supplier_directory_entry(text) to authenticated, service_role;
