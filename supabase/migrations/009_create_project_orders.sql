create table if not exists public.project_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  quote_id uuid references public.project_quotes(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'ordered', 'delivered', 'cancelled', 'archived')),
  tracking_status text not null default 'not_started' check (tracking_status in ('not_started', 'preparing', 'ordered', 'in_delivery', 'delivered')),
  total numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_orders_project_id_idx on public.project_orders(project_id);
create index if not exists project_orders_owner_id_idx on public.project_orders(owner_id);
create index if not exists project_orders_quote_id_idx on public.project_orders(quote_id);
create index if not exists project_orders_status_idx on public.project_orders(status);
create index if not exists project_orders_tracking_status_idx on public.project_orders(tracking_status);

create or replace function public.set_project_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_project_orders_updated_at on public.project_orders;
create trigger set_project_orders_updated_at
before update on public.project_orders
for each row
execute function public.set_project_orders_updated_at();

alter table public.project_orders enable row level security;

create policy "project_orders_select_own"
on public.project_orders
for select
using (auth.uid() = owner_id);

create policy "project_orders_insert_own"
on public.project_orders
for insert
with check (auth.uid() = owner_id);

create policy "project_orders_update_own"
on public.project_orders
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
