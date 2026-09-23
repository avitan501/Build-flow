-- Only the owner-authorized server routes access this private workspace.
create table public.owner_service_planners (
  id text primary key check (id = 'avantia-service-planner'),
  revision integer not null check (revision > 0),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  history jsonb not null default '[]'::jsonb check (jsonb_typeof(history) = 'array' and jsonb_array_length(history) <= 20),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id)
);
alter table public.owner_service_planners enable row level security;
revoke all on table public.owner_service_planners from public, anon, authenticated;
grant select, insert, update on table public.owner_service_planners to service_role;
comment on table public.owner_service_planners is 'Private service offer and fee planning; owner-only server access, revision-checked saves, last 20 versions.';
