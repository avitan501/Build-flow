create or replace function public.staff_delete_customer_quote_request(
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_request public.quote_requests%rowtype;
  item_count integer;
  attachment_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.';
  end if;

  if not (select private.has_staff_capability('customers'))
     and not (select private.is_admin()) then
    raise exception 'Customer management permission is required.';
  end if;

  select *
    into target_request
    from public.quote_requests
   where id = p_request_id
   for update;

  if target_request.id is null then
    raise exception 'request_not_found';
  end if;

  if target_request.status not in ('draft', 'submitted', 'in_review', 'quoted') then
    raise exception 'only_open_requests_can_be_deleted';
  end if;

  select count(*) into item_count
    from public.quote_request_items
   where request_id = p_request_id;
  select count(*) into attachment_count
    from public.quote_request_attachments
   where request_id = p_request_id;

  insert into public.manager_file_deletion_queue (
    bucket_id,
    object_path,
    target_type,
    target_id,
    requested_by
  )
  select
    'project-uploads',
    attachment.file_path,
    'request',
    p_request_id,
    (select auth.uid())
  from public.quote_request_attachments attachment
  where attachment.request_id = p_request_id
    and trim(attachment.file_path) <> ''
    and not exists (
      select 1
        from public.quote_request_attachments other_attachment
       where other_attachment.file_path = attachment.file_path
         and other_attachment.request_id <> p_request_id
    )
    and not exists (
      select 1
        from public.project_uploads other_upload
       where other_upload.file_path = attachment.file_path
    )
  on conflict (bucket_id, object_path) do update
    set target_type = excluded.target_type,
        target_id = excluded.target_id,
        requested_by = excluded.requested_by,
        created_at = now();

  delete from public.quote_requests where id = p_request_id;

  insert into public.manager_deletion_audit (
    target_type,
    target_id,
    target_label,
    deleted_by,
    details
  ) values (
    'request',
    p_request_id,
    target_request.title,
    (select auth.uid()),
    jsonb_build_object(
      'project_id', target_request.project_id,
      'owner_id', target_request.owner_id,
      'status', target_request.status,
      'item_count', item_count,
      'attachment_count', attachment_count
    )
  );

  return jsonb_build_object(
    'deleted', true,
    'request_id', p_request_id,
    'project_id', target_request.project_id,
    'attachment_count', attachment_count
  );
end;
$$;

revoke all on function public.staff_delete_customer_quote_request(uuid) from public, anon;
grant execute on function public.staff_delete_customer_quote_request(uuid) to authenticated;
