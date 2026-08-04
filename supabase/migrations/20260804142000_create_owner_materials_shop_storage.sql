create table if not exists public.owner_materials_admin_state (
  id text primary key default 'singleton' check (id = 'singleton'),
  state jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_items (
  id text primary key,
  supplier_estimate_id text,
  supplier_name text not null,
  quote_number text,
  pricing_date date,
  item_number text,
  name text not null,
  description text,
  category text,
  quantity numeric,
  unit text,
  unit_price numeric not null check (unit_price >= 0),
  extended_price numeric not null check (extended_price >= 0),
  source text not null default 'manual' check (source in ('supplier_estimate', 'manual')),
  image_url text,
  image_alt text,
  image_source text,
  image_license text,
  image_credit text,
  image_category text,
  image_gallery jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_items_created_at_idx on public.shop_items(created_at desc);
create index if not exists shop_items_category_idx on public.shop_items(category);
create index if not exists shop_items_supplier_name_idx on public.shop_items(supplier_name);

create or replace function public.set_owner_materials_admin_state_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_shop_items_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_owner_materials_admin_state_updated_at on public.owner_materials_admin_state;
create trigger set_owner_materials_admin_state_updated_at
before update on public.owner_materials_admin_state
for each row
execute function public.set_owner_materials_admin_state_updated_at();

drop trigger if exists set_shop_items_updated_at on public.shop_items;
create trigger set_shop_items_updated_at
before update on public.shop_items
for each row
execute function public.set_shop_items_updated_at();

alter table public.owner_materials_admin_state enable row level security;
alter table public.shop_items enable row level security;

drop policy if exists "owner_materials_admin_state_service_only" on public.owner_materials_admin_state;

drop policy if exists "shop_items_public_read" on public.shop_items;
create policy "shop_items_public_read"
on public.shop_items
for select
to anon, authenticated
using (true);

drop policy if exists "shop_items_privileged_insert" on public.shop_items;
create policy "shop_items_privileged_insert"
on public.shop_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'staff')
      and approval_status = 'approved'
      and is_active = true
  )
);

drop policy if exists "shop_items_privileged_update" on public.shop_items;
create policy "shop_items_privileged_update"
on public.shop_items
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'staff')
      and approval_status = 'approved'
      and is_active = true
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'staff')
      and approval_status = 'approved'
      and is_active = true
  )
);

drop policy if exists "shop_items_privileged_delete" on public.shop_items;
create policy "shop_items_privileged_delete"
on public.shop_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'staff')
      and approval_status = 'approved'
      and is_active = true
  )
);

grant select on public.shop_items to anon, authenticated;
grant insert, update, delete on public.shop_items to authenticated;
grant select, insert, update on public.owner_materials_admin_state to authenticated;
