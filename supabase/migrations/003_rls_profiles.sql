-- Draft RLS policies for profiles. Review carefully before running.
-- Simplified Step 1 approach:
-- - User can read own profile
-- - Admin has full access
-- - Staff can read profiles
-- - No self-update or staff-update policy yet
-- - Approval/update actions should be handled server-side later

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'staff'
  );
$$;

create or replace function public.is_admin_or_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin() or public.is_staff();
$$;

create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_admin_all"
on public.profiles
for all
using (public.is_admin())
with check (public.is_admin());

create policy "profiles_staff_read"
on public.profiles
for select
using (public.is_admin_or_staff());
