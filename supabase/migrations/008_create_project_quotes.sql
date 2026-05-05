create table if not exists public.project_quotes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'sent', 'approved', 'rejected', 'archived')),
  subtotal numeric not null default 0,
  tax numeric not null default 0,
  total numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.project_quotes(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  material_id uuid references public.project_materials(id) on delete set null,
  name text not null,
  quantity numeric,
  unit text,
  unit_price numeric not null default 0,
  line_total numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists project_quotes_project_id_idx on public.project_quotes(project_id);
create index if not exists project_quotes_owner_id_idx on public.project_quotes(owner_id);
create index if not exists project_quote_items_quote_id_idx on public.project_quote_items(quote_id);
create index if not exists project_quote_items_project_id_idx on public.project_quote_items(project_id);
create index if not exists project_quote_items_owner_id_idx on public.project_quote_items(owner_id);
create index if not exists project_quote_items_material_id_idx on public.project_quote_items(material_id);

create or replace function public.set_project_quotes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_project_quotes_updated_at on public.project_quotes;
create trigger set_project_quotes_updated_at
before update on public.project_quotes
for each row
execute function public.set_project_quotes_updated_at();

alter table public.project_quotes enable row level security;
alter table public.project_quote_items enable row level security;

create policy "project_quotes_select_own"
on public.project_quotes
for select
using (auth.uid() = owner_id);

create policy "project_quotes_insert_own"
on public.project_quotes
for insert
with check (auth.uid() = owner_id);

create policy "project_quotes_update_own"
on public.project_quotes
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "project_quote_items_select_own"
on public.project_quote_items
for select
using (auth.uid() = owner_id);

create policy "project_quote_items_insert_own"
on public.project_quote_items
for insert
with check (auth.uid() = owner_id);

create policy "project_quote_items_update_own"
on public.project_quote_items
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
