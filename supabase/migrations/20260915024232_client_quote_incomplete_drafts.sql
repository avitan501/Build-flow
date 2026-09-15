-- Private staff working text only: never changes ready/sent status or prices.
create table public.quote_comparison_client_drafts (
  comparison_id uuid primary key references public.quote_comparisons(id) on delete cascade,
  draft jsonb not null check (jsonb_typeof(draft) = 'object' and octet_length(draft::text) <= 200000),
  source_snapshot jsonb not null check (jsonb_typeof(source_snapshot) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  prepared_revision bigint,
  prepared_snapshot jsonb,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  check ((prepared_revision is null and prepared_snapshot is null)
    or (prepared_revision is not null and prepared_snapshot is not null and prepared_revision between 1 and revision and jsonb_typeof(prepared_snapshot)='object'))
);
alter table public.quote_comparison_client_drafts enable row level security;
revoke all on public.quote_comparison_client_drafts from public, anon, authenticated;
grant select, insert, update on public.quote_comparison_client_drafts to service_role;

create function public.client_quote_draft_source(p_comparison_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object(
    'client', public.finalized_route_client_snapshot(c.id),
    'awarded_bid_id', c.awarded_bid_id,
    'route_current', case when c.active_route_id is null then true else public.quote_finalized_route_is_current(c.id,c.active_route_id) end,
    'legacy_bid', case when c.active_route_id is null then (select to_jsonb(b) from public.quote_comparison_bids b where b.id=c.awarded_bid_id) else null end,
    'legacy_prices', case when c.active_route_id is null then (select coalesce(jsonb_agg(to_jsonb(p) order by p.item_id),'[]'::jsonb) from public.quote_comparison_prices p where p.bid_id=c.awarded_bid_id) else null end,
    'send_started', exists(select 1 from public.quote_comparison_routes r where r.comparison_id=c.id and r.client_send_token is not null)
  ) from public.quote_comparisons c where c.id=p_comparison_id;
$$;
revoke all on function public.client_quote_draft_source(uuid) from public, anon, authenticated;
grant execute on function public.client_quote_draft_source(uuid) to service_role;

create function public.staff_load_client_quote_draft(p_comparison_id uuid,p_actor_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_source jsonb; v_draft public.quote_comparison_client_drafts; v_actor text;
begin
  v_actor := public.request_staff_actor_label(p_actor_id);
  if v_actor is null then raise exception 'Staff access required' using errcode='42501'; end if;
  -- Coordinate parent operations. Stored source is checked again on every load:
  -- legacy child writers are not assumed to acquire this lock before writing.
  perform 1 from public.quote_comparisons where id=p_comparison_id for share nowait;
  if not found then raise exception 'Comparison not found'; end if;
  v_source := public.client_quote_draft_source(p_comparison_id);
  select * into v_draft from public.quote_comparison_client_drafts where comparison_id=p_comparison_id;
  return jsonb_build_object('source',v_source,'draft',v_draft.draft,'draftSource',v_draft.source_snapshot,
    'revision',coalesce(v_draft.revision,0),'updatedBy',case when v_draft.updated_by is null then null else public.request_staff_actor_label(v_draft.updated_by) end,
    'updatedAt',v_draft.updated_at,'actorId',p_actor_id,
    'locked',coalesce((v_source->>'send_started')::boolean,false) or (v_source#>>'{client,comparison,client_quote_status}') in ('sent','accepted','declined'));
end;
$$;
revoke all on function public.staff_load_client_quote_draft(uuid,uuid) from public, anon, authenticated;
grant execute on function public.staff_load_client_quote_draft(uuid,uuid) to service_role;

create function public.staff_save_client_quote_draft(p_comparison_id uuid,p_actor_id uuid,p_expected_revision bigint,p_expected_source jsonb,p_draft jsonb)
returns bigint language plpgsql security invoker set search_path='' as $$
declare v_source jsonb; v_revision bigint; v_key text; v_price jsonb;
begin
  if public.request_staff_actor_label(p_actor_id) is null then raise exception 'Staff access required' using errcode='42501'; end if;
  if p_expected_revision is null or p_expected_revision<0 or p_expected_revision>9007199254740990 then raise exception 'Invalid draft revision'; end if;
  if p_draft is null or jsonb_typeof(p_draft)<>'object' or octet_length(p_draft::text)>200000
    or p_draft->'version' is distinct from '1'::jsonb or jsonb_typeof(p_draft->'prices') is distinct from 'object'
    or exists(select 1 from jsonb_object_keys(p_draft) k where k not in ('version','clientId','quoteNumber','clientMessage','delivery','tax','bulkMarkup','prices')) then raise exception 'Invalid draft'; end if;
  foreach v_key in array array['clientId','quoteNumber','clientMessage','delivery','tax','bulkMarkup'] loop
    if jsonb_typeof(p_draft->v_key) is distinct from 'string' or char_length(p_draft->>v_key)>(case when v_key='clientMessage' then 4000 when v_key='quoteNumber' then 40 when v_key='clientId' then 100 else 60 end) then raise exception 'Invalid draft text'; end if;
  end loop;
  if (p_draft->>'clientId')<>'' and (p_draft->>'clientId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Invalid draft client'; end if;
  if (select count(*) from jsonb_object_keys(p_draft->'prices'))>1000 then raise exception 'Too many draft prices'; end if;
  perform 1 from public.quote_comparisons where id=p_comparison_id for update nowait;
  if not found then raise exception 'Comparison not found'; end if;
  if not exists(select 1 from public.quote_comparisons where id=p_comparison_id and active_route_id is not null) then raise exception 'A finalized supplier route is required for shared drafts' using errcode='40001'; end if;
  v_source := public.client_quote_draft_source(p_comparison_id);
  if p_expected_source is null or v_source is distinct from p_expected_source then raise exception 'Draft source changed' using errcode='40001'; end if;
  if v_source->>'route_current' is distinct from 'true' then raise exception 'Draft source changed' using errcode='40001'; end if;
  if coalesce((v_source->>'send_started')::boolean,false) or (v_source#>>'{client,comparison,client_quote_status}') in ('sent','accepted','declined') then raise exception 'Client quote is locked'; end if;
  for v_key,v_price in select * from jsonb_each(p_draft->'prices') loop
    if not exists(select 1 from public.quote_comparison_items where comparison_id=p_comparison_id and id::text=v_key)
      or jsonb_typeof(v_price)<>'object'
      or jsonb_typeof(v_price->'markupPercent') is distinct from 'string'
      or jsonb_typeof(v_price->'clientUnitPrice') is distinct from 'string'
      or char_length(v_price->>'markupPercent')>60 or char_length(v_price->>'clientUnitPrice')>60
      or exists(select 1 from jsonb_object_keys(v_price) k where k not in ('markupPercent','clientUnitPrice')) then raise exception 'Invalid draft price'; end if;
  end loop;
  if p_expected_revision=0 then
    insert into public.quote_comparison_client_drafts(comparison_id,draft,source_snapshot,updated_by)
      values(p_comparison_id,p_draft,v_source,p_actor_id) on conflict do nothing returning revision into v_revision;
  else
    update public.quote_comparison_client_drafts set draft=p_draft,source_snapshot=v_source,revision=revision+1,updated_by=p_actor_id,updated_at=now()
      where comparison_id=p_comparison_id and revision=p_expected_revision returning revision into v_revision;
  end if;
  if v_revision is null then raise exception 'Draft changed by another editor' using errcode='40001'; end if;
  return v_revision;
end;
$$;
revoke all on function public.staff_save_client_quote_draft(uuid,uuid,bigint,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.staff_save_client_quote_draft(uuid,uuid,bigint,jsonb,jsonb) to service_role;

-- Narrow read/lock gate for the authenticated legacy RPC. No business writes
-- and no table SELECT grant to authenticated callers.
create function public.assert_no_shared_client_quote_draft(p_comparison_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if public.request_staff_actor_label(auth.uid()) is null then raise exception 'Staff access required' using errcode='42501'; end if;
  perform 1 from public.quote_comparisons where id=p_comparison_id for update nowait;
  if exists(select 1 from public.quote_comparison_client_drafts where comparison_id=p_comparison_id) then raise exception 'Shared client draft requires reviewed prepare' using errcode='40001'; end if;
end $$;
revoke all on function public.assert_no_shared_client_quote_draft(uuid) from public,anon,service_role;
grant execute on function public.assert_no_shared_client_quote_draft(uuid) to authenticated;

-- Preserve installed mixed-route business validators/locks byte-for-byte.
-- The new entry atomically saves the raw draft and finalizes its exact values.
-- Existing entries fail closed when a shared draft exists; no session bypass.
do $migration$
declare save_body text; claim_body text; legacy_body text; new_body text;
  lock_line text:='perform public.lock_finalized_route_evidence(p_comparison_id,p_route_id);';
  guard_line text:='if exists(select 1 from public.quote_comparison_client_drafts where comparison_id=p_comparison_id) then raise exception ''Shared client draft requires reviewed prepare'' using errcode=''40001''; end if;';
begin
  select prosrc into save_body from pg_proc where oid='public.staff_save_finalized_route_client_quote(uuid,uuid,uuid,uuid,text,date,text,numeric,numeric,jsonb,jsonb)'::regprocedure and not prosecdef;
  select prosrc into claim_body from pg_proc where oid='public.staff_claim_finalized_route_send(uuid,uuid,uuid,jsonb,uuid,jsonb,jsonb)'::regprocedure and not prosecdef;
  select prosrc into legacy_body from pg_proc where oid='public.staff_save_quote_comparison_client_quote(uuid,uuid,text,date,text,numeric,numeric,jsonb)'::regprocedure and not prosecdef;
  -- Independently compared against the current production source by root.
  -- A source drift requires review, not an automatic rewrite of unknown code.
  if md5(save_body) is distinct from 'e6394d3a2189bcfca808189851f475f8'
    or md5(claim_body) is distinct from 'd01f2291c394b437dc0c1aa67b529bc1'
    or md5(legacy_body) is distinct from '699e66f6b197cb3bea82e3de08ca75d9' then raise exception 'Installed client quote RPC source differs from reviewed version'; end if;
  if save_body is null or claim_body is null or legacy_body is null
    or (length(save_body)-length(replace(save_body,lock_line,'')))/length(lock_line)<>1
    or (length(claim_body)-length(replace(claim_body,lock_line,'')))/length(lock_line)<>1
    or (length(save_body)-length(replace(save_body,'return public.finalized_route_client_snapshot(p_comparison_id);','')))/length('return public.finalized_route_client_snapshot(p_comparison_id);')<>1
    or (length(save_body)-length(replace(save_body,'declare v_client public.profiles%rowtype; v_count integer;','')))/length('declare v_client public.profiles%rowtype; v_count integer;')<>1
    or (length(legacy_body)-length(replace(legacy_body,E'begin\n','')))/length(E'begin\n')<>1
    or position('request_staff_actor_label(p_actor_id)' in save_body)=0
    or position('request_staff_actor_label(p_actor_id)' in claim_body)=0 then raise exception 'Client quote RPC changed; review migration before applying'; end if;

  new_body:=replace(save_body,'declare v_client public.profiles%rowtype; v_count integer;',
    'declare v_client public.profiles%rowtype; v_count integer; p_client_id uuid; p_quote_number text; p_expires_on date; p_client_message text; p_client_delivery_charge numeric; p_client_tax_percent numeric; p_items jsonb; v_revision bigint;');
  if new_body=save_body then raise exception 'Prepare declaration changed'; end if;
  new_body:=replace(new_body,lock_line,lock_line || $inject$
    if exists(select 1 from public.quote_comparison_client_drafts where comparison_id=p_comparison_id and draft is distinct from p_draft) then raise exception 'Shared draft changed' using errcode='40001'; end if;
    v_revision:=public.staff_save_client_quote_draft(p_comparison_id,p_actor_id,p_expected_draft_revision,p_expected_source,p_draft);
    p_client_id:=nullif(p_draft->>'clientId','')::uuid;
    p_quote_number:=upper(btrim(p_draft->>'quoteNumber'));
    p_client_message:=p_draft->>'clientMessage';
    p_client_delivery_charge:=coalesce(nullif(btrim(p_draft->>'delivery'),'')::numeric,0);
    p_client_tax_percent:=nullif(btrim(p_draft->>'tax'),'')::numeric;
    select jsonb_agg(jsonb_build_object('item_id',key,'markup_percent',nullif(btrim(value->>'markupPercent'),'')::numeric,'client_unit_price',nullif(btrim(value->>'clientUnitPrice'),'')::numeric) order by key)
      into p_items from jsonb_each(p_draft->'prices');
  $inject$);
  new_body:=replace(new_body,'return public.finalized_route_client_snapshot(p_comparison_id);',$inject$
    update public.quote_comparison_client_drafts set source_snapshot=public.client_quote_draft_source(p_comparison_id),prepared_revision=v_revision,prepared_snapshot=public.finalized_route_client_snapshot(p_comparison_id) where comparison_id=p_comparison_id and revision=v_revision;
    return jsonb_build_object('clientSnapshot',public.finalized_route_client_snapshot(p_comparison_id),'draftRevision',v_revision);
  $inject$);
  execute 'create function public.staff_prepare_mixed_client_quote_draft(p_comparison_id uuid,p_route_id uuid,p_actor_id uuid,p_expected_client jsonb,p_expected_draft_revision bigint,p_expected_source jsonb,p_draft jsonb) returns jsonb language plpgsql security invoker set search_path=''''' || ' as ' || quote_literal(new_body);

  new_body:=replace(claim_body,lock_line,lock_line || $inject$
    if p_expected_draft_revision is null or not exists(select 1 from public.quote_comparison_client_drafts where comparison_id=p_comparison_id and revision=p_expected_draft_revision and prepared_revision=p_expected_draft_revision and prepared_snapshot=p_expected) then raise exception 'Shared draft changed before sending' using errcode='40001'; end if;
  $inject$);
  execute 'create function public.staff_claim_mixed_client_draft_send(p_comparison_id uuid,p_route_id uuid,p_actor_id uuid,p_expected jsonb,p_token uuid,p_loaded jsonb,p_manifest jsonb,p_expected_draft_revision bigint) returns void language plpgsql security invoker set search_path=''''' || ' as ' || quote_literal(new_body);

  execute replace(pg_get_functiondef('public.staff_save_finalized_route_client_quote(uuid,uuid,uuid,uuid,text,date,text,numeric,numeric,jsonb,jsonb)'::regprocedure),save_body,replace(save_body,lock_line,lock_line || chr(10) || guard_line));
  execute replace(pg_get_functiondef('public.staff_claim_finalized_route_send(uuid,uuid,uuid,jsonb,uuid,jsonb,jsonb)'::regprocedure),claim_body,replace(claim_body,lock_line,lock_line || chr(10) || guard_line));
  if position(E'begin\n' in legacy_body)=0 then raise exception 'Legacy client quote entry changed'; end if;
  execute replace(pg_get_functiondef('public.staff_save_quote_comparison_client_quote(uuid,uuid,text,date,text,numeric,numeric,jsonb)'::regprocedure),legacy_body,replace(legacy_body,E'begin\n',E'begin\n  perform public.assert_no_shared_client_quote_draft(p_comparison_id);\n'));
end $migration$;
revoke all on function public.staff_prepare_mixed_client_quote_draft(uuid,uuid,uuid,jsonb,bigint,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.staff_prepare_mixed_client_quote_draft(uuid,uuid,uuid,jsonb,bigint,jsonb,jsonb) to service_role;
revoke all on function public.staff_claim_mixed_client_draft_send(uuid,uuid,uuid,jsonb,uuid,jsonb,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.staff_claim_mixed_client_draft_send(uuid,uuid,uuid,jsonb,uuid,jsonb,jsonb,bigint) to service_role;
