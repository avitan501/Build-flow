\set ON_ERROR_STOP on
begin;
create table public.quote_request_items (
 id uuid primary key, request_id uuid references public.quote_requests(id), name text not null,
 department text not null, quantity numeric not null, unit text, metadata jsonb,
 qualification_status text not null default 'not_required'
);
\i /tmp/request-item-edit-receipts-migration.sql
insert into auth.users(id,email) values('aaaa0000-0000-4000-8000-000000000001','buildavantiap@gmail.com'),('aaaa0000-0000-4000-8000-000000000002','other-staff@example.invalid');
insert into public.profiles values('aaaa0000-0000-4000-8000-000000000001','staff','approved',true),('aaaa0000-0000-4000-8000-000000000002','staff','approved',true);
insert into public.quote_requests(id) values('bbbb0000-0000-4000-8000-000000000001');
insert into public.quote_request_items values('cccc0000-0000-4000-8000-000000000001','bbbb0000-0000-4000-8000-000000000001','CDX plywood','Framing',60,'sheets','{"ai_organized":true,"needs_review":true,"thickness":"5/8","review_reasons":["Sheet dimensions missing"]}','pending');
do $$ declare expected jsonb; patch jsonb; result jsonb; receipt uuid := 'dddd0000-0000-4000-8000-000000000001'; begin
  select jsonb_build_object('name',name,'department',department,'quantity',quantity,'unit',unit,'metadata',metadata,'qualification_status',qualification_status) into expected from public.quote_request_items limit 1;
  patch := jsonb_build_object('metadata', (expected->'metadata') || '{"dimensions":"4 x 8 ft.","needs_review":false}'::jsonb,'qualification_status','not_required');
  result := public.staff_apply_request_item_edit('bbbb0000-0000-4000-8000-000000000001','cccc0000-0000-4000-8000-000000000001','aaaa0000-0000-4000-8000-000000000001',receipt,expected,null,null,patch,false);
  assert (result->>'ok')::boolean, 'save failed';
  result := public.staff_apply_request_item_edit('bbbb0000-0000-4000-8000-000000000001','cccc0000-0000-4000-8000-000000000001','aaaa0000-0000-4000-8000-000000000001','dddd0000-0000-4000-8000-000000000002',expected,null,null,patch,false);
  assert not (result->>'ok')::boolean, 'stale write allowed';
  expected := expected || patch;
  result := public.staff_apply_request_item_edit('bbbb0000-0000-4000-8000-000000000001','cccc0000-0000-4000-8000-000000000001','aaaa0000-0000-4000-8000-000000000001',receipt,expected,null,null,'{}',true);
  assert (result->>'ok')::boolean, 'undo failed';
  assert (select metadata->>'thickness' = '5/8' and metadata->>'needs_review'='true' and qualification_status='pending' from public.quote_request_items limit 1), 'undo changed known data or cleared issue';
  assert not has_function_privilege('authenticated','public.staff_apply_request_item_edit(uuid,uuid,uuid,uuid,jsonb,uuid,jsonb,jsonb,boolean)','execute'), 'direct authenticated RPC allowed';
  assert not has_table_privilege('authenticated','public.request_item_edit_receipts','select'), 'private receipts exposed';
  begin
    perform public.staff_apply_request_item_edit('bbbb0000-0000-4000-8000-000000000001','cccc0000-0000-4000-8000-000000000001','aaaa0000-0000-4000-8000-000000000002',receipt,expected,null,null,'{}',true);
    raise exception 'Unauthorized staff allowed';
  exception when raise_exception then if sqlerrm <> 'Not authorized' then raise; end if; end;
end $$;
do $$ declare expected jsonb; result jsonb; receipt uuid := 'dddd0000-0000-4000-8000-000000000003'; begin
  select jsonb_build_object('name',name,'department',department,'quantity',quantity,'unit',unit,'metadata',metadata,'qualification_status',qualification_status) into expected from public.quote_request_items limit 1;
  result := public.staff_apply_request_item_edit('bbbb0000-0000-4000-8000-000000000001','cccc0000-0000-4000-8000-000000000001','aaaa0000-0000-4000-8000-000000000001',receipt,expected,null,null,'{"quantity":61}',false);
  assert (result->>'ok')::boolean;
  update public.quote_request_items set quantity=62;
  expected := expected || '{"quantity":62}'::jsonb;
  result := public.staff_apply_request_item_edit('bbbb0000-0000-4000-8000-000000000001','cccc0000-0000-4000-8000-000000000001','aaaa0000-0000-4000-8000-000000000001',receipt,expected,null,null,'{}',true);
  assert not (result->>'ok')::boolean, 'Undo overwrote coworker';
  assert (select quantity=62 from public.quote_request_items limit 1);
end $$;
insert into public.quote_request_items values('cccc0000-0000-4000-8000-000000000002','bbbb0000-0000-4000-8000-000000000001','Original list','Framing',1,'request','{"request_details":"60 sheets 5/8 CDX"}','not_required');
update public.quote_request_items set metadata=metadata || '{"source_item_id":"cccc0000-0000-4000-8000-000000000002"}' where id='cccc0000-0000-4000-8000-000000000001';
do $$ declare expected jsonb; source_expected jsonb; result jsonb; begin
  select jsonb_build_object('name',name,'department',department,'quantity',quantity,'unit',unit,'metadata',metadata,'qualification_status',qualification_status) into expected from public.quote_request_items where id='cccc0000-0000-4000-8000-000000000001';
  select jsonb_build_object('name',name,'department',department,'quantity',quantity,'unit',unit,'metadata',metadata,'qualification_status',qualification_status) into source_expected from public.quote_request_items where id='cccc0000-0000-4000-8000-000000000002';
  result := public.staff_apply_request_item_edit('bbbb0000-0000-4000-8000-000000000001','cccc0000-0000-4000-8000-000000000001','aaaa0000-0000-4000-8000-000000000001','dddd0000-0000-4000-8000-000000000004',expected,'cccc0000-0000-4000-8000-000000000002',source_expected,'{"quantity":63}',false);
  assert (result->>'ok')::boolean;
  update public.quote_request_items set metadata=metadata || '{"request_details":"New source: 70 sheets"}' where id='cccc0000-0000-4000-8000-000000000002';
  expected := expected || '{"quantity":63}'::jsonb;
  result := public.staff_apply_request_item_edit('bbbb0000-0000-4000-8000-000000000001','cccc0000-0000-4000-8000-000000000001','aaaa0000-0000-4000-8000-000000000001','dddd0000-0000-4000-8000-000000000005',expected,'cccc0000-0000-4000-8000-000000000002',source_expected,'{"quantity":64}',false);
  assert not (result->>'ok')::boolean, 'stale source accepted';
  select jsonb_build_object('name',name,'department',department,'quantity',quantity,'unit',unit,'metadata',metadata,'qualification_status',qualification_status) into source_expected from public.quote_request_items where id='cccc0000-0000-4000-8000-000000000002';
  result := public.staff_apply_request_item_edit('bbbb0000-0000-4000-8000-000000000001','cccc0000-0000-4000-8000-000000000001','aaaa0000-0000-4000-8000-000000000001','dddd0000-0000-4000-8000-000000000004',expected,'cccc0000-0000-4000-8000-000000000002',source_expected,'{}',true);
  assert not (result->>'ok')::boolean, 'Undo ignored new source';
end $$;
rollback;
