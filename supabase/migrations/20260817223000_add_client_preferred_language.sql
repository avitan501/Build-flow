alter table public.manager_outreach_leads
  add column if not exists preferred_language text not null default 'en';

alter table public.manager_outreach_leads
  drop constraint if exists manager_outreach_leads_preferred_language_check;

alter table public.manager_outreach_leads
  add constraint manager_outreach_leads_preferred_language_check
  check (preferred_language in ('en', 'es'));

alter table public.profiles
  add column if not exists preferred_language text not null default 'en';

alter table public.profiles
  drop constraint if exists profiles_preferred_language_check;

alter table public.profiles
  add constraint profiles_preferred_language_check
  check (preferred_language in ('en', 'es'));
