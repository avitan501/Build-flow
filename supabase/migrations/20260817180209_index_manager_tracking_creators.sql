create index if not exists manager_outreach_leads_created_by_idx
  on public.manager_outreach_leads (created_by);

create index if not exists manager_goals_created_by_idx
  on public.manager_goals (created_by);
