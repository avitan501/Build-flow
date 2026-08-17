create table if not exists public.manager_goals (
  id uuid primary key default gen_random_uuid(),
  assignee text not null check (assignee in ('david', 'carlos')),
  title text not null check (char_length(trim(title)) between 2 and 120),
  details text,
  status text not null default 'open' check (status in ('open', 'completed')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists manager_goals_assignee_status_idx
  on public.manager_goals (assignee, status, created_at desc);

create or replace function public.set_manager_goals_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_manager_goals_updated_at on public.manager_goals;
create trigger set_manager_goals_updated_at
before update on public.manager_goals
for each row execute function public.set_manager_goals_updated_at();

alter table public.manager_goals enable row level security;

drop policy if exists "manager_goals_manager_read" on public.manager_goals;
create policy "manager_goals_manager_read"
on public.manager_goals for select to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'staff')
      and approval_status = 'approved'
      and is_active = true
  )
);

drop policy if exists "manager_goals_manager_insert" on public.manager_goals;
create policy "manager_goals_manager_insert"
on public.manager_goals for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'staff')
      and approval_status = 'approved'
      and is_active = true
  )
);

drop policy if exists "manager_goals_manager_update" on public.manager_goals;
create policy "manager_goals_manager_update"
on public.manager_goals for update to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'staff')
      and approval_status = 'approved'
      and is_active = true
  )
)
with check (
  exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'staff')
      and approval_status = 'approved'
      and is_active = true
  )
);

drop policy if exists "manager_goals_manager_delete" on public.manager_goals;
create policy "manager_goals_manager_delete"
on public.manager_goals for delete to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'staff')
      and approval_status = 'approved'
      and is_active = true
  )
);

revoke all on public.manager_goals from anon, authenticated;
grant select, insert, update, delete on public.manager_goals to authenticated;
