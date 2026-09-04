drop policy if exists "project_upload_files_customer_staff_read" on storage.objects;
create policy "project_upload_files_customer_staff_read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'project-uploads'
  and ((select private.is_admin()) or (select private.has_staff_capability('customers')))
  and exists (
    select 1
    from public.quote_requests request
    where request.owner_id::text = (storage.foldername(storage.objects.name))[1]
      and request.project_id::text = (storage.foldername(storage.objects.name))[2]
  )
);

drop policy if exists "project_upload_files_customer_staff_insert" on storage.objects;
create policy "project_upload_files_customer_staff_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'project-uploads'
  and ((select private.is_admin()) or (select private.has_staff_capability('customers')))
  and exists (
    select 1
    from public.quote_requests request
    where request.owner_id::text = (storage.foldername(storage.objects.name))[1]
      and request.project_id::text = (storage.foldername(storage.objects.name))[2]
  )
);

drop policy if exists "project_upload_files_customer_staff_delete" on storage.objects;
create policy "project_upload_files_customer_staff_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'project-uploads'
  and ((select private.is_admin()) or (select private.has_staff_capability('customers')))
  and exists (
    select 1
    from public.quote_requests request
    where request.owner_id::text = (storage.foldername(storage.objects.name))[1]
      and request.project_id::text = (storage.foldername(storage.objects.name))[2]
  )
);

drop policy if exists "quote_request_attachments_customer_staff_insert" on public.quote_request_attachments;
create policy "quote_request_attachments_customer_staff_insert"
on public.quote_request_attachments for insert
to authenticated
with check (
  ((select private.is_admin()) or (select private.has_staff_capability('customers')))
  and exists (
    select 1
    from public.quote_requests request
    where request.id = quote_request_attachments.request_id
      and request.project_id = quote_request_attachments.project_id
      and request.owner_id = quote_request_attachments.owner_id
  )
);
