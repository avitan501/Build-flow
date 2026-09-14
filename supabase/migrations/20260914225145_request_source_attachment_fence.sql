-- A source-file change participates in the same item/source row locks as safe edits.
-- No source extraction, qualification/status change or existing attachment backfill.
create schema if not exists private;
create function private.fence_request_source_attachment_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_old_request uuid;
  v_new_request uuid;
  v_request uuid;
  v_item uuid;
  v_change jsonb;
  v_name text;
begin
  if tg_op <> 'INSERT' and old.source_party is distinct from 'supplier' then v_old_request := old.request_id; end if;
  if tg_op <> 'DELETE' and new.source_party is distinct from 'supplier' then v_new_request := new.request_id; end if;
  if v_old_request is null and v_new_request is null then return null; end if;
  if tg_op = 'UPDATE' and
    row(old.request_id,old.item_id,old.file_name,old.file_path,old.file_type,old.file_size,old.source_party)
    is not distinct from
    row(new.request_id,new.item_id,new.file_name,new.file_path,new.file_type,new.file_size,new.source_party)
  then return null; end if;
  v_name := case when tg_op = 'DELETE' then old.file_name else new.file_name end;
  v_name := reverse(split_part(reverse(replace(coalesce(v_name,''),chr(92),'/')),'/',1));
  v_change := jsonb_build_object('revision',gen_random_uuid()::text,'event',lower(tg_op),
    'file_name',left(regexp_replace(v_name,'[[:cntrl:]]','','g'),240));
  -- Ordered locks match staff_apply_request_item_edit. Source-less organized rows
  -- must also be fenced. Item metadata is already covered by its exact CAS snapshot.
  for v_request in select distinct r from unnest(array[v_old_request,v_new_request]) r where r is not null order by r loop
    for v_item in select id from public.quote_request_items where request_id=v_request order by id for update loop
      update public.quote_request_items set metadata=coalesce(metadata,'{}'::jsonb) || jsonb_build_object('source_file_change',v_change)
        where id=v_item and request_id=v_request;
    end loop;
  end loop;
  return null;
end $$;
-- Trigger-only capability: no direct application execution or new table access.
revoke all on function private.fence_request_source_attachment_change() from public,anon,authenticated,service_role;
create trigger request_source_attachment_fence
after insert or update or delete on public.quote_request_attachments
for each row execute function private.fence_request_source_attachment_change();
