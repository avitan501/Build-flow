create or replace function public.normalize_shop_text(value text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(lower(trim(coalesce(value, ''))), '[^a-z0-9]+', '', 'g'), '');
$$;

create table if not exists public.shop_supplier_estimates (
  id uuid primary key default gen_random_uuid(),
  supplier_name text not null,
  quote_number text,
  estimate_date date,
  source_file_name text,
  source_file_path text,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_items (
  id uuid primary key default gen_random_uuid(),
  supplier_estimate_id uuid references public.shop_supplier_estimates(id) on delete set null,
  supplier_name text not null,
  quote_number text,
  pricing_date date,
  item_number text,
  name text not null,
  description text,
  category text,
  quantity numeric,
  unit text,
  unit_price numeric not null default 0,
  extended_price numeric not null default 0,
  source text not null default 'supplier_estimate' check (source in ('supplier_estimate', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_supplier_estimates_supplier_name_idx
  on public.shop_supplier_estimates (supplier_name);
create index if not exists shop_supplier_estimates_quote_number_idx
  on public.shop_supplier_estimates (quote_number);
create index if not exists shop_supplier_estimates_estimate_date_idx
  on public.shop_supplier_estimates (estimate_date);
create index if not exists shop_supplier_estimates_created_by_idx
  on public.shop_supplier_estimates (created_by);

create index if not exists shop_items_supplier_estimate_id_idx
  on public.shop_items (supplier_estimate_id);
create index if not exists shop_items_supplier_quote_date_idx
  on public.shop_items (supplier_name, quote_number, pricing_date);
create index if not exists shop_items_duplicate_match_idx
  on public.shop_items (lower(supplier_name), coalesce(item_number, ''), pricing_date);
create index if not exists shop_items_duplicate_fallback_idx
  on public.shop_items (
    lower(supplier_name),
    public.normalize_shop_text(name),
    public.normalize_shop_text(description),
    coalesce(lower(unit), '')
  )
  where item_number is null;

create or replace function public.set_shop_supplier_estimates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_shop_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_shop_supplier_estimates_updated_at on public.shop_supplier_estimates;
create trigger set_shop_supplier_estimates_updated_at
before update on public.shop_supplier_estimates
for each row
execute function public.set_shop_supplier_estimates_updated_at();

drop trigger if exists set_shop_items_updated_at on public.shop_items;
create trigger set_shop_items_updated_at
before update on public.shop_items
for each row
execute function public.set_shop_items_updated_at();

alter table public.shop_supplier_estimates enable row level security;
alter table public.shop_items enable row level security;

create policy "shop_supplier_estimates_admin_all"
on public.shop_supplier_estimates
for all
using (public.is_admin())
with check (public.is_admin());

create policy "shop_items_admin_all"
on public.shop_items
for all
using (public.is_admin())
with check (public.is_admin());
