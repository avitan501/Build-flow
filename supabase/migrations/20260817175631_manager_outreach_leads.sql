create table if not exists public.manager_outreach_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  company_name text,
  email text,
  phone text,
  notes text check (notes is null or char_length(notes) <= 1000),
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'not_interested')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is not null or phone is not null)
);

create index if not exists manager_outreach_leads_status_created_idx
  on public.manager_outreach_leads (status, created_at desc);

create or replace function public.set_manager_outreach_leads_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_manager_outreach_leads_updated_at on public.manager_outreach_leads;
create trigger set_manager_outreach_leads_updated_at
before update on public.manager_outreach_leads
for each row execute function public.set_manager_outreach_leads_updated_at();

alter table public.manager_outreach_leads enable row level security;

drop policy if exists "manager_outreach_leads_manager_read" on public.manager_outreach_leads;
create policy "manager_outreach_leads_manager_read"
on public.manager_outreach_leads for select to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'staff')
      and approval_status = 'approved'
      and is_active = true
  )
);

drop policy if exists "manager_outreach_leads_manager_insert" on public.manager_outreach_leads;
create policy "manager_outreach_leads_manager_insert"
on public.manager_outreach_leads for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'staff')
      and approval_status = 'approved'
      and is_active = true
  )
);

drop policy if exists "manager_outreach_leads_manager_update" on public.manager_outreach_leads;
create policy "manager_outreach_leads_manager_update"
on public.manager_outreach_leads for update to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'staff')
      and approval_status = 'approved'
      and is_active = true
  )
)
with check (
  exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'staff')
      and approval_status = 'approved'
      and is_active = true
  )
);

drop policy if exists "manager_outreach_leads_manager_delete" on public.manager_outreach_leads;
create policy "manager_outreach_leads_manager_delete"
on public.manager_outreach_leads for delete to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'staff')
      and approval_status = 'approved'
      and is_active = true
  )
);

revoke all on public.manager_outreach_leads from anon, authenticated;
grant select, insert, update, delete on public.manager_outreach_leads to authenticated;
