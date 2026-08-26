alter table public.manager_goals
  drop constraint if exists manager_goals_status_check;

alter table public.manager_goals
  add constraint manager_goals_status_check
  check (status in ('open', 'completed', 'archived'));
