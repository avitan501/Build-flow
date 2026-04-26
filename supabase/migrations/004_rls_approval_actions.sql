-- Draft RLS policies for approval_actions. Review before running.

create policy "approval_actions_admin_read_all"
on public.approval_actions
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

create policy "approval_actions_staff_read"
on public.approval_actions
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'staff'
  )
);

create policy "approval_actions_admin_insert"
on public.approval_actions
for insert
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

create policy "approval_actions_staff_insert_approved_only"
on public.approval_actions
for insert
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'staff'
  )
  and action = 'approved'
  and new_approval_status = 'approved'
);
