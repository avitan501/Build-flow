drop policy if exists "client_quote_files_staff_read" on storage.objects;
create policy "client_quote_files_staff_read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'project-uploads'
  and (storage.foldername(name))[1] = 'client-quotes'
  and ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
);

drop policy if exists "client_quote_files_staff_insert" on storage.objects;
create policy "client_quote_files_staff_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'project-uploads'
  and (storage.foldername(name))[1] = 'client-quotes'
  and ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
);

drop policy if exists "client_quote_files_staff_delete" on storage.objects;
create policy "client_quote_files_staff_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'project-uploads'
  and (storage.foldername(name))[1] = 'client-quotes'
  and ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
);
