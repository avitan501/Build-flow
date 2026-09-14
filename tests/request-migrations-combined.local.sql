-- All identifiers/records below are synthetic.
insert into auth.users values
 ('00000000-0000-4000-8000-000000000001','avitanneto@gmail.com'),
 ('00000000-0000-4000-8000-000000000002','buildavantiap@gmail.com'),
 ('00000000-0000-4000-8000-000000000003','unapproved@example.invalid');
insert into profiles(id,email,role,approval_status) select id,email,case when email='avitanneto@gmail.com' then 'admin' else 'staff' end,'approved' from auth.users;
insert into staff_access_grants values('buildavantiap@gmail.com',true,true,true);
insert into projects(id,owner_id,name) values('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','Synthetic project');
insert into quote_requests(id,project_id,owner_id,title) values('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','Synthetic request');
insert into quote_request_items(id,request_id,project_id,owner_id,name,department,item_type,quantity,unit) values
 ('00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','Valve','Plumbing','material',2,'each');
insert into quote_comparisons(id,request_id,created_by,title,status) values('00000000-0000-4000-8000-000000000030','00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000001','Synthetic comparison','review');
insert into quote_comparison_items(id,comparison_id,source_request_item_id,description,quantity) values('00000000-0000-4000-8000-000000000031','00000000-0000-4000-8000-000000000030','00000000-0000-4000-8000-000000000021','Valve',2);
insert into quote_comparison_bids(id,comparison_id,supplier_id,supplier_name_snapshot,trust_level_snapshot) values('00000000-0000-4000-8000-000000000032','00000000-0000-4000-8000-000000000030','synthetic-supplier','Synthetic supplier','verified');
insert into quote_comparison_prices(bid_id,item_id,unit_price,notes) values('00000000-0000-4000-8000-000000000032','00000000-0000-4000-8000-000000000031',12,'Manufacturer valve alternate wording');
create function public.test_request_snapshot() returns jsonb language sql as $$select jsonb_build_object('name',name,'department',department,'quantity',quantity,'unit',unit,'metadata',metadata,'qualification_status',qualification_status) from quote_request_items where id='00000000-0000-4000-8000-000000000021'$$;
create function public.test_match_snapshot() returns jsonb language sql as $$select jsonb_build_object('item',jsonb_build_object('id',i.id,'description',i.description,'specification',i.specification,'quantity',i.quantity,'unit',i.unit),'bid',jsonb_build_object('id',b.id,'supplier_id',b.supplier_id,'trust_level_snapshot',b.trust_level_snapshot),'price',jsonb_build_object('unit_price',p.unit_price,'is_available',p.is_available,'notes',p.notes)) from quote_comparison_items i join quote_comparison_prices p on p.item_id=i.id join quote_comparison_bids b on b.id=p.bid_id$$;
set test.actor='00000000-0000-4000-8000-000000000002';set role authenticated;
insert into request_workflow_steps(request_id,step,assignee,updated_by) values('00000000-0000-4000-8000-000000000020',1,'carlos',auth.uid());
update request_workflow_steps set note='Synthetic internal note',revision=revision+1 where step=1;
do $$begin
 assert (select count(*)=1 from request_workflow_steps),'Carlos workflow denied';
 begin perform staff_apply_request_item_edit(null,null,null,null,null,null,null,null);raise exception 'public edit RPC exposed';exception when insufficient_privilege then null;end;
 begin perform staff_award_quote_comparison_bid(null,null);raise exception 'legacy award exposed';exception when insufficient_privilege then null;end;
end$$;
reset role;set test.actor='00000000-0000-4000-8000-000000000003';set role authenticated;
do $$begin
 assert (select count(*)=0 from request_workflow_steps),'unauthorized workflow read';
 assert (select count(*)=0 from quote_product_match_confirmations),'unauthorized review read';
 begin insert into request_workflow_steps(request_id,step,assignee,updated_by) values('00000000-0000-4000-8000-000000000020',2,'david',auth.uid());raise exception 'unauthorized workflow write';exception when insufficient_privilege then null;end;
 begin select count(*) from request_item_edit_receipts;raise exception 'private receipt exposed';exception when insufficient_privilege then null;end;
end$$;
reset role;set test.actor='';set role service_role;
do $$declare before jsonb;result jsonb;rev integer;begin
 before:=test_request_snapshot();
 result:=staff_apply_request_item_edit('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000040',before,null,null,'{"name":"Reviewed valve"}');
 assert (result->>'ok')::boolean,'safe edit failed';
 assert (select count(*)=1 from request_item_edit_receipts),'receipt missing';
 before:=test_request_snapshot();
 insert into quote_request_attachments(request_id,project_id,owner_id,item_id,file_name,file_path,source_party) values('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000021','supplier.pdf','synthetic/supplier.pdf','supplier');
 assert test_request_snapshot()=before,'supplier attachment changed original';
 insert into quote_request_attachments(request_id,project_id,owner_id,file_name,file_path,source_party) values('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','source.pdf','synthetic/source.pdf','client');
 assert test_request_snapshot() is distinct from before,'client source did not fence edit';
 result:=staff_apply_request_item_edit('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000040',before,null,null,'{}',true);
 assert (result->>'conflict')::boolean,'stale undo overwrote source';
 assert (select name='Reviewed valve' from quote_request_items),'original edit lost';
 select product_choice_draft_revision into rev from quote_comparisons;
 result:=staff_confirm_product_match('00000000-0000-4000-8000-000000000030','00000000-0000-4000-8000-000000000031','00000000-0000-4000-8000-000000000032','00000000-0000-4000-8000-000000000002',test_match_snapshot(),repeat('a',64),'each');
 assert (result->>'ok')::boolean,'trusted match failed with real numeric constraints';
 assert (select product_choice_draft_revision>rev from quote_comparisons),'review did not invalidate choices';
 assert quote_product_match_is_eligible('00000000-0000-4000-8000-000000000031','00000000-0000-4000-8000-000000000032'),'review unavailable';
 update quote_comparison_prices set unit_price=13;
 assert not quote_product_match_is_eligible('00000000-0000-4000-8000-000000000031','00000000-0000-4000-8000-000000000032'),'price edit kept stale review';
 assert (select notes='Manufacturer valve alternate wording' from quote_comparison_prices),'source wording erased';
 assert (select count(*)=1 from quote_product_match_confirmations where revoked_at is not null),'review not revoked';
end$$;
reset role;
do $$begin
 assert (select count(*)=0 from test_push_events),'rehearsal unexpectedly triggered delivery';
 assert not has_function_privilege('authenticated','staff_confirm_product_match(uuid,uuid,uuid,uuid,jsonb,text,text)','execute'),'client can forge review';
 assert (select count(*)=1 from pg_proc where pronamespace='public'::regnamespace and proname='staff_confirm_product_match'),'duplicate review overload';
 assert (select count(*)=1 from pg_proc where pronamespace='public'::regnamespace and proname='staff_apply_request_item_edit'),'duplicate edit overload';
 begin update quote_comparison_items set quantity=0;raise exception 'quantity constraint missing';exception when check_violation then null;end;
 begin update quote_comparison_bids set tax_percent=null;raise exception 'production NOT NULL missing';exception when not_null_violation then null;end;
 begin update quote_comparison_items set source_request_item_id=null;raise exception 'linked source mutated';exception when raise_exception then assert sqlerrm='source_request_item_id cannot be changed once linked';end;
 begin update quote_requests set public_number=public_number+1;raise exception 'public code mutated';exception when raise_exception then assert sqlerrm='request_public_number_is_immutable';end;
end$$;
set test.actor='00000000-0000-4000-8000-000000000001';set role authenticated;
do $$declare changed integer;begin
 assert (select count(*)=1 from request_workflow_steps),'David cannot read workflow';
 assert (select count(*)=1 from quote_product_match_confirmations),'David cannot read review history';
 update quote_comparisons set product_choice_draft='{"version":1,"selections":{}}' where product_choice_draft_revision=-1;
 get diagnostics changed=row_count;
 assert changed=0,'stale choice CAS wrote draft';
end$$;
reset role;
