alter table public.manager_outreach_leads
  add column if not exists relationship_level smallint not null default 1;

alter table public.manager_outreach_leads
  drop constraint if exists manager_outreach_leads_relationship_level_check;

alter table public.manager_outreach_leads
  add constraint manager_outreach_leads_relationship_level_check
  check (relationship_level between 1 and 5);
