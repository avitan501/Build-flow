set request.jwt.claims='{"role":"service_role"}';
insert into quote_requests values('00000000-0000-0000-0000-000000000001');
insert into quote_request_items(id,request_id,name,quantity,metadata) values('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Original HOLD roofing RFQ',1,'{"request_details":"62 rows - HOLD"}');
insert into client_material_list_jobs(id,request_id,status,available_at) values(1,'00000000-0000-0000-0000-000000000001','queued',now());
do $$
declare j record; old_lease uuid; result jsonb; rows jsonb; n integer;
begin
 select * into j from claim_material_list_checkpoint_jobs(1);
 old_lease:=j.lease_token;
 result:=material_list_checkpoint(1,1,j.lease_token,repeat('a',64),2);
 perform material_list_checkpoint(1,1,j.lease_token,repeat('a',64),2,0,'{"result":{"items":[{"name":"row1"}]}}');
 perform material_list_checkpoint(1,1,j.lease_token,repeat('a',64),2,0,'{"result":{"items":[{"name":"overwrite"}]}}');
 result:=material_list_checkpoint(1,1,j.lease_token,repeat('a',64),2);
 if result->'results'->'0'->'result'->'items'->0->>'name'<>'row1' then raise exception 'duplicate replaced checkpoint'; end if;
 if continue_material_list_job(1,1,j.lease_token)<>'queued' then raise exception 'no continuation'; end if;
 if continue_material_list_job(1,1,j.lease_token)<>'stale' then raise exception 'replayed lease accepted'; end if;
 select * into j from claim_material_list_checkpoint_jobs(1);
 begin perform material_list_checkpoint(1,1,old_lease,repeat('a',64),2,1,'{}');raise exception 'stale lease accepted';exception when others then if sqlerrm<>'stale_job' then raise;end if;end;
 begin perform continue_material_list_job(1,1,j.lease_token);raise exception 'old progress accepted';exception when others then if sqlerrm<>'no_chunk_progress' then raise;end if;end;
 rows:='[{"name":"Roof material","department":"Roofing","quantity":12,"unit":"rolls","qualification_status":"pending","metadata":{"ai_organized":true,"review_status":"check","source_text":"12 rolls HOLD"}}]';
 begin perform publish_material_list_checkpoint(1,1,j.lease_token,repeat('a',64),rows,'review','organized');raise exception 'partial published';exception when others then if sqlerrm<>'incomplete_chunks' then raise;end if;end;
 perform material_list_checkpoint(1,1,j.lease_token,repeat('a',64),2,1,'{"result":{"items":[]}}');
 begin perform publish_material_list_checkpoint(1,1,j.lease_token,repeat('a',64),null,'review','organized');raise exception 'null accepted';exception when others then if sqlerrm<>'invalid_result' then raise;end if;end;
 begin perform publish_material_list_checkpoint(1,1,j.lease_token,repeat('a',64),'[{"name":"bad","quantity":1,"metadata":{}}]','review','organized');raise exception 'bad metadata accepted';exception when others then if sqlerrm<>'invalid_row' then raise;end if;end;
 if publish_material_list_checkpoint(1,1,j.lease_token,repeat('a',64),rows,'review','organized')<>1 then raise exception 'publish failed';end if;
 perform publish_material_list_checkpoint(1,1,j.lease_token,repeat('a',64),rows,'review','organized');
 select count(*) into n from quote_request_items where metadata->>'ai_organized'='true'; if n<>1 then raise exception 'duplicate output';end if;
 if not exists(select 1 from quote_request_items where name='Original HOLD roofing RFQ' and metadata->>'request_details'='62 rows - HOLD') then raise exception 'original changed';end if;
 -- Source edit invalidates generation before any later app enqueue, without auto-retrying failed work.
 update quote_request_items set name='Original updated' where id='00000000-0000-0000-0000-000000000002';
 begin perform publish_material_list_checkpoint(1,1,j.lease_token,repeat('a',64),rows,'review','organized');raise exception 'old source published';exception when others then if sqlerrm<>'stale_job' then raise;end if;end;
 -- Same-generation lease reclaim cannot be finalized by its former owner.
 update client_material_list_jobs set status='queued',available_at=now() where id=1;
 select * into j from claim_material_list_checkpoint_jobs(1);
 old_lease:=j.lease_token;
 update client_material_list_jobs set locked_at=now()-interval '7 minutes' where id=1;
 select * into j from claim_material_list_checkpoint_jobs(1);
 if finish_material_list_checkpoint_job(1,j.generation,old_lease,false,null,null,null,'openai_timeout')<>'stale' then raise exception 'expired worker finalized active lease';end if;
 perform material_list_checkpoint(1,j.generation,j.lease_token,repeat('b',64),1,0,'{"result":{"items":[]}}');
 insert into quote_comparison_items(source_request_item_id) select id from quote_request_items where metadata->>'ai_organized'='true';
 begin perform publish_material_list_checkpoint(1,j.generation,j.lease_token,repeat('b',64),rows,'review','organized');raise exception 'linked output removed';exception when others then if sqlerrm<>'organized_work_in_use' then raise;end if;end;
 perform set_config('request.jwt.claims','{"role":"authenticated"}',true);
 begin perform material_list_checkpoint(1,j.generation,j.lease_token,repeat('b',64),1);raise exception 'staff accessed private cache';exception when insufficient_privilege then null;end;
end $$;
select 'checkpoint replay/source/lease/atomicity/security assertions passed' as result;
