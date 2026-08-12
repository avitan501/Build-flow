create index if not exists manager_file_deletion_queue_requested_by_idx
  on public.manager_file_deletion_queue(requested_by);
create index if not exists manager_deletion_audit_deleted_by_idx
  on public.manager_deletion_audit(deleted_by);

drop policy if exists "manager_file_queue_no_direct_access" on public.manager_file_deletion_queue;
create policy "manager_file_queue_no_direct_access"
  on public.manager_file_deletion_queue
  for all to authenticated
  using (false)
  with check (false);

drop policy if exists "manager_deletion_audit_no_direct_access" on public.manager_deletion_audit;
create policy "manager_deletion_audit_no_direct_access"
  on public.manager_deletion_audit
  for all to authenticated
  using (false)
  with check (false);
