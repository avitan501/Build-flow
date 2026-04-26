-- Draft RLS policies for profiles. Review before running.

create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_update_own_basic_fields"
on public.profiles
for update
using (auth.uid() = id)
with check (
  auth.uid() = id
  and role = (select p.role from public.profiles p where p.id = auth.uid())
  and approval_status = (select p.approval_status from public.profiles p where p.id = auth.uid())
);

create policy "profiles_admin_all"
on public.profiles
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

create policy "profiles_staff_read"
on public.profiles
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'staff')
  )
);

create policy "profiles_staff_can_approve_pending_only"
on public.profiles
for update
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'staff'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'staff'
  )
  and approval_status = 'approved'
);
