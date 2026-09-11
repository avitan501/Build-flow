-- Group identity matches the existing request workspace's department/name groups.
create function public.request_supplier_route_group_key(p_name text, p_department text)
returns text language sql immutable security invoker set search_path = '' as $$
  select case when nullif(btrim(p_department),'') is not null then lower(btrim(regexp_replace(regexp_replace(p_department,'[-_]+',' ','g'),'\s+',' ','g')))
    when lower(p_name) ~ '(valve|meter|pipe|fitting|faucet|toilet|drain|strainer|pressure zone)' then 'plumbing'
    when lower(p_name) ~ '(wire|breaker|outlet|switch|panel|fixture)' then 'electrical'
    when lower(p_name) ~ '(floor|vinyl|tile|carpet|underlayment)' then 'flooring'
    when lower(p_name) ~ '(lumber|stud|joist|plywood|osb)' then 'framing'
    when lower(p_name) ~ '(drywall|sheetrock|compound|corner bead)' then 'drywall'
    when lower(p_name) ~ '(paint|primer|stain|coating)' then 'paint'
    else 'other materials' end;
$$;

create function public.staff_save_request_supplier_routes_scoped(
  p_request_id uuid, p_item_ids uuid[], p_supplier_names jsonb, p_supplier_route_entries jsonb,
  p_supplier_notes jsonb, p_updated_by uuid, p_mode text, p_group_key text, p_expected_revisions jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  target record;
  original_metadata jsonb;
  route jsonb;
  patch jsonb;
  route_revision bigint;
  revisions jsonb := '{}'::jsonb;
  actual_ids uuid[];
  is_override boolean;
begin
  if (select auth.uid()) is null or p_updated_by is distinct from (select auth.uid()) then raise exception 'Authentication is required.'; end if;
  if not (select private.has_staff_capability('customers')) and not (select private.is_admin()) then raise exception 'Customer management permission is required.'; end if;
  if p_mode not in ('item','batch','group','reset') or p_mode is null or p_item_ids is null or cardinality(p_item_ids) not between 1 and 100 then raise exception 'Choose 1 to 100 valid material items.'; end if;
  if p_mode in ('item','reset') and cardinality(p_item_ids) <> 1 then raise exception 'This action is for one item.'; end if;
  if p_mode in ('group','reset') and (p_group_key is null or char_length(p_group_key) not between 1 and 120) then raise exception 'Choose a valid group.'; end if;
  if jsonb_typeof(p_expected_revisions) is distinct from 'object' or (select count(*) from jsonb_object_keys(p_expected_revisions)) <> cardinality(p_item_ids) then raise exception 'Reload current supplier routes.'; end if;
  if jsonb_typeof(p_supplier_names) is distinct from 'array' or jsonb_typeof(p_supplier_route_entries) is distinct from 'array' or jsonb_typeof(p_supplier_notes) is distinct from 'object' then raise exception 'Invalid supplier route.'; end if;
  if jsonb_array_length(p_supplier_names) <> jsonb_array_length(p_supplier_route_entries) or pg_column_size(p_supplier_names)>50000 or pg_column_size(p_supplier_route_entries)>100000 or pg_column_size(p_supplier_notes)>100000 then raise exception 'Invalid supplier route size.'; end if;
  if exists (select 1 from jsonb_array_elements(p_supplier_names) n where jsonb_typeof(n) is distinct from 'string' or char_length(btrim(n#>>'{}')) not between 1 and 160)
     or exists (select 1 from jsonb_array_elements(p_supplier_route_entries) with ordinality e(value,position) where jsonb_typeof(value->'supplier_id') is distinct from 'string' or char_length(btrim(value->>'supplier_id')) not between 1 and 160 or value->>'name' is distinct from p_supplier_names->>((position-1)::integer))
     or exists (select 1 from jsonb_each(p_supplier_notes) n where char_length(btrim(n.key)) not between 1 and 160 or jsonb_typeof(n.value) is distinct from 'string' or char_length(n.value#>>'{}')>800) then raise exception 'Invalid supplier names or notes.'; end if;

  -- Serialize scoped group/default/reset edits for this request, while row locks
  -- and revision checks also protect against independent item edits.
  perform id from public.quote_requests where id=p_request_id for update;
  if not found then raise exception 'Request unavailable.'; end if;
  -- Lock before deriving membership: a concurrent move/delete cannot change the
  -- group between validation and writing. The parent FK lock also serializes inserts.
  perform id from public.quote_request_items where request_id=p_request_id order by id for update;
  select array_agg(id order by id) into actual_ids from public.quote_request_items i
   where request_id=p_request_id
     and lower(btrim(name)) <> 'free-text material list'
     and (metadata->>'ai_organized'='true' or not exists (
       select 1 from public.quote_request_items ai where ai.request_id=p_request_id and ai.metadata->>'ai_organized'='true' and ai.metadata->>'source_item_id'=i.id::text
     ))
     and case when p_mode='group' then public.request_supplier_route_group_key(name,department)=p_group_key else id=any(p_item_ids) end;
  if actual_ids is null or actual_ids is distinct from (select array_agg(id order by id) from unnest(p_item_ids) id) then raise exception 'The selected material group changed. Reload.'; end if;
  route := jsonb_build_object('names',p_supplier_names,'entries',p_supplier_route_entries,'notes',p_supplier_notes);
  if p_mode='reset' then
    if exists (select 1 from public.quote_request_items where id=any(p_item_ids) and public.request_supplier_route_group_key(name,department)<>p_group_key) then raise exception 'This item changed groups. Reload.'; end if;
    select metadata->'supplier_route_group_default' into route from public.quote_request_items
     where request_id=p_request_id and metadata->>'supplier_route_group_key'=p_group_key
       and public.request_supplier_route_group_key(name,department)=p_group_key
       and jsonb_typeof(metadata->'supplier_route_group_default')='object'
     order by metadata->>'supplier_route_group_updated_at' desc nulls last, id limit 1;
    if route is null then raise exception 'Choose the group suppliers first.'; end if;
  end if;
  for target in select id,metadata from public.quote_request_items where request_id=p_request_id and id=any(p_item_ids) order by id for update loop
    original_metadata := coalesce(target.metadata,'{}'::jsonb);
    route_revision := coalesce((original_metadata->>'supplier_route_revision')::bigint,0);
    if jsonb_typeof(p_expected_revisions->target.id::text) is distinct from 'number' or (p_expected_revisions->>target.id::text)::bigint <> route_revision then raise exception 'Supplier routes changed elsewhere. Reload.'; end if;
    is_override := original_metadata->>'supplier_route_mode'='override'
      or (coalesce(original_metadata->>'supplier_route_mode','') not in ('override','group') and (
        (jsonb_typeof(original_metadata->'supplier_route_names')='array' and jsonb_array_length(original_metadata->'supplier_route_names')>0)
        or (jsonb_typeof(original_metadata->'supplier_route_entries')='array' and jsonb_array_length(original_metadata->'supplier_route_entries')>0)
      ));
    is_override := coalesce(is_override,false);
    patch := jsonb_build_object('supplier_route_mode',case when p_mode in ('item','batch') or (p_mode='group' and is_override) then 'override' else 'group' end,
      'supplier_route_revision',route_revision+1,'supplier_route_updated_at',now(),'supplier_route_updated_by',p_updated_by);
    if p_mode in ('group','reset') then patch := patch || jsonb_build_object('supplier_route_group_key',p_group_key,'supplier_route_group_default',route,'supplier_route_group_updated_at',now()); end if;
    if p_mode<>'group' or not is_override then patch := patch || jsonb_build_object('supplier_route_names',route->'names','supplier_route_entries',route->'entries','supplier_route_notes',route->'notes','supplier_route_note',null); end if;
    update public.quote_request_items set metadata=original_metadata||patch,updated_at=now() where id=target.id and request_id=p_request_id;
    revisions := revisions || jsonb_build_object(target.id::text,route_revision+1);
  end loop;
  return revisions;
end;
$$;
revoke all on function public.staff_save_request_supplier_routes_scoped(uuid,uuid[],jsonb,jsonb,jsonb,uuid,text,text,jsonb) from public,anon;
grant execute on function public.staff_save_request_supplier_routes_scoped(uuid,uuid[],jsonb,jsonb,jsonb,uuid,text,text,jsonb) to authenticated;
