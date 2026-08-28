alter table public.manager_goals
  add column if not exists is_focus boolean not null default false;

create index if not exists manager_goals_focus_idx
  on public.manager_goals (assignee, is_focus, status, created_at desc)
  where is_focus = true;

comment on column public.manager_goals.is_focus is
  'Marks a manager goal for the compact Focus list without changing or removing the original goal.';
