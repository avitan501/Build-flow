-- Synthetic draft comparison independent of the route integration fixture.
insert into quote_comparisons(id,created_by,title,status) values('00000000-0000-4000-8000-000000000100','00000000-0000-4000-8000-000000000001','Draft fixture','review');
insert into quote_comparison_items(id,comparison_id,description,quantity) values('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000100','Draft material',2);
insert into quote_comparison_bids(id,comparison_id,supplier_id,supplier_name_snapshot,trust_level_snapshot) values('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000100','draft-supplier','Draft supplier','verified');
insert into quote_comparison_prices(bid_id,item_id,unit_price,notes) values('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000101',12,'Draft material');
set role service_role;
do $$begin
 begin perform staff_save_client_quote_draft('00000000-0000-4000-8000-000000000100','00000000-0000-4000-8000-000000000001',0,client_quote_draft_source('00000000-0000-4000-8000-000000000100'),'{"version":1,"clientId":"","quoteNumber":"","clientMessage":"","delivery":"","tax":"","bulkMarkup":"","prices":{}}');raise exception 'Legacy draft feature activated';exception when serialization_failure then null;end;
 assert not exists(select 1 from quote_comparison_client_drafts where comparison_id='00000000-0000-4000-8000-000000000100');
end$$;
reset role;
update quote_comparisons set product_choice_draft='{"version":1,"selections":{"00000000-0000-4000-8000-000000000101":"00000000-0000-4000-8000-000000000102"}}',product_choice_draft_source_fingerprint=repeat('d',64) where id='00000000-0000-4000-8000-000000000100';
select staff_finalize_quote_comparison_route('00000000-0000-4000-8000-000000000100','00000000-0000-4000-8000-000000000001',(select product_choice_draft_revision from quote_comparisons where id='00000000-0000-4000-8000-000000000100'),repeat('d',64),'00000000-0000-4000-8000-000000000104','[]');
set role service_role;
do $$declare c uuid:='00000000-0000-4000-8000-000000000100'; a uuid:='00000000-0000-4000-8000-000000000001'; b uuid:='00000000-0000-4000-8000-000000000002'; s jsonb; d jsonb:='{"version":1,"clientId":"","quoteNumber":"","clientMessage":"  unfinished  ","delivery":"","tax":"-","bulkMarkup":"","prices":{"00000000-0000-4000-8000-000000000101":{"markupPercent":"","clientUnitPrice":""}}}'; before_client jsonb; r bigint; begin
 assert not has_table_privilege('service_role','auth.users','select');
 assert not has_schema_privilege('service_role','private','usage');
 assert not has_table_privilege('authenticated','quote_comparison_client_drafts','select');
 assert not has_table_privilege('authenticated','quote_comparison_client_drafts','update');
 assert not has_function_privilege('authenticated','staff_save_client_quote_draft(uuid,uuid,bigint,jsonb,jsonb)','execute');
 assert not has_function_privilege('anon','staff_load_client_quote_draft(uuid,uuid)','execute');
 s:=client_quote_draft_source(c); before_client:=finalized_route_client_snapshot(c);
 r:=staff_save_client_quote_draft(c,a,0,s,d); assert r=1;
 assert (staff_load_client_quote_draft(c,b)->'draft')=d,'Blank text lost';
 assert finalized_route_client_snapshot(c)=before_client,'Draft changed final financial fields';
 begin perform staff_save_client_quote_draft(c,b,0,s,d);raise exception 'stale initial editor won';exception when serialization_failure then null;end;
 begin perform staff_load_client_quote_draft(c,'00000000-0000-4000-8000-000000000003');raise exception 'unapproved actor loaded';exception when insufficient_privilege then null;end;
 r:=staff_save_client_quote_draft(c,b,1,s,d||'{"clientMessage":"Carlos draft"}');assert r=2;
 assert staff_load_client_quote_draft(c,a)->>'updatedBy'='Carlos';
 begin perform staff_save_client_quote_draft(c,a,1,s,d);raise exception 'stale actor overwrote';exception when serialization_failure then null;end;
 -- Child first, draft second: actual price trigger runs, old source rejected.
 update quote_comparison_prices set unit_price=13 where item_id='00000000-0000-4000-8000-000000000101';
 begin perform staff_save_client_quote_draft(c,a,2,s,d);raise exception 'price source changed unnoticed';exception when serialization_failure then null;end;
 assert staff_load_client_quote_draft(c,a)->'source' is distinct from staff_load_client_quote_draft(c,a)->'draftSource','Stale draft looked current';
 update quote_comparison_prices set unit_price=12 where item_id='00000000-0000-4000-8000-000000000101';
 s:=client_quote_draft_source(c);r:=staff_save_client_quote_draft(c,a,2,s,d);assert r=3;
 -- Draft first, client edit second: later load fails closed via distinct source.
 update quote_comparisons set client_message='Other editor' where id=c;
 assert staff_load_client_quote_draft(c,a)->'source' is distinct from staff_load_client_quote_draft(c,a)->'draftSource';
 begin perform staff_save_client_quote_draft(c,b,3,s,d);raise exception 'client source changed unnoticed';exception when serialization_failure then null;end;
 s:=client_quote_draft_source(c);
 begin perform staff_save_client_quote_draft(c,a,3,s,d||'{"version":"1"}');raise exception 'string version accepted';exception when raise_exception then assert sqlerrm='Invalid draft';end;
 begin perform staff_save_client_quote_draft(c,a,3,s,d||'{"tax":12}');raise exception 'numeric raw field accepted';exception when raise_exception then assert sqlerrm='Invalid draft text';end;
 begin perform staff_save_client_quote_draft(c,a,3,s,d||'{"prices":{"wrong":{"markupPercent":"","clientUnitPrice":""}}}');raise exception 'unrelated item accepted';exception when raise_exception then assert sqlerrm='Invalid draft price';end;
 update quote_comparisons set client_quote_status='sent' where id=c;
 assert (staff_load_client_quote_draft(c,a)->>'locked')::boolean;
 s:=client_quote_draft_source(c);
 begin perform staff_save_client_quote_draft(c,a,3,s,d);raise exception 'sent quote draft editable';exception when raise_exception then assert sqlerrm='Client quote is locked';end;
end$$;
reset role;
-- Remove only synthetic records in the disposable DB so parent fixture counts stay exact.
update quote_comparisons set active_route_id=null,client_quote_status='draft' where id='00000000-0000-4000-8000-000000000100';
delete from quote_comparison_routes where comparison_id='00000000-0000-4000-8000-000000000100';
delete from quote_comparison_prices where item_id='00000000-0000-4000-8000-000000000101';
delete from quote_comparison_bids where comparison_id='00000000-0000-4000-8000-000000000100';
delete from quote_comparison_items where comparison_id='00000000-0000-4000-8000-000000000100';
delete from quote_comparisons where id='00000000-0000-4000-8000-000000000100';
