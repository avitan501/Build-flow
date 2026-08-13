alter table public.quote_comparisons
  add column if not exists client_id uuid references public.profiles(id) on delete set null,
  add column if not exists client_name_snapshot text not null default '' check (char_length(client_name_snapshot) <= 200),
  add column if not exists client_email_snapshot text not null default '' check (char_length(client_email_snapshot) <= 320),
  add column if not exists quote_number text,
  add column if not exists client_quote_status text not null default 'draft'
    check (client_quote_status in ('draft', 'ready', 'sent', 'accepted', 'declined')),
  add column if not exists expires_on date,
  add column if not exists client_message text not null default '' check (char_length(client_message) <= 4000),
  add column if not exists client_delivery_charge numeric(14, 2) not null default 0
    check (client_delivery_charge >= 0 and client_delivery_charge <= 100000000),
  add column if not exists quote_sent_at timestamptz;

update public.quote_comparisons
set quote_number = 'ABQ-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where quote_number is null or trim(quote_number) = '';

alter table public.quote_comparisons
  alter column quote_number set not null,
  alter column quote_number set default ('ABQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  add constraint quote_comparisons_quote_number_length
    check (char_length(trim(quote_number)) between 3 and 40);

create unique index if not exists quote_comparisons_quote_number_unique_idx
on public.quote_comparisons(lower(quote_number));

create index if not exists quote_comparisons_client_idx
on public.quote_comparisons(client_id, updated_at desc)
where client_id is not null;

alter table public.quote_comparison_items
  add column if not exists markup_percent numeric(8, 3) not null default 0
    check (markup_percent >= 0 and markup_percent <= 10000),
  add column if not exists client_unit_price numeric(14, 4)
    check (client_unit_price is null or (client_unit_price >= 0 and client_unit_price <= 100000000));

create table if not exists public.quote_comparison_client_deliveries (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references public.quote_comparisons(id) on delete cascade,
  recipient_name text not null check (char_length(trim(recipient_name)) between 1 and 200),
  recipient_email text not null check (char_length(trim(recipient_email)) between 3 and 320),
  quote_number_snapshot text not null check (char_length(trim(quote_number_snapshot)) between 3 and 40),
  subject text not null check (char_length(trim(subject)) between 1 and 300),
  client_total_snapshot numeric(14, 2) not null check (client_total_snapshot >= 0),
  profit_snapshot numeric(14, 2) not null,
  items_snapshot jsonb not null default '[]'::jsonb check (jsonb_typeof(items_snapshot) = 'array'),
  provider_id text,
  delivery_status text not null check (delivery_status in ('sent', 'failed')),
  error_message text not null default '' check (char_length(error_message) <= 2000),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists quote_comparison_client_deliveries_comparison_idx
on public.quote_comparison_client_deliveries(comparison_id, created_at desc);

alter table public.quote_comparison_client_deliveries enable row level security;

create policy "quote_comparison_client_deliveries_supplier_staff_read"
on public.quote_comparison_client_deliveries for select to authenticated
using ((select private.is_admin()) or (select private.has_staff_capability('suppliers')));

create policy "quote_comparison_client_deliveries_supplier_staff_insert"
on public.quote_comparison_client_deliveries for insert to authenticated
with check (
  ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
  and created_by = (select auth.uid())
);

revoke all on public.quote_comparison_client_deliveries from anon, authenticated;
grant select, insert on public.quote_comparison_client_deliveries to authenticated;

create or replace function public.staff_save_quote_comparison_client_quote(
  p_comparison_id uuid,
  p_client_id uuid,
  p_quote_number text,
  p_expires_on date,
  p_client_message text,
  p_client_delivery_charge numeric,
  p_items jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  client_record public.profiles%rowtype;
  expected_items integer;
  submitted_items integer;
begin
  if not (select private.is_admin())
     and not (select private.has_staff_capability('suppliers')) then
    raise exception 'Supplier management permission is required.';
  end if;

  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'items_must_be_an_array';
  end if;

  select * into client_record
  from public.profiles
  where id = p_client_id
    and role = 'client'
    and is_active = true
    and email is not null
    and trim(email) <> '';

  if not found then raise exception 'client_not_found'; end if;

  if not exists (
    select 1 from public.quote_comparisons comparison
    where comparison.id = p_comparison_id
      and comparison.status = 'awarded'
      and comparison.awarded_bid_id is not null
  ) then
    raise exception 'supplier_selection_required';
  end if;

  select count(*) into expected_items
  from public.quote_comparison_items item
  where item.comparison_id = p_comparison_id;

  select count(*) into submitted_items
  from jsonb_to_recordset(p_items) as quote_item(item_id uuid, markup_percent numeric, client_unit_price numeric)
  join public.quote_comparison_items item
    on item.id = quote_item.item_id
   and item.comparison_id = p_comparison_id
  where quote_item.client_unit_price is not null
    and quote_item.client_unit_price >= 0
    and quote_item.markup_percent >= 0;

  if expected_items = 0 or submitted_items <> expected_items then
    raise exception 'client_prices_incomplete';
  end if;

  update public.quote_comparisons
  set client_id = p_client_id,
      client_name_snapshot = left(coalesce(nullif(trim(client_record.full_name), ''), client_record.email), 200),
      client_email_snapshot = left(client_record.email, 320),
      quote_number = left(trim(p_quote_number), 40),
      expires_on = p_expires_on,
      client_message = left(coalesce(p_client_message, ''), 4000),
      client_delivery_charge = greatest(coalesce(p_client_delivery_charge, 0), 0),
      client_quote_status = 'ready',
      quote_sent_at = null
  where id = p_comparison_id;

  if not found then raise exception 'comparison_not_found'; end if;

  update public.quote_comparison_items item
  set markup_percent = greatest(quote_item.markup_percent, 0),
      client_unit_price = greatest(quote_item.client_unit_price, 0)
  from jsonb_to_recordset(p_items) as quote_item(item_id uuid, markup_percent numeric, client_unit_price numeric)
  where item.id = quote_item.item_id
    and item.comparison_id = p_comparison_id;
end;
$$;

revoke all on function public.staff_save_quote_comparison_client_quote(uuid, uuid, text, date, text, numeric, jsonb)
from public, anon;
grant execute on function public.staff_save_quote_comparison_client_quote(uuid, uuid, text, date, text, numeric, jsonb)
to authenticated;
