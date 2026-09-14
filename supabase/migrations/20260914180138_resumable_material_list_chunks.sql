-- Local candidate only. Service-only checkpoints contain validated model results,
-- never API keys or PDF bytes. Generation fencing prevents stale publication.
alter table public.client_material_list_jobs add column ai_chunk_lease uuid, add column ai_chunk_progress integer not null default 0;

create function private.material_list_source_revision(p_request_id uuid) returns text language sql stable set search_path='' as $$
 select md5(jsonb_build_object(
  'items',(select jsonb_agg(jsonb_build_object('id',i.id,'name',i.name,'quantity',i.quantity,'unit',i.unit,'answers',i.answers,
    'metadata',(select coalesce(jsonb_object_agg(k,v),'{}'::jsonb) from jsonb_each(coalesce(i.metadata,'{}'::jsonb)) e(k,v) where k not like 'ai_organization_%')) order by i.id)
    from public.quote_request_items i where i.request_id=p_request_id and coalesce(i.metadata->>'ai_organized','false')<>'true'),
  'files',(select jsonb_agg(jsonb_build_object('id',a.id,'path',a.file_path,'name',a.file_name,'size',a.file_size,'type',a.file_type) order by a.id)
    from public.quote_request_attachments a where a.request_id=p_request_id and a.source_party<>'supplier')
 )::text)
$$;
revoke all on function private.material_list_source_revision(uuid) from public,anon,authenticated;

-- Source edits invalidate a running generation in the same transaction, before
-- an application's later enqueue call. No automatic paid retry is introduced.
create function private.invalidate_material_list_checkpoint() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_request uuid; v_old jsonb; v_new jsonb;
begin
 if tg_table_name='quote_request_items' then
  if tg_op='INSERT' and new.metadata->>'ai_organized'='true' then return new; end if;
  if tg_op='DELETE' and old.metadata->>'ai_organized'='true' then return old; end if;
  if tg_op='UPDATE' then
   v_old:=jsonb_build_object('request_id',old.request_id,'name',old.name,'department',old.department,'quantity',old.quantity,'unit',old.unit,'answers',old.answers,
      'metadata',(select coalesce(jsonb_object_agg(k,v),'{}'::jsonb) from jsonb_each(coalesce(old.metadata,'{}'::jsonb))e(k,v) where k not like 'ai_organization_%'));
   v_new:=jsonb_build_object('request_id',new.request_id,'name',new.name,'department',new.department,'quantity',new.quantity,'unit',new.unit,'answers',new.answers,
      'metadata',(select coalesce(jsonb_object_agg(k,v),'{}'::jsonb) from jsonb_each(coalesce(new.metadata,'{}'::jsonb))e(k,v) where k not like 'ai_organization_%'));
   if v_old is not distinct from v_new then return new; end if;
  end if;
 else
  if tg_op='INSERT' and new.source_party='supplier' then return new; end if;
  if tg_op='DELETE' and old.source_party='supplier' then return old; end if;
  if tg_op='UPDATE' and old.source_party='supplier' and new.source_party='supplier' then return new; end if;
 end if;
 v_request:=case when tg_op='DELETE' then old.request_id else new.request_id end;
 update public.client_material_list_jobs set generation=generation+1,updated_at=now() where request_id=v_request;
 if tg_op='UPDATE' and old.request_id is distinct from new.request_id then
  update public.client_material_list_jobs set generation=generation+1,updated_at=now() where request_id=old.request_id;
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
revoke all on function private.invalidate_material_list_checkpoint() from public,anon,authenticated;
create trigger material_list_source_checkpoint_invalidation before insert or update or delete on public.quote_request_items
 for each row execute function private.invalidate_material_list_checkpoint();
create trigger material_list_attachment_checkpoint_invalidation before insert or update or delete on public.quote_request_attachments
 for each row execute function private.invalidate_material_list_checkpoint();
create table private.client_material_list_checkpoints (
  job_id bigint not null references public.client_material_list_jobs(id) on delete cascade,
  generation bigint not null,
  source_fingerprint text not null check (source_fingerprint ~ '^[a-f0-9]{64}$'),
  source_revision text not null,
  chunk_count integer not null check (chunk_count between 1 and 64),
  results jsonb not null default '{}'::jsonb check (jsonb_typeof(results) = 'object'),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (job_id, generation)
);
alter table private.client_material_list_checkpoints enable row level security;
revoke all on private.client_material_list_checkpoints from public, anon, authenticated;

create function public.claim_material_list_checkpoint_jobs(p_limit integer default 1)
returns table(job_id bigint,request_id uuid,generation bigint,force_requested boolean,attempt integer,lease_token uuid)
language plpgsql security definer set search_path='' as $$
declare v_claim record; v_lease uuid; v_progress integer;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'service_only' using errcode='42501'; end if;
 for v_claim in select * from public.claim_client_material_list_jobs(p_limit) loop
  v_lease:=gen_random_uuid();
  select count(*)::integer into v_progress from private.client_material_list_checkpoints c,lateral jsonb_object_keys(c.results) k
    where c.job_id=v_claim.job_id and c.generation=v_claim.generation;
  update public.client_material_list_jobs j set ai_chunk_lease=v_lease,ai_chunk_progress=coalesce(v_progress,0) where j.id=v_claim.job_id;
  return query select v_claim.job_id,v_claim.request_id,v_claim.generation,v_claim.force_requested,v_claim.attempt,v_lease;
 end loop;
end $$;
revoke all on function public.claim_material_list_checkpoint_jobs(integer) from public,anon,authenticated;
grant execute on function public.claim_material_list_checkpoint_jobs(integer) to service_role;

create or replace function public.material_list_checkpoint(
  p_job_id bigint, p_generation bigint, p_lease uuid, p_fingerprint text, p_count integer,
  p_chunk_index integer default null, p_chunk_result jsonb default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_job public.client_material_list_jobs%rowtype; v_checkpoint private.client_material_list_checkpoints%rowtype;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'service_only' using errcode='42501'; end if;
  select * into v_job from public.client_material_list_jobs where id=p_job_id for update;
  if v_job.id is null or v_job.generation<>p_generation or v_job.status<>'processing' or v_job.ai_chunk_lease is distinct from p_lease or p_lease is null then raise exception 'stale_job'; end if;
  insert into private.client_material_list_checkpoints(job_id,generation,source_fingerprint,source_revision,chunk_count)
    values(p_job_id,p_generation,p_fingerprint,private.material_list_source_revision(v_job.request_id),p_count) on conflict do nothing;
  select * into v_checkpoint from private.client_material_list_checkpoints where job_id=p_job_id and generation=p_generation for update;
  if v_checkpoint.source_fingerprint<>p_fingerprint or v_checkpoint.chunk_count<>p_count or v_checkpoint.source_revision is distinct from private.material_list_source_revision(v_job.request_id) then raise exception 'source_changed'; end if;
  if p_chunk_index is not null then
    if p_chunk_index<0 or p_chunk_index>=p_count or p_chunk_result is null
      or jsonb_typeof(p_chunk_result)<>'object' or pg_column_size(p_chunk_result)>1048576 then raise exception 'invalid_chunk'; end if;
    -- A duplicate/late completion must not overwrite a committed chunk.
    if not (v_checkpoint.results ? p_chunk_index::text) and v_checkpoint.published_at is null then
      update private.client_material_list_checkpoints set results=jsonb_set(results,array[p_chunk_index::text],p_chunk_result),updated_at=now()
        where job_id=p_job_id and generation=p_generation returning * into v_checkpoint;
    end if;
  end if;
  return jsonb_build_object('results',v_checkpoint.results,'published',v_checkpoint.published_at is not null);
end $$;
revoke all on function public.material_list_checkpoint(bigint,bigint,uuid,text,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.material_list_checkpoint(bigint,bigint,uuid,text,integer,integer,jsonb) to service_role;

create or replace function public.continue_material_list_job(p_job_id bigint,p_generation bigint,p_lease uuid)
returns text language plpgsql security definer set search_path='' as $$
declare v_job public.client_material_list_jobs%rowtype; v_done integer; v_total integer;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'service_only' using errcode='42501'; end if;
  select * into v_job from public.client_material_list_jobs where id=p_job_id for update;
  if v_job.id is null or v_job.generation<>p_generation or v_job.status<>'processing' or v_job.ai_chunk_lease is distinct from p_lease or p_lease is null then return 'stale'; end if;
  select count(*)::integer into v_done from private.client_material_list_checkpoints c, lateral jsonb_object_keys(c.results) k
    where c.job_id=p_job_id and c.generation=p_generation;
  select chunk_count into v_total from private.client_material_list_checkpoints where job_id=p_job_id and generation=p_generation;
  if coalesce(v_done,0)<=v_job.ai_chunk_progress then raise exception 'no_chunk_progress'; end if;
  update public.client_material_list_jobs set status='queued',attempts=greatest(attempts-1,0),ai_chunk_lease=null,locked_at=null,available_at=now(),updated_at=now()
    where id=p_job_id;
  update public.quote_request_items set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
    'ai_organization_status','queued','ai_organization_job_status','queued',
    'ai_organization_chunks_done',v_done,'ai_organization_chunks_total',v_total)
    where request_id=v_job.request_id and coalesce(metadata->>'ai_organized','false')<>'true';
  return 'queued';
end $$;
revoke all on function public.continue_material_list_job(bigint,bigint,uuid) from public,anon,authenticated;
grant execute on function public.continue_material_list_job(bigint,bigint,uuid) to service_role;

create or replace function public.publish_material_list_checkpoint(
  p_job_id bigint,p_generation bigint,p_lease uuid,p_fingerprint text,p_rows jsonb,p_summary text,p_result_status text
) returns integer language plpgsql security definer set search_path='' as $$
declare v_job public.client_material_list_jobs%rowtype; v_checkpoint private.client_material_list_checkpoints%rowtype;
  v_source public.quote_request_items%rowtype; v_existing uuid[]; v_count integer; v_index integer;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'service_only' using errcode='42501'; end if;
  select * into v_job from public.client_material_list_jobs where id=p_job_id for update;
  if v_job.id is null or v_job.generation<>p_generation or v_job.status<>'processing' or v_job.ai_chunk_lease is distinct from p_lease or p_lease is null then raise exception 'stale_job'; end if;
  select * into v_checkpoint from private.client_material_list_checkpoints where job_id=p_job_id and generation=p_generation for update;
  if v_checkpoint.job_id is null or v_checkpoint.source_fingerprint<>p_fingerprint or v_checkpoint.source_revision is distinct from private.material_list_source_revision(v_job.request_id) then raise exception 'source_changed'; end if;
  if v_checkpoint.published_at is not null then
    return (select count(*)::integer from public.quote_request_items where request_id=v_job.request_id and metadata->>'ai_organized'='true');
  end if;
  for v_index in 0..v_checkpoint.chunk_count-1 loop
    if not(v_checkpoint.results ? v_index::text) then raise exception 'incomplete_chunks'; end if;
  end loop;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows)>300 or p_result_status is null or p_result_status not in ('organized','plan_requires_takeoff','needs_review') then raise exception 'invalid_result'; end if;
  if (p_result_status='organized') is distinct from (jsonb_array_length(p_rows)>0) then raise exception 'invalid_result'; end if;
  if exists(select 1 from jsonb_array_elements(p_rows) r where jsonb_typeof(r) is distinct from 'object' or jsonb_typeof(r->'name') is distinct from 'string' or nullif(btrim(r->>'name'),'') is null
    or jsonb_typeof(r->'quantity') is distinct from 'number' or (r->>'quantity')::numeric<=0 or jsonb_typeof(r->'metadata') is distinct from 'object'
    or r->'metadata'->'ai_organized' is distinct from 'true'::jsonb or r->>'qualification_status' is null or r->>'qualification_status' not in ('not_required','pending','answered','skipped')) then raise exception 'invalid_row'; end if;
  select * into v_source from public.quote_request_items where request_id=v_job.request_id and coalesce(metadata->>'ai_organized','false')<>'true' order by created_at,id limit 1;
  if v_source.id is null then raise exception 'source_missing'; end if;
  -- Lock existing rows before checking links: a concurrent FK assignment must
  -- not slip between the protection check and deletion of an old AI copy.
  select array_agg(id) into v_existing from (select id from public.quote_request_items where request_id=v_job.request_id and metadata->>'ai_organized'='true' for update) locked_items;
  if v_existing is not null and (
    exists(select 1 from public.quote_request_items i where i.id=any(v_existing) and (i.unit_price>0 or i.metadata ? 'manually_edited_at'
      or coalesce(i.metadata->'supplier_route_entries','[]'::jsonb)<>'[]'::jsonb or coalesce(i.metadata->'supplier_route_names','[]'::jsonb)<>'[]'::jsonb))
    or exists(select 1 from public.quote_comparison_items where source_request_item_id=any(v_existing))
    or exists(select 1 from public.quote_request_attachments where item_id=any(v_existing))
    or exists(select 1 from public.supplier_packages where request_id=v_job.request_id)
  ) then raise exception 'organized_work_in_use'; end if;
  -- Never discard a previous organized copy for a plan/review-only outcome.
  if jsonb_array_length(p_rows)>0 then
    insert into public.quote_request_items(request_id,project_id,owner_id,name,department,item_type,quantity,unit,unit_price,qualification_status,answers,metadata)
    select v_source.request_id,v_source.project_id,v_source.owner_id,r.name,r.department,'material',r.quantity,r.unit,0,r.qualification_status,'[]'::jsonb,r.metadata
      from jsonb_to_recordset(p_rows) as r(name text,department text,quantity numeric,unit text,qualification_status text,metadata jsonb);
    if v_existing is not null then delete from public.quote_request_items where id=any(v_existing); end if;
  end if;
  v_count:=jsonb_array_length(p_rows);
  update public.quote_request_items set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
    'ai_organization_status',p_result_status,'ai_organization_failure_code',null,
    'ai_organization_summary',left(coalesce(p_summary,''),1000),'ai_organization_item_count',v_count,
    'ai_organization_completed_at',now(),'ai_organization_chunks_done',v_checkpoint.chunk_count,'ai_organization_chunks_total',v_checkpoint.chunk_count)
    where request_id=v_job.request_id and coalesce(metadata->>'ai_organized','false')<>'true';
  update private.client_material_list_checkpoints set published_at=now(),updated_at=now() where job_id=p_job_id and generation=p_generation;
  return v_count;
end $$;
revoke all on function public.publish_material_list_checkpoint(bigint,bigint,uuid,text,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.publish_material_list_checkpoint(bigint,bigint,uuid,text,jsonb,text,text) to service_role;

create or replace function public.finish_material_list_checkpoint_job(
  p_job_id bigint,p_generation bigint,p_lease uuid,p_succeeded boolean,p_result_status text default null,
  p_item_count integer default null,p_review_count integer default null,p_error text default null
) returns text language plpgsql security definer set search_path='' as $$
declare v_status text; v_request uuid; v_job public.client_material_list_jobs%rowtype;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'service_only' using errcode='42501'; end if;
  select * into v_job from public.client_material_list_jobs where id=p_job_id for update;
  if v_job.id is null or v_job.status<>'processing' or v_job.ai_chunk_lease is distinct from p_lease or p_lease is null then return 'stale'; end if;
  if not p_succeeded and p_error in ('ai_not_configured','document_unreadable','document_page_limit','material_row_limit','attachment_limit','openai_refused','openai_http_400','openai_http_401','openai_http_403','source_changed','organized_work_in_use') then
    update public.client_material_list_jobs set attempts=max_attempts where id=p_job_id and generation=p_generation;
  end if;
  v_status:=public.finish_client_material_list_job(p_job_id,p_generation,p_succeeded,p_result_status,p_item_count,p_review_count,p_error);
  update public.client_material_list_jobs set ai_chunk_lease=null where id=p_job_id;
  select request_id into v_request from public.client_material_list_jobs where id=p_job_id and generation=p_generation;
  if v_request is not null and not p_succeeded then
    update public.quote_request_items set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('ai_organization_failure_code',left(coalesce(p_error,'organizer_failed'),80))
      where request_id=v_request and coalesce(metadata->>'ai_organized','false')<>'true';
  end if;
  return v_status;
end $$;
revoke all on function public.finish_material_list_checkpoint_job(bigint,bigint,uuid,boolean,text,integer,integer,text) from public,anon,authenticated;
grant execute on function public.finish_material_list_checkpoint_job(bigint,bigint,uuid,boolean,text,integer,integer,text) to service_role;
