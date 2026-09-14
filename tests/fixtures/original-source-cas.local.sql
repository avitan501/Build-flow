-- Disposable PostgreSQL database ONLY. Copy candidate receipt migration to
-- /tmp/original-source-receipts.sql inside its isolated container before running.
create schema auth;
create table auth.users(id uuid primary key,email text);
create table public.profiles(id uuid primary key,role text,approval_status text,is_active boolean);
create table public.quote_requests(id uuid primary key);
create table public.quote_request_items(id uuid primary key,request_id uuid references quote_requests,name text,department text,quantity numeric,unit text,metadata jsonb,qualification_status text);
\i /tmp/original-source-receipts.sql
insert into auth.users values('11111111-1111-4111-8111-111111111111','buildavantiap@gmail.com');
insert into profiles values('11111111-1111-4111-8111-111111111111','staff','approved',true);
insert into quote_requests values('22222222-2222-4222-8222-222222222222');
insert into quote_request_items values
 ('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222','Original','Framing',1,'request','{"request_details":"Old source"}','not_required'),
 ('44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222','Reviewed child','Framing',20,'sheets','{"ai_organized":true,"manually_reviewed_at":"saved","source_item_id":"33333333-3333-4333-8333-333333333333"}','not_required');
do $$ declare before jsonb; result jsonb; original_text text := E'First line\n' || repeat('x',19989); begin
 select jsonb_build_object('name',name,'department',department,'quantity',quantity,'unit',unit,'metadata',metadata,'qualification_status',qualification_status) into before from quote_request_items where id='33333333-3333-4333-8333-333333333333';
 result := staff_apply_request_item_edit('22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111',gen_random_uuid(),before,null,null,jsonb_build_object('quantity',2,'metadata',jsonb_build_object('request_details',original_text,'ai_organization_status','draft_changed')),false);
 if result->>'ok' <> 'true' then raise exception 'original save failed';end if;
 result := staff_apply_request_item_edit('22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111',gen_random_uuid(),before,null,null,'{"quantity":99}',false);
 if result->>'conflict' <> 'true' then raise exception 'stale overwrite allowed';end if;
 if not exists(select 1 from quote_request_items where id='33333333-3333-4333-8333-333333333333' and quantity=2 and metadata->>'request_details'=original_text) then raise exception 'multiline source changed';end if;
 if not exists(select 1 from quote_request_items where id='44444444-4444-4444-8444-444444444444' and quantity=20 and unit='sheets' and metadata->>'manually_reviewed_at'='saved') then raise exception 'reviewed child overwritten';end if;
end $$;
select 'original locked CAS, stale rejection,20k multiline and child preservation passed';
