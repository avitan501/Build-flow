create table if not exists public.quote_comparisons (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  request_id uuid references public.quote_requests(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 160),
  department text not null default '' check (char_length(department) <= 120),
  job_address text not null default '' check (char_length(job_address) <= 500),
  status text not null default 'draft' check (status in ('draft', 'review', 'awarded', 'archived')),
  currency text not null default 'USD' check (currency = 'USD'),
  awarded_bid_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_comparison_items (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references public.quote_comparisons(id) on delete cascade,
  description text not null check (char_length(trim(description)) between 1 and 500),
  specification text not null default '' check (char_length(specification) <= 1000),
  quantity numeric(14, 3) not null check (quantity > 0 and quantity <= 100000000),
  unit text not null default 'each' check (char_length(trim(unit)) between 1 and 40),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_comparison_bids (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references public.quote_comparisons(id) on delete cascade,
  supplier_id text not null check (char_length(trim(supplier_id)) between 1 and 160),
  supplier_name_snapshot text not null check (char_length(trim(supplier_name_snapshot)) between 1 and 200),
  trust_level_snapshot text not null default 'not-reviewed'
    check (trust_level_snapshot in ('not-reviewed', 'first-time', 'verified', 'trusted', 'preferred', 'do-not-use')),
  delivery_charge numeric(14, 2) not null default 0 check (delivery_charge >= 0),
  tax_amount numeric(14, 2) not null default 0 check (tax_amount >= 0),
  lead_time_days integer check (lead_time_days is null or (lead_time_days >= 0 and lead_time_days <= 3650)),
  notes text not null default '' check (char_length(notes) <= 4000),
  status text not null default 'received' check (status in ('received', 'declined', 'awarded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (comparison_id, supplier_id),
  unique (id, comparison_id)
);

alter table public.quote_comparisons
  add constraint quote_comparisons_awarded_bid_fk
  foreign key (awarded_bid_id)
  references public.quote_comparison_bids(id)
  on delete set null;

create table if not exists public.quote_comparison_prices (
  bid_id uuid not null references public.quote_comparison_bids(id) on delete cascade,
  item_id uuid not null references public.quote_comparison_items(id) on delete cascade,
  unit_price numeric(14, 4) check (unit_price is null or (unit_price >= 0 and unit_price <= 100000000)),
  is_available boolean not null default true,
  notes text not null default '' check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (bid_id, item_id)
);

create index if not exists quote_comparisons_updated_idx
on public.quote_comparisons(updated_at desc);

create index if not exists quote_comparisons_project_idx
on public.quote_comparisons(project_id, updated_at desc)
where project_id is not null;

create index if not exists quote_comparison_items_comparison_idx
on public.quote_comparison_items(comparison_id, sort_order, created_at);

create index if not exists quote_comparison_bids_comparison_idx
on public.quote_comparison_bids(comparison_id, created_at);

create index if not exists quote_comparison_prices_item_idx
on public.quote_comparison_prices(item_id);

drop trigger if exists set_quote_comparisons_updated_at on public.quote_comparisons;
create trigger set_quote_comparisons_updated_at
before update on public.quote_comparisons
for each row execute function public.set_projects_updated_at();

drop trigger if exists set_quote_comparison_items_updated_at on public.quote_comparison_items;
create trigger set_quote_comparison_items_updated_at
before update on public.quote_comparison_items
for each row execute function public.set_projects_updated_at();

drop trigger if exists set_quote_comparison_bids_updated_at on public.quote_comparison_bids;
create trigger set_quote_comparison_bids_updated_at
before update on public.quote_comparison_bids
for each row execute function public.set_projects_updated_at();

drop trigger if exists set_quote_comparison_prices_updated_at on public.quote_comparison_prices;
create trigger set_quote_comparison_prices_updated_at
before update on public.quote_comparison_prices
for each row execute function public.set_projects_updated_at();

alter table public.quote_comparisons enable row level security;
alter table public.quote_comparison_items enable row level security;
alter table public.quote_comparison_bids enable row level security;
alter table public.quote_comparison_prices enable row level security;

create policy "quote_comparisons_supplier_staff_read"
on public.quote_comparisons for select to authenticated
using ((select private.is_admin()) or (select private.has_staff_capability('suppliers')));

create policy "quote_comparisons_supplier_staff_insert"
on public.quote_comparisons for insert to authenticated
with check (
  ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
  and created_by = (select auth.uid())
);

create policy "quote_comparisons_supplier_staff_update"
on public.quote_comparisons for update to authenticated
using ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
with check ((select private.is_admin()) or (select private.has_staff_capability('suppliers')));

create policy "quote_comparisons_supplier_staff_delete"
on public.quote_comparisons for delete to authenticated
using ((select private.is_admin()) or (select private.has_staff_capability('suppliers')));

create policy "quote_comparison_items_supplier_staff_all"
on public.quote_comparison_items for all to authenticated
using (
  ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
  and exists (
    select 1 from public.quote_comparisons comparison
    where comparison.id = comparison_id
  )
)
with check (
  ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
  and exists (
    select 1 from public.quote_comparisons comparison
    where comparison.id = comparison_id
  )
);

create policy "quote_comparison_bids_supplier_staff_all"
on public.quote_comparison_bids for all to authenticated
using (
  ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
  and exists (
    select 1 from public.quote_comparisons comparison
    where comparison.id = comparison_id
  )
)
with check (
  ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
  and exists (
    select 1 from public.quote_comparisons comparison
    where comparison.id = comparison_id
  )
);

create policy "quote_comparison_prices_supplier_staff_all"
on public.quote_comparison_prices for all to authenticated
using (
  ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
  and exists (
    select 1
    from public.quote_comparison_bids bid
    join public.quote_comparison_items item on item.comparison_id = bid.comparison_id
    where bid.id = bid_id and item.id = item_id
  )
)
with check (
  ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
  and exists (
    select 1
    from public.quote_comparison_bids bid
    join public.quote_comparison_items item on item.comparison_id = bid.comparison_id
    where bid.id = bid_id and item.id = item_id
  )
);

create or replace function public.staff_save_quote_comparison_bid(
  p_comparison_id uuid,
  p_bid_id uuid,
  p_delivery_charge numeric,
  p_tax_amount numeric,
  p_lead_time_days integer,
  p_notes text,
  p_prices jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin())
     and not (select private.has_staff_capability('suppliers')) then
    raise exception 'Supplier management permission is required.';
  end if;

  if jsonb_typeof(p_prices) <> 'array' then
    raise exception 'prices_must_be_an_array';
  end if;

  if not exists (
    select 1 from public.quote_comparisons comparison
    where comparison.id = p_comparison_id
      and comparison.status in ('draft', 'review')
  ) then
    raise exception 'comparison_locked';
  end if;

  update public.quote_comparison_bids
  set delivery_charge = greatest(coalesce(p_delivery_charge, 0), 0),
      tax_amount = greatest(coalesce(p_tax_amount, 0), 0),
      lead_time_days = case when p_lead_time_days is null then null else greatest(p_lead_time_days, 0) end,
      notes = left(coalesce(p_notes, ''), 4000)
  where id = p_bid_id
    and comparison_id = p_comparison_id;

  if not found then raise exception 'bid_not_found'; end if;

  insert into public.quote_comparison_prices (bid_id, item_id, unit_price, is_available)
  select
    p_bid_id,
    item.id,
    case when price.unit_price is null then null else greatest(price.unit_price, 0) end,
    coalesce(price.is_available, true)
  from jsonb_to_recordset(p_prices) as price(item_id uuid, unit_price numeric, is_available boolean)
  join public.quote_comparison_items item
    on item.id = price.item_id
   and item.comparison_id = p_comparison_id
  on conflict (bid_id, item_id) do update set
    unit_price = excluded.unit_price,
    is_available = excluded.is_available,
    updated_at = now();

  update public.quote_comparisons
  set status = 'review'
  where id = p_comparison_id and status = 'draft';
end;
$$;

create or replace function public.staff_award_quote_comparison_bid(
  p_comparison_id uuid,
  p_bid_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin())
     and not (select private.has_staff_capability('suppliers')) then
    raise exception 'Supplier management permission is required.';
  end if;

  if not exists (
    select 1
    from public.quote_comparisons comparison
    where comparison.id = p_comparison_id
      and comparison.status in ('draft', 'review')
  ) then
    raise exception 'comparison_locked';
  end if;

  if not exists (
    select 1
    from public.quote_comparison_bids bid
    where bid.id = p_bid_id
      and bid.comparison_id = p_comparison_id
      and bid.status <> 'declined'
      and bid.trust_level_snapshot <> 'do-not-use'
      and exists (
        select 1 from public.quote_comparison_prices price
        where price.bid_id = bid.id
          and price.is_available = true
          and price.unit_price is not null
      )
  ) then
    raise exception 'bid_not_eligible';
  end if;

  update public.quote_comparison_bids
  set status = case when id = p_bid_id then 'awarded' else 'received' end
  where comparison_id = p_comparison_id;

  update public.quote_comparisons
  set awarded_bid_id = p_bid_id,
      status = 'awarded'
  where id = p_comparison_id;

  if not found then raise exception 'comparison_not_found'; end if;
end;
$$;

create or replace function public.staff_reopen_quote_comparison(p_comparison_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin())
     and not (select private.has_staff_capability('suppliers')) then
    raise exception 'Supplier management permission is required.';
  end if;

  update public.quote_comparisons
  set awarded_bid_id = null,
      status = 'review'
  where id = p_comparison_id;

  if not found then raise exception 'comparison_not_found'; end if;

  update public.quote_comparison_bids
  set status = 'received'
  where comparison_id = p_comparison_id;
end;
$$;

revoke all on function public.staff_save_quote_comparison_bid(uuid, uuid, numeric, numeric, integer, text, jsonb) from public, anon;
revoke all on function public.staff_award_quote_comparison_bid(uuid, uuid) from public, anon;
revoke all on function public.staff_reopen_quote_comparison(uuid) from public, anon;

grant execute on function public.staff_save_quote_comparison_bid(uuid, uuid, numeric, numeric, integer, text, jsonb) to authenticated;
grant execute on function public.staff_award_quote_comparison_bid(uuid, uuid) to authenticated;
grant execute on function public.staff_reopen_quote_comparison(uuid) to authenticated;

revoke all on public.quote_comparisons,
  public.quote_comparison_items,
  public.quote_comparison_bids,
  public.quote_comparison_prices
from anon, authenticated;

grant select, insert, update, delete on public.quote_comparisons,
  public.quote_comparison_items,
  public.quote_comparison_bids,
  public.quote_comparison_prices
to authenticated;
