-- Internal staff coordination only. Never store notes in customer-visible project_events.
create table public.request_workflow_steps (
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  step smallint not null check (step between 1 and 3),
  assignee text not null check (assignee in ('carlos', 'david')),
  note text not null default '' check (char_length(note) <= 2000),
  completed_override boolean,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id),
  primary key (request_id, step)
);
alter table public.request_workflow_steps enable row level security;
revoke all on table public.request_workflow_steps from public, anon, authenticated;
grant select, insert, update on table public.request_workflow_steps to authenticated;
grant all on table public.request_workflow_steps to service_role;

create policy request_workflow_steps_staff_read
on public.request_workflow_steps for select to authenticated
using (
  ((select private.is_admin()) and lower(btrim((select auth.jwt()) ->> 'email')) = 'avitanneto@gmail.com')
  or ((select private.is_staff()) and lower(btrim((select auth.jwt()) ->> 'email')) in ('buildavantiap@gmail.com', 'info@fivetownsbuilders.com'))
);

create policy request_workflow_steps_staff_insert
on public.request_workflow_steps for insert to authenticated
with check ((
  ((select private.is_admin()) and lower(btrim((select auth.jwt()) ->> 'email')) = 'avitanneto@gmail.com')
  or ((select private.is_staff()) and lower(btrim((select auth.jwt()) ->> 'email')) in ('buildavantiap@gmail.com', 'info@fivetownsbuilders.com'))
) and updated_by = (select auth.uid()));

create policy request_workflow_steps_staff_update
on public.request_workflow_steps for update to authenticated
using (
  ((select private.is_admin()) and lower(btrim((select auth.jwt()) ->> 'email')) = 'avitanneto@gmail.com')
  or ((select private.is_staff()) and lower(btrim((select auth.jwt()) ->> 'email')) in ('buildavantiap@gmail.com', 'info@fivetownsbuilders.com'))
)
with check ((
  ((select private.is_admin()) and lower(btrim((select auth.jwt()) ->> 'email')) = 'avitanneto@gmail.com')
  or ((select private.is_staff()) and lower(btrim((select auth.jwt()) ->> 'email')) in ('buildavantiap@gmail.com', 'info@fivetownsbuilders.com'))
) and updated_by = (select auth.uid()));

comment on table public.request_workflow_steps is 'Private per-step staff coordination. Customer/anon access prohibited; no lifecycle side effects.';
