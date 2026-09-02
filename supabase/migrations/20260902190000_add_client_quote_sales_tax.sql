alter table public.quote_comparisons
  add column if not exists client_tax_percent numeric(7, 4) not null default 8.875
    check (client_tax_percent >= 0 and client_tax_percent <= 100);

alter table public.quote_comparison_client_deliveries
  add column if not exists client_tax_percent_snapshot numeric(7, 4) not null default 8.875
    check (client_tax_percent_snapshot >= 0 and client_tax_percent_snapshot <= 100),
  add column if not exists client_tax_amount_snapshot numeric(14, 2) not null default 0
    check (client_tax_amount_snapshot >= 0);

drop function if exists public.staff_save_quote_comparison_client_quote(uuid, uuid, text, date, text, numeric, jsonb);

create function public.staff_save_quote_comparison_client_quote(
  p_comparison_id uuid,
  p_client_id uuid,
  p_quote_number text,
  p_expires_on date,
  p_client_message text,
  p_client_delivery_charge numeric,
  p_client_tax_percent numeric,
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
      client_tax_percent = least(100, greatest(coalesce(p_client_tax_percent, 8.875), 0)),
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

revoke all on function public.staff_save_quote_comparison_client_quote(uuid, uuid, text, date, text, numeric, numeric, jsonb)
from public, anon;
grant execute on function public.staff_save_quote_comparison_client_quote(uuid, uuid, text, date, text, numeric, numeric, jsonb)
to authenticated;
