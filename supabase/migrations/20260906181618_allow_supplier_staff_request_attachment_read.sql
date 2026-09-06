drop policy if exists project_upload_files_supplier_staff_read on storage.objects;
create policy project_upload_files_supplier_staff_read
on storage.objects for select to authenticated
using (
  bucket_id = 'project-uploads'
  and (select private.has_staff_capability('suppliers'))
  and exists (
    select 1
    from public.quote_requests request
    where request.owner_id::text = (storage.foldername(storage.objects.name))[1]
      and request.project_id::text = (storage.foldername(storage.objects.name))[2]
  )
);

comment on policy project_upload_files_supplier_staff_read on storage.objects is
  'Supplier staff may read client-request attachments only when pricing that request.';
