create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and approval_status = 'approved'
      and is_active = true
  );
$$;

create or replace function private.is_staff()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'staff'
      and approval_status = 'approved'
      and is_active = true
  );
$$;

create or replace function private.is_admin_or_staff()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select private.is_admin() or private.is_staff();
$$;

revoke all on function private.is_admin() from public, anon;
revoke all on function private.is_staff() from public, anon;
revoke all on function private.is_admin_or_staff() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_staff() to authenticated;
grant execute on function private.is_admin_or_staff() to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_admin_all" on public.profiles;
drop policy if exists "profiles_staff_read" on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_admin_all"
on public.profiles
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "profiles_staff_read"
on public.profiles
for select
to authenticated
using ((select private.is_admin_or_staff()));

drop policy if exists "approval_actions_admin_read_all" on public.approval_actions;
drop policy if exists "approval_actions_admin_insert" on public.approval_actions;
drop policy if exists "approval_actions_staff_insert_approved_only" on public.approval_actions;

create policy "approval_actions_admin_read_all"
on public.approval_actions
for select
to authenticated
using ((select private.is_admin()));

create policy "approval_actions_privileged_insert"
on public.approval_actions
for insert
to authenticated
with check (
  performed_by = (select auth.uid())
  and (
    (select private.is_admin())
    or (
      (select private.is_staff())
      and action = 'approved'
      and old_role is null
      and new_role is null
      and old_approval_status = 'pending'
      and new_approval_status = 'approved'
    )
  )
);

drop function if exists public.is_admin_or_staff();
drop function if exists public.is_staff();
drop function if exists public.is_admin();

alter function public.set_projects_updated_at() set search_path = '';
alter function public.set_project_materials_updated_at() set search_path = '';
alter function public.set_project_quotes_updated_at() set search_path = '';
alter function public.set_project_orders_updated_at() set search_path = '';

create index if not exists profiles_approved_by_idx on public.profiles(approved_by);
create index if not exists approval_actions_user_id_idx on public.approval_actions(user_id);
create index if not exists approval_actions_performed_by_idx on public.approval_actions(performed_by);
