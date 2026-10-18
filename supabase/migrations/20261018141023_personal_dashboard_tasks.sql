-- Separate storage prevents personal tasks entering business/team queries.
create table public.personal_dashboard_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  seed_key text,
  title text not null check (char_length(btrim(title)) between 2 and 160),
  summary text not null default '' check (char_length(summary) <= 500),
  next_step text not null default '' check (char_length(next_step) <= 500),
  status text not null default 'open' check (status in ('open', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, seed_key)
);

create index personal_dashboard_tasks_owner_created_idx
  on public.personal_dashboard_tasks(owner_id, created_at, id);

alter table public.personal_dashboard_tasks enable row level security;
revoke all on public.personal_dashboard_tasks from public, anon, authenticated;
grant select, insert on public.personal_dashboard_tasks to authenticated;
grant update (title, summary, next_step, status) on public.personal_dashboard_tasks to authenticated;
grant all on public.personal_dashboard_tasks to service_role;

create policy personal_tasks_owner_select on public.personal_dashboard_tasks
  for select to authenticated
  using (owner_id = (select auth.uid()) and (select private.is_admin()));
create policy personal_tasks_owner_insert on public.personal_dashboard_tasks
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select private.is_admin()));
create policy personal_tasks_owner_update on public.personal_dashboard_tasks
  for update to authenticated
  using (owner_id = (select auth.uid()) and (select private.is_admin()))
  with check (owner_id = (select auth.uid()) and (select private.is_admin()));

create function private.set_personal_dashboard_task_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function private.set_personal_dashboard_task_updated_at() from public, anon, authenticated;
create trigger personal_dashboard_tasks_updated_at
  before update on public.personal_dashboard_tasks
  for each row execute function private.set_personal_dashboard_task_updated_at();

comment on table public.personal_dashboard_tasks is
  'Owner-private tasks. Never published to the team. Delete in the UI archives for recovery.';
