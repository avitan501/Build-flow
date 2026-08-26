alter table public.quote_requests
  add column if not exists manager_assignee text not null default 'carlos';

alter table public.quote_requests
  drop constraint if exists quote_requests_manager_assignee_check;

alter table public.quote_requests
  add constraint quote_requests_manager_assignee_check
  check (manager_assignee in ('carlos', 'david'));

comment on column public.quote_requests.manager_assignee is
  'Avantia manager responsible for the request. Existing requests default to Carlos.';
