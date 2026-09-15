-- Run only in the disposable material-checkpoint-db fixture after its migrations.
begin;
set request.jwt.claims='{"role":"service_role"}';
insert into quote_requests values('eeee0000-0000-4000-8000-000000000001');
insert into quote_request_items(request_id,name,quantity,metadata) values('eeee0000-0000-4000-8000-000000000001','Internal original',1,'{}');
insert into quote_request_items(request_id,name,quantity,metadata) values('eeee0000-0000-4000-8000-000000000001','Reviewed product',10,'{"ai_organized":true,"manually_reviewed_at":"2026-09-14"}');
insert into client_material_list_jobs(id,request_id,status,available_at) values(999,'eeee0000-0000-4000-8000-000000000001','queued',now());
do $$ declare j record; rows jsonb := '[{"name":"Replacement","department":"Drywall","quantity":10,"unit":"sheets","qualification_status":"pending","metadata":{"ai_organized":true}}]'; begin
 select * into j from claim_material_list_checkpoint_jobs(10) where job_id=999;
 perform material_list_checkpoint(999,j.generation,j.lease_token,repeat('e',64),1,0,'{"result":{"items":[]}}');
 begin
  perform publish_material_list_checkpoint(999,j.generation,j.lease_token,repeat('e',64),rows,'test','organized');
  raise exception 'FAIL: manually reviewed product replaced';
 exception when others then if sqlerrm <> 'organized_work_in_use' then raise; end if; end;
 if not exists(select 1 from quote_request_items where request_id=j.request_id and name='Reviewed product') then raise exception 'FAIL: reviewed row lost';end if;
end $$;
rollback;

begin;
set request.jwt.claims='{"role":"service_role"}';
insert into quote_requests values('eeee0000-0000-4000-8000-000000000002');
insert into quote_request_items(request_id,name,quantity,metadata) values('eeee0000-0000-4000-8000-000000000002','Internal original',1,'{}');
insert into client_material_list_jobs(id,request_id,status,available_at) values(998,'eeee0000-0000-4000-8000-000000000002','queued',now());
do $$ declare j record; answer text; begin
 select * into j from claim_material_list_checkpoint_jobs(10) where job_id=998;
 answer:=finish_material_list_checkpoint_job(998,null,j.lease_token,true,'organized',1,0,null);
  if answer <> 'stale' then raise exception 'FAIL: null generation completed job';end if;
 if finish_material_list_checkpoint_job(998,j.generation+1,j.lease_token,false,null,null,null,'openai_timeout') <> 'stale' then raise exception 'FAIL: wrong generation finalized';end if;
 if not exists(select 1 from client_material_list_jobs where id=998 and status='processing' and ai_chunk_lease=j.lease_token) then raise exception 'FAIL: stale finalizer changed active job';end if;
 begin
  perform finish_material_list_checkpoint_job(998,j.generation,j.lease_token,true,'organized',1,0,null);
  raise exception 'FAIL: unpublished job completed';
 exception when others then if sqlerrm <> 'checkpoint_not_published' then raise;end if;end;
 perform material_list_checkpoint(998,j.generation,j.lease_token,repeat('f',64),1,0,'{"result":{"items":[]}}');
 perform publish_material_list_checkpoint(998,j.generation,j.lease_token,repeat('f',64),'[]','Review needed','needs_review');
 if finish_material_list_checkpoint_job(998,j.generation,j.lease_token,true,'needs_review',0,0,null) <> 'completed' then raise exception 'FAIL: published result did not finish';end if;
end $$;
rollback;
