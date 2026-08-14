alter table public.quote_comparison_bids
  add column if not exists tax_percent numeric(7, 4) not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quote_comparison_bids_tax_percent_range'
      and conrelid = 'public.quote_comparison_bids'::regclass
  ) then
    alter table public.quote_comparison_bids
      add constraint quote_comparison_bids_tax_percent_range
      check (tax_percent >= 0 and tax_percent <= 100);
  end if;
end $$;

drop function if exists public.staff_save_quote_comparison_bid(uuid, uuid, numeric, numeric, integer, text, jsonb);

create function public.staff_save_quote_comparison_bid(
  p_comparison_id uuid,
  p_bid_id uuid,
  p_delivery_charge numeric,
  p_tax_percent numeric,
  p_lead_time_days integer,
  p_notes text,
  p_prices jsonb
)
returns void
language plpgsql
security invoker
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
      tax_percent = least(greatest(coalesce(p_tax_percent, 0), 0), 100),
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

  update public.quote_comparison_bids bid
  set tax_amount = round(coalesce((
    select sum(item.quantity * price.unit_price)
    from public.quote_comparison_items item
    join public.quote_comparison_prices price
      on price.item_id = item.id
     and price.bid_id = bid.id
    where item.comparison_id = p_comparison_id
      and price.is_available
      and price.unit_price is not null
  ), 0) * bid.tax_percent / 100, 2)
  where bid.id = p_bid_id
    and bid.comparison_id = p_comparison_id;

  update public.quote_comparisons
  set status = 'review'
  where id = p_comparison_id and status = 'draft';
end;
$$;

revoke all on function public.staff_save_quote_comparison_bid(uuid, uuid, numeric, numeric, integer, text, jsonb)
  from public, anon;
grant execute on function public.staff_save_quote_comparison_bid(uuid, uuid, numeric, numeric, integer, text, jsonb)
  to authenticated;
