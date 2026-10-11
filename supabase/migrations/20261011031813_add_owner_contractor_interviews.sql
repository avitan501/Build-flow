-- Separate private interview records; never mutate the shared service planner.
create table public.owner_contractor_interviews (
  id uuid primary key,
  revision integer not null check (revision > 0),
  state jsonb not null check (jsonb_typeof(state) = 'object' and state @> '{"type":"avantia-contractor-discovery-v1"}'::jsonb),
  history jsonb not null default '[]'::jsonb check (jsonb_typeof(history) = 'array' and jsonb_array_length(history) <= 20),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id)
);
alter table public.owner_contractor_interviews enable row level security;
revoke all on table public.owner_contractor_interviews from public, anon, authenticated, service_role;
grant select, insert, update on table public.owner_contractor_interviews to service_role;
create index owner_contractor_interviews_recent_idx on public.owner_contractor_interviews (updated_at desc, id);
comment on table public.owner_contractor_interviews is 'Private owner-only contractor discovery answers and proposed help plans; revision-checked saves and last 20 versions. No public access.';
