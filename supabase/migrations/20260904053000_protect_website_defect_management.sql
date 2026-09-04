-- Active staff can report and review website defects. Only the owner/admin may
-- alter the tracked resolution workflow or record final QA results.
drop policy if exists website_defects_manager_update on public.website_defects;
create policy website_defects_owner_update
on public.website_defects for update to authenticated
using ((select private.is_admin()))
with check (
  (select private.is_admin())
  and created_by is not null
  and updated_by = (select auth.uid())
);

drop policy if exists website_qa_checks_manager_update on public.website_qa_checks;
create policy website_qa_checks_owner_update
on public.website_qa_checks for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists website_defect_files_manager_delete on storage.objects;
create policy website_defect_files_owner_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'website-defects'
  and (select private.is_admin())
);
