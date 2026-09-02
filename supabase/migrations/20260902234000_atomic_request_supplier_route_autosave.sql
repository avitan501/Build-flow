-- Save a canonical supplier route for one or more request items in one transaction.
create or replace function public.staff_save_request_item_supplier_routes(
  p_request_id uuid,
  p_item_ids uuid[],
  p_supplier_names jsonb,
  p_supplier_route_entries jsonb,
  p_supplier_notes jsonb,
  p_updated_by uuid
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  expected_count integer;
  updated_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.';
  end if;
  if not (select private.has_staff_capability('customers'))
     and not (select private.is_admin()) then
    raise exception 'Customer management permission is required.';
  end if;
  if p_updated_by is distinct from (select auth.uid()) then
    raise exception 'The editor identity is invalid.';
  end if;
  if p_request_id is null or p_item_ids is null or cardinality(p_item_ids) < 1 or cardinality(p_item_ids) > 100 then
    raise exception 'Choose between 1 and 100 request items.';
  end if;
  if jsonb_typeof(p_supplier_names) is distinct from 'array'
     or jsonb_typeof(p_supplier_route_entries) is distinct from 'array'
     or jsonb_typeof(p_supplier_notes) is distinct from 'object' then
    raise exception 'The supplier route format is invalid.';
  end if;
  if jsonb_array_length(p_supplier_route_entries) <> jsonb_array_length(p_supplier_names) then
    raise exception 'Every supplier route name must have a canonical directory entry.';
  end if;
  if pg_column_size(p_supplier_names) > 50000
     or pg_column_size(p_supplier_route_entries) > 100000
     or pg_column_size(p_supplier_notes) > 100000 then
    raise exception 'The supplier route is too large.';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_supplier_names) as supplier(value)
     where jsonb_typeof(supplier.value) is distinct from 'string'
        or char_length(btrim(supplier.value #>> '{}')) not between 1 and 160
  ) then
    raise exception 'Every supplier route name must be a non-empty string of at most 160 characters.';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_supplier_route_entries) with ordinality as route(entry, position)
     where jsonb_typeof(route.entry) is distinct from 'object'
        or jsonb_typeof(route.entry -> 'supplier_id') is distinct from 'string'
        or char_length(btrim(route.entry ->> 'supplier_id')) not between 1 and 160
        or jsonb_typeof(route.entry -> 'name') is distinct from 'string'
        or btrim(route.entry ->> 'name') is distinct from p_supplier_names ->> (route.position - 1)::integer
  ) then
    raise exception 'Every supplier route entry must match its canonical supplier name and identifier.';
  end if;
  if exists (
    select 1
      from jsonb_each(p_supplier_notes) as note(name, value)
     where char_length(btrim(note.name)) not between 1 and 160
        or jsonb_typeof(note.value) is distinct from 'string'
        or char_length(note.value #>> '{}') > 800
  ) then
    raise exception 'Supplier route notes are invalid.';
  end if;

  select count(distinct item_id)::integer
    into expected_count
    from unnest(p_item_ids) as selected(item_id);

  update public.quote_request_items
     set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
       'supplier_route_names', p_supplier_names,
       'supplier_route_entries', p_supplier_route_entries,
       'supplier_route_notes', p_supplier_notes,
       'supplier_route_note', null,
       'supplier_route_updated_at', now(),
       'supplier_route_updated_by', p_updated_by
     ),
         updated_at = now()
   where request_id = p_request_id
     and id = any(p_item_ids);

  get diagnostics updated_count = row_count;
  if updated_count <> expected_count then
    raise exception 'One or more selected request items are unavailable.';
  end if;
  return updated_count;
end;
$$;

revoke all on function public.staff_save_request_item_supplier_routes(uuid, uuid[], jsonb, jsonb, jsonb, uuid)
  from public, anon;
grant execute on function public.staff_save_request_item_supplier_routes(uuid, uuid[], jsonb, jsonb, jsonb, uuid)
  to authenticated;

-- This staff-only SECURITY DEFINER function drifted to an explicit anon grant in
-- production. Its own checks reject anonymous calls, but the API surface should
-- not expose it at all.
revoke execute on function public.staff_load_catalog_suppliers() from anon;
