create table if not exists public.manager_file_deletion_queue (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  object_path text not null,
  target_type text not null check (target_type in ('customer', 'project', 'request')),
  target_id uuid not null,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (bucket_id, object_path)
);

create index if not exists manager_file_deletion_queue_target_idx
  on public.manager_file_deletion_queue(target_type, target_id);

create table if not exists public.manager_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('customer', 'project', 'request')),
  target_id uuid not null,
  target_label text not null,
  deleted_by uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists manager_deletion_audit_created_idx
  on public.manager_deletion_audit(created_at desc);

alter table public.manager_file_deletion_queue enable row level security;
alter table public.manager_deletion_audit enable row level security;

revoke all on public.manager_file_deletion_queue from public, anon, authenticated;
revoke all on public.manager_deletion_audit from public, anon, authenticated;
grant select, delete on public.manager_file_deletion_queue to service_role;
grant select on public.manager_deletion_audit to service_role;

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

  if target_request.status not in ('draft', 'submitted', 'in_review') then
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

create or replace function public.staff_delete_customer_project(
  p_project_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_project public.projects%rowtype;
  request_count integer;
  upload_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.';
  end if;

  if not (select private.has_staff_capability('customers'))
     and not (select private.is_admin()) then
    raise exception 'Customer management permission is required.';
  end if;

  select *
    into target_project
    from public.projects
   where id = p_project_id
   for update;

  if target_project.id is null then
    raise exception 'project_not_found';
  end if;

  select count(*) into request_count
    from public.quote_requests
   where project_id = p_project_id;
  select count(*) into upload_count
    from public.project_uploads
   where project_id = p_project_id;

  insert into public.manager_file_deletion_queue (
    bucket_id,
    object_path,
    target_type,
    target_id,
    requested_by
  )
  select
    'project-uploads',
    files.file_path,
    'project',
    p_project_id,
    (select auth.uid())
  from (
    select upload.file_path
      from public.project_uploads upload
     where upload.project_id = p_project_id
    union
    select attachment.file_path
      from public.quote_request_attachments attachment
     where attachment.project_id = p_project_id
  ) files
  where trim(files.file_path) <> ''
  on conflict (bucket_id, object_path) do update
    set target_type = excluded.target_type,
        target_id = excluded.target_id,
        requested_by = excluded.requested_by,
        created_at = now();

  delete from public.projects where id = p_project_id;

  insert into public.manager_deletion_audit (
    target_type,
    target_id,
    target_label,
    deleted_by,
    details
  ) values (
    'project',
    p_project_id,
    target_project.name,
    (select auth.uid()),
    jsonb_build_object(
      'owner_id', target_project.owner_id,
      'status', target_project.status,
      'request_count', request_count,
      'upload_count', upload_count
    )
  );

  return jsonb_build_object(
    'deleted', true,
    'project_id', p_project_id,
    'request_count', request_count,
    'upload_count', upload_count
  );
end;
$$;

create or replace function public.staff_prepare_customer_deletion(
  p_customer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_customer public.profiles%rowtype;
  project_count integer;
  request_count integer;
  queued_file_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.';
  end if;

  if not (select private.is_admin()) then
    raise exception 'Administrator permission is required.';
  end if;

  if p_customer_id = (select auth.uid()) then
    raise exception 'cannot_delete_current_account';
  end if;

  select *
    into target_customer
    from public.profiles
   where id = p_customer_id
   for update;

  if target_customer.id is null then
    raise exception 'customer_not_found';
  end if;

  if target_customer.role <> 'client' then
    raise exception 'only_customer_accounts_can_be_deleted';
  end if;

  if exists (select 1 from public.profiles where approved_by = p_customer_id)
     or exists (select 1 from public.approval_actions where performed_by = p_customer_id)
     or exists (select 1 from public.supplier_quote_requests where sent_by = p_customer_id) then
    raise exception 'customer_has_manager_history';
  end if;

  select count(*) into project_count
    from public.projects
   where owner_id = p_customer_id;
  select count(*) into request_count
    from public.quote_requests
   where owner_id = p_customer_id;

  insert into public.manager_file_deletion_queue (
    bucket_id,
    object_path,
    target_type,
    target_id,
    requested_by
  )
  select
    object.bucket_id,
    object.name,
    'customer',
    p_customer_id,
    (select auth.uid())
  from storage.objects object
  where object.owner = p_customer_id
     or object.owner_id = p_customer_id::text
     or object.name like p_customer_id::text || '/%'
  on conflict (bucket_id, object_path) do update
    set target_type = excluded.target_type,
        target_id = excluded.target_id,
        requested_by = excluded.requested_by,
        created_at = now();

  select count(*) into queued_file_count
    from public.manager_file_deletion_queue
   where target_type = 'customer'
     and target_id = p_customer_id;

  return jsonb_build_object(
    'customer_id', p_customer_id,
    'project_count', project_count,
    'request_count', request_count,
    'queued_file_count', queued_file_count
  );
end;
$$;

create or replace function public.staff_delete_customer_account(
  p_customer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_customer public.profiles%rowtype;
  project_count integer;
  request_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.';
  end if;

  if not (select private.is_admin()) then
    raise exception 'Administrator permission is required.';
  end if;

  if p_customer_id = (select auth.uid()) then
    raise exception 'cannot_delete_current_account';
  end if;

  select *
    into target_customer
    from public.profiles
   where id = p_customer_id
   for update;

  if target_customer.id is null then
    raise exception 'customer_not_found';
  end if;

  if target_customer.role <> 'client' then
    raise exception 'only_customer_accounts_can_be_deleted';
  end if;

  if exists (
    select 1
      from storage.objects object
     where object.owner = p_customer_id
        or object.owner_id = p_customer_id::text
        or object.name like p_customer_id::text || '/%'
  ) then
    raise exception 'customer_files_must_be_removed_first';
  end if;

  if exists (select 1 from public.profiles where approved_by = p_customer_id)
     or exists (select 1 from public.approval_actions where performed_by = p_customer_id)
     or exists (select 1 from public.supplier_quote_requests where sent_by = p_customer_id) then
    raise exception 'customer_has_manager_history';
  end if;

  select count(*) into project_count
    from public.projects
   where owner_id = p_customer_id;
  select count(*) into request_count
    from public.quote_requests
   where owner_id = p_customer_id;

  delete from auth.users where id = p_customer_id;
  if not found then raise exception 'customer_not_found'; end if;

  insert into public.manager_deletion_audit (
    target_type,
    target_id,
    target_label,
    deleted_by,
    details
  ) values (
    'customer',
    p_customer_id,
    coalesce(nullif(trim(target_customer.full_name), ''), target_customer.email, 'Customer'),
    (select auth.uid()),
    jsonb_build_object(
      'project_count', project_count,
      'request_count', request_count
    )
  );

  return jsonb_build_object(
    'deleted', true,
    'customer_id', p_customer_id,
    'project_count', project_count,
    'request_count', request_count
  );
end;
$$;

revoke all on function public.staff_delete_customer_quote_request(uuid) from public, anon;
revoke all on function public.staff_delete_customer_project(uuid) from public, anon;
revoke all on function public.staff_prepare_customer_deletion(uuid) from public, anon;
revoke all on function public.staff_delete_customer_account(uuid) from public, anon;

grant execute on function public.staff_delete_customer_quote_request(uuid) to authenticated;
grant execute on function public.staff_delete_customer_project(uuid) to authenticated;
grant execute on function public.staff_prepare_customer_deletion(uuid) to authenticated;
grant execute on function public.staff_delete_customer_account(uuid) to authenticated;
