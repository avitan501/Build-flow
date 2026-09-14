\set ON_ERROR_STOP on
-- Empty disposable PostgreSQL only. The /match mount is the actual trusted-match candidate.
do $$begin create role anon;exception when duplicate_object then null;end$$;
do $$begin create role authenticated;exception when duplicate_object then null;end$$;
do $$begin create role service_role bypassrls;exception when duplicate_object then null;end$$;
create schema auth;
create table auth.users(id uuid primary key,email text);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
create table public.profiles(id uuid primary key,is_active boolean,approval_status text,role text);
create table public.quote_requests(id uuid primary key);
create table public.quote_request_items(id uuid primary key,request_id uuid,name text,department text,quantity numeric,unit text,metadata jsonb,qualification_status text);
create table public.quote_comparisons(id uuid primary key,request_id uuid,status text,awarded_bid_id uuid,product_choice_draft_revision integer,product_choice_draft jsonb,product_choice_draft_source_fingerprint text);
create table public.quote_comparison_items(id uuid primary key,comparison_id uuid references public.quote_comparisons(id),source_request_item_id uuid,description text,specification text,quantity numeric,unit text);
create table public.quote_comparison_bids(id uuid primary key,comparison_id uuid references public.quote_comparisons(id),supplier_id text,supplier_name_snapshot text,trust_level_snapshot text,status text,delivery_charge numeric,tax_percent numeric,lead_time_days integer);
create table public.quote_comparison_prices(bid_id uuid,item_id uuid,unit_price numeric,is_available boolean,notes text,primary key(bid_id,item_id));
alter table public.profiles add column full_name text, add column email text;
alter table public.quote_comparisons add column client_id uuid, add column client_name_snapshot text, add column client_email_snapshot text, add column quote_number text, add column expires_on date, add column client_message text, add column job_address text, add column client_delivery_charge numeric default 0, add column client_tax_percent numeric default 0, add column client_quote_status text default 'draft', add column quote_sent_at timestamptz;
alter table public.quote_comparison_items add column markup_percent numeric default 0, add column client_unit_price numeric;
\i /match/supabase/migrations/20260914225701_trusted_product_match.sql
\i /work/supabase/migrations/20260914230638_quote_comparison_finalized_routes.sql
grant usage on schema auth to service_role,authenticated;
grant select on auth.users to service_role;
grant all on all tables in schema public to service_role;
insert into auth.users values('00000000-0000-4000-8000-000000000001','avitanneto@gmail.com'),('00000000-0000-4000-8000-000000000002','unapproved@example.invalid');
insert into public.profiles values('00000000-0000-4000-8000-000000000001',true,'approved','admin'),('00000000-0000-4000-8000-000000000002',true,'approved','staff');
insert into public.quote_comparisons values('00000000-0000-4000-8000-000000000010',null,'review',null,5,'{"version":1,"selections":{"00000000-0000-4000-8000-000000000011":"00000000-0000-4000-8000-000000000021","00000000-0000-4000-8000-000000000012":"00000000-0000-4000-8000-000000000022"}}',repeat('a',64));
insert into public.quote_comparison_items values('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000010',null,'Valve','',2,'each'),('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000010',null,'Pipe','',1,'each');
insert into public.quote_comparison_bids values('00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000010','supplier-a:quote-1','Supplier A','verified','received',10,10,null),('00000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-000000000010','supplier-b:quote-2','Supplier B','verified','received',20,5,3);
insert into public.quote_comparison_prices values('00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000011',20,true,'Valve'),('00000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-000000000011',10,true,'Valve'),('00000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-000000000012',30,true,'Pipe');
create function public.test_finalize(actor uuid default '00000000-0000-4000-8000-000000000001',rev integer default 5) returns jsonb language sql as $$select public.staff_finalize_quote_comparison_route('00000000-0000-4000-8000-000000000010',actor,rev,repeat('a',64),'00000000-0000-4000-8000-000000000030','[]')$$;
do $$begin
 begin perform public.test_finalize('00000000-0000-4000-8000-000000000002');raise exception 'unauthorized passed';exception when raise_exception then assert sqlerrm='Not authorized';end;
 begin perform public.test_finalize(rev=>4);raise exception 'stale passed';exception when raise_exception then assert sqlerrm='Source or draft changed';end;
 update public.quote_comparison_bids set tax_percent=null where supplier_name_snapshot='Supplier A';
 begin perform public.test_finalize();raise exception 'unknown tax passed';exception when raise_exception then assert sqlerrm='Supplier freight and tax required';end;
 update public.quote_comparison_bids set tax_percent=10 where supplier_name_snapshot='Supplier A';
 update public.quote_comparison_prices set notes='NOT AVAILABLE substitute' where bid_id='00000000-0000-4000-8000-000000000021';
 begin perform public.test_finalize();raise exception 'unsafe match passed';exception when raise_exception then assert sqlerrm='Product match requires review';end;
 update public.quote_comparison_prices set notes='Valve' where bid_id='00000000-0000-4000-8000-000000000021';
 assert (select count(*)=0 from public.quote_comparison_routes),'failed finalization left partial route';
end $$;
set role service_role;
select public.test_finalize();
select public.test_finalize();
reset role;
do $$begin
 assert (select count(*)=1 from public.quote_comparison_routes),'retry duplicated route';
 assert (select material_subtotal=70 and delivery_total=30 and supplier_tax_total=7.50 and landed_total=107.50 from public.quote_comparison_routes),'manual choices or totals changed';
 assert (select count(*)=2 from public.quote_comparison_route_items),'coverage missing';
 assert (select count(*)=2 from public.quote_comparison_route_suppliers),'supplier identity lost';
 assert (select lead_time_days is null from public.quote_comparison_route_suppliers where supplier_id='supplier-a'),'unknown lead time inferred';
 assert (select status='awarded' and active_route_id is not null and awarded_bid_id is null from public.quote_comparisons),'fake single award created';
 assert not has_function_privilege('authenticated','public.staff_finalize_quote_comparison_route(uuid,uuid,integer,text,uuid,jsonb)','execute'),'direct caller can forge source proof';
 assert not has_table_privilege('authenticated','public.quote_comparison_routes','insert'),'direct route insert exposed';
end $$;
select 'mixed route foundation checks passed';
set test.actor='00000000-0000-4000-8000-000000000002';
set role authenticated;
do $$begin assert (select count(*)=0 from public.quote_comparison_routes),'Unauthorized staff can read routes';end$$;
reset role;
set test.actor='00000000-0000-4000-8000-000000000001';
set role authenticated;
do $$begin
 assert (select count(*)=1 from public.quote_comparison_routes),'Owner cannot read finalized route';
 begin update public.quote_comparison_routes set landed_total=0;raise exception 'direct financial overwrite passed';exception when insufficient_privilege then null;end;
end$$;
reset role;
