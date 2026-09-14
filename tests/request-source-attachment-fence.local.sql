\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create role service_role;
create schema auth;
create table auth.users(id uuid primary key,email text);
create table public.profiles(id uuid primary key,role text,is_active boolean,approval_status text);
create table public.quote_requests(id uuid primary key);
create table public.quote_request_items(id uuid primary key,request_id uuid references public.quote_requests(id),name text,department text,quantity numeric,unit text,metadata jsonb,qualification_status text);
create table public.quote_request_attachments(id uuid primary key,request_id uuid references public.quote_requests(id),item_id uuid,file_name text,file_path text,file_type text,file_size bigint,source_party text);
\i /work/supabase/migrations/20260914191309_request_item_edit_receipts.sql
\i /work/supabase/migrations/20260914225145_request_source_attachment_fence.sql
insert into auth.users values('00000000-0000-4000-8000-000000000001','buildavantiap@gmail.com');
insert into public.profiles values('00000000-0000-4000-8000-000000000001','staff',true,'approved');
insert into public.quote_requests values('00000000-0000-4000-8000-000000000010'),('00000000-0000-4000-8000-000000000011');
insert into public.quote_request_items values('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000010','Plywood','Framing',60,'sheets','{"ai_organized":true,"thickness":"5/8","needs_review":true}','pending'),('00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000011','Other','Framing',1,'each','{}','pending');
create function public.test_snapshot() returns jsonb language sql as $$ select jsonb_build_object('name',name,'department',department,'quantity',quantity,'unit',unit,'metadata',metadata,'qualification_status',qualification_status) from public.quote_request_items where id='00000000-0000-4000-8000-000000000020' $$;
create table public.test_snapshots(id integer primary key,snapshot jsonb);
insert into public.test_snapshots values(1,public.test_snapshot());
do $$ declare result jsonb; before_file jsonb; before_supplier jsonb; begin
 result:=public.staff_apply_request_item_edit('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000030',public.test_snapshot(),null,null,'{"quantity":61}',false);
 assert (result->>'ok')::boolean;
 before_file:=public.test_snapshot();
 insert into public.quote_request_attachments values('00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000010',null,'private/updated-plan.pdf','private/path','application/pdf',100,'client');
 assert public.test_snapshot()->'metadata'->'source_file_change'->>'file_name'='updated-plan.pdf','Directory leaked into source notice';
 assert public.test_snapshot() is distinct from before_file,'File did not fence source-less item';
 assert (public.test_snapshot()->'metadata'->>'thickness')='5/8' and public.test_snapshot()->>'qualification_status'='pending','Existing details/status changed';
 assert not exists(select 1 from public.quote_request_items where id='00000000-0000-4000-8000-000000000021' and metadata ? 'source_file_change'),'Other request changed';
 result:=public.staff_apply_request_item_edit('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000031',before_file,null,null,'{"quantity":62}',false);
 assert not (result->>'ok')::boolean,'Stale save after upload allowed';
 result:=public.staff_apply_request_item_edit('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000030',public.test_snapshot(),null,null,'{}',true);
 assert not (result->>'ok')::boolean,'Undo crossed source upload';
 before_supplier:=public.test_snapshot();
 insert into public.quote_request_attachments values('00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000010',null,'quote.pdf','supplier/path','application/pdf',100,'supplier');
 assert public.test_snapshot()=before_supplier,'Supplier upload fenced client source';
 update public.quote_request_attachments set file_size=101 where id='00000000-0000-4000-8000-000000000041';
 assert public.test_snapshot()=before_supplier,'Supplier edit fenced client source';
 update public.quote_request_attachments set file_size=101 where id='00000000-0000-4000-8000-000000000040';
 assert public.test_snapshot() is distinct from before_supplier,'Client replacement not fenced';
 before_file:=public.test_snapshot();
 update public.quote_request_attachments set file_size=101 where id='00000000-0000-4000-8000-000000000040';
 assert public.test_snapshot()=before_file,'No-op fenced source';
 delete from public.quote_request_attachments where id='00000000-0000-4000-8000-000000000040';
 assert public.test_snapshot() is distinct from before_file,'Deletion not fenced';
 assert not has_function_privilege('authenticated','private.fence_request_source_attachment_change()','execute'),'Exposed direct trigger capability';
end $$;
update public.test_snapshots set snapshot=public.test_snapshot() where id=1;
