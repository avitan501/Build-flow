-- Isolated empty PostgreSQL database only. /migration.sql is the new scoped routing migration.
\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create schema auth;
create schema private;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
create function private.has_staff_capability(text) returns boolean language sql stable as $$ select coalesce(current_setting('test.staff',true),'')='true' $$;
create function private.is_admin() returns boolean language sql stable as $$ select false $$;
grant usage on schema auth,private to authenticated;
create table public.quote_requests(id uuid primary key);
create table public.quote_request_items(id uuid primary key,request_id uuid references public.quote_requests, name text,department text,metadata jsonb default '{}',updated_at timestamptz default now());
alter table public.quote_requests enable row level security;
alter table public.quote_request_items enable row level security;
create policy staff_requests on public.quote_requests for all to authenticated using (private.has_staff_capability('customers')) with check (private.has_staff_capability('customers'));
create policy staff_items on public.quote_request_items for all to authenticated using (private.has_staff_capability('customers')) with check (private.has_staff_capability('customers'));
grant select,insert,update,delete on public.quote_requests,public.quote_request_items to authenticated;
\i /migration.sql
set role authenticated;
set test.uid='00000000-0000-4000-8000-000000000099';
set test.staff='true';
insert into public.quote_requests values ('00000000-0000-4000-8000-000000000010');
insert into public.quote_request_items values
('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000010','Valve','Plumbing','{}',now()),
('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000010','Pipe','Plumbing','{"supplier_route_names":["Legacy supplier"],"supplier_route_notes":{"Legacy supplier":"Keep me"}}',now()),
('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000010','Drain','Plumbing','{"supplier_route_names":[],"supplier_route_mode":"override"}',now()),
('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000010','Breaker','Electrical','{}',now());
reset role;
create function public.test_route(mode text,ids integer[],group_key text,supplier text,versions integer[]) returns jsonb language sql security invoker as $$
  select public.staff_save_request_supplier_routes_scoped('00000000-0000-4000-8000-000000000010',
    (select array_agg(('00000000-0000-4000-8000-'||lpad(id::text,12,'0'))::uuid) from unnest(ids) id),
    jsonb_build_array(supplier),jsonb_build_array(jsonb_build_object('supplier_id',supplier,'name',supplier)),'{}',auth.uid(),mode,group_key,
    (select jsonb_object_agg('00000000-0000-4000-8000-'||lpad(id::text,12,'0'),versions[position]) from unnest(ids) with ordinality i(id,position)));
$$;
grant execute on function public.test_route(text,integer[],text,text,integer[]) to authenticated;
set role authenticated;
select public.test_route('group',array[1,2,3],'plumbing','Group A',array[0,0,0]);
do $$ begin
  assert (select metadata->'supplier_route_names'='["Group A"]' from public.quote_request_items where id='00000000-0000-4000-8000-000000000001');
  assert (select metadata->'supplier_route_names'='["Legacy supplier"]' and metadata->'supplier_route_notes'='{"Legacy supplier":"Keep me"}' from public.quote_request_items where id='00000000-0000-4000-8000-000000000002');
  assert (select metadata->'supplier_route_names'='[]' from public.quote_request_items where id='00000000-0000-4000-8000-000000000003');
  assert (select metadata='{}' from public.quote_request_items where id='00000000-0000-4000-8000-000000000004');
end $$;
select public.test_route('group',array[1,2,3],'plumbing','Group B',array[1,1,1]);
select public.test_route('reset',array[2],'plumbing','ignored',array[2]);
do $$ begin assert (select metadata->'supplier_route_names'='["Group B"]' and metadata->>'supplier_route_mode'='group' from public.quote_request_items where id='00000000-0000-4000-8000-000000000002'); end $$;
select public.test_route('batch',array[1,4],'','Batch override',array[2,0]);
select public.test_route('group',array[1,2,3],'plumbing','Group C',array[3,3,2]);
do $$ begin
  assert (select metadata->'supplier_route_names'='["Batch override"]' from public.quote_request_items where id='00000000-0000-4000-8000-000000000001');
  assert (select metadata->'supplier_route_names'='["Group C"]' from public.quote_request_items where id='00000000-0000-4000-8000-000000000002');
  assert (select metadata->'supplier_route_names'='["Batch override"]' from public.quote_request_items where id='00000000-0000-4000-8000-000000000004');
  begin
    perform public.test_route('group',array[1],'plumbing','BAD',array[4]);
    raise exception 'subset unexpectedly accepted';
  exception when raise_exception then if sqlerrm='subset unexpectedly accepted' then raise; end if; end;
  begin
    perform public.test_route('group',array[1,2,4],'plumbing','BAD',array[4,4,1]);
    raise exception 'cross-group unexpectedly accepted';
  exception when raise_exception then if sqlerrm='cross-group unexpectedly accepted' then raise; end if; end;
  begin
    perform public.test_route('group',array[1,2,3],'plumbing','BAD',array[4,3,3]);
    raise exception 'stale revision unexpectedly accepted';
  exception when raise_exception then if sqlerrm='stale revision unexpectedly accepted' then raise; end if; end;
  assert (select metadata->'supplier_route_names'='["Batch override"]' and metadata->>'supplier_route_revision'='4' from public.quote_request_items where id='00000000-0000-4000-8000-000000000001'), 'failed batch must roll back earlier row writes';
end $$;
select 'group route isolation/override/reset/revision tests passed' result;
