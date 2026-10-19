-- Optional post-submission details, without changing the immutable original response.
create table public.client_questionnaire_followups (
  submission_id uuid primary key references public.client_questionnaire_submissions(id),
  location text not null default '' check (char_length(location) <= 180),
  timing text not null default '' check (timing in ('', 'Soon', 'Within a month', 'Later / still planning', 'Specific date')),
  needed_date date,
  updated_at timestamptz not null default now(),
  check ((timing = 'Specific date') = (needed_date is not null)),
  check (location <> '' or timing <> '')
);
alter table public.client_questionnaire_followups enable row level security;
revoke all on public.client_questionnaire_followups from public, anon, authenticated, service_role;
grant select, insert, update on public.client_questionnaire_followups to service_role;
comment on table public.client_questionnaire_followups is 'Optional location/timing appended via expiring submission-scoped capability. Owner-only reads through server. Original submissions remain immutable.';
