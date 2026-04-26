-- Draft RLS policies for approval_actions. Review carefully before running.
-- Contains only approval_actions policies.
-- Relies on helper functions defined in 003_rls_profiles.sql.

create policy "approval_actions_admin_read_all"
on public.approval_actions
for select
using (public.is_admin());

create policy "approval_actions_admin_insert"
on public.approval_actions
for insert
with check (
  public.is_admin()
  and performed_by = auth.uid()
);

create policy "approval_actions_staff_insert_approved_only"
on public.approval_actions
for insert
with check (
  public.is_staff()
  and performed_by = auth.uid()
  and action = 'approved'
  and old_role is null
  and new_role is null
  and old_approval_status = 'pending'
  and new_approval_status = 'approved'
);
