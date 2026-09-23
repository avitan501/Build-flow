-- Supabase default privileges may grant more than the planner needs.
revoke all on table public.owner_service_planners from service_role;
grant select, insert, update on table public.owner_service_planners to service_role;
