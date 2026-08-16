alter table public.material_catalog_items
  add column if not exists brand text not null default '',
  add column if not exists manufacturer_model_number text not null default '',
  add column if not exists upc text not null default '',
  add column if not exists package_quantity numeric not null default 1 check (package_quantity > 0),
  add column if not exists package_unit text not null default 'each',
  add column if not exists comparison_quantity numeric not null default 1 check (comparison_quantity > 0),
  add column if not exists comparison_unit text not null default 'each',
  add column if not exists review_status text not null default 'needs_review'
    check (review_status in ('ready', 'needs_review', 'ambiguous', 'discontinued')),
  add column if not exists quality_notes text not null default '';

alter table public.material_catalog_supplier_prices
  add column if not exists price_type text not null default 'retail'
    check (price_type in ('retail', 'supplier_quote', 'contractor', 'estimated')),
  add column if not exists verification_status text not null default 'unverified'
    check (verification_status in ('verified_today', 'recently_verified', 'supplier_quote', 'stale', 'unavailable', 'possible_match', 'unverified')),
  add column if not exists delivery_price numeric check (delivery_price is null or delivery_price >= 0),
  add column if not exists minimum_order numeric not null default 1 check (minimum_order > 0),
  add column if not exists verified_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists comparison_price numeric check (comparison_price is null or comparison_price >= 0);

create table if not exists public.material_catalog_price_history (
  id bigint generated always as identity primary key,
  item_id uuid not null,
  supplier_id text not null,
  supplier_name_snapshot text not null,
  supplier_sku text not null default '',
  product_url text,
  unit_price numeric,
  delivery_price numeric,
  minimum_order numeric not null default 1,
  comparison_price numeric,
  availability text not null,
  price_type text not null,
  verification_status text not null,
  retail_store_id text,
  retail_store_name text,
  retail_zip_code text,
  price_observed_at timestamptz,
  verified_at timestamptz,
  expires_at timestamptz,
  notes text not null default '',
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  change_type text not null check (change_type in ('updated', 'deleted'))
);

create index if not exists material_catalog_price_history_lookup_idx
  on public.material_catalog_price_history (item_id, supplier_id, changed_at desc);
create index if not exists material_catalog_prices_review_idx
  on public.material_catalog_supplier_prices (verification_status, verified_at);
create index if not exists material_catalog_items_review_idx
  on public.material_catalog_items (review_status, category, status);

alter table public.material_catalog_price_history enable row level security;
revoke all on public.material_catalog_price_history from anon;
grant select on public.material_catalog_price_history to authenticated;

drop policy if exists material_catalog_price_history_manager_read on public.material_catalog_price_history;
create policy material_catalog_price_history_manager_read
on public.material_catalog_price_history
for select
to authenticated
using ((select private.is_admin_or_staff()));

create or replace function private.archive_material_catalog_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and row(
    old.supplier_sku, old.product_url, old.unit_price, old.delivery_price,
    old.minimum_order, old.comparison_price, old.availability, old.price_type,
    old.verification_status, old.retail_store_id, old.retail_store_name,
    old.retail_zip_code, old.price_observed_at, old.verified_at, old.expires_at, old.notes
  ) is not distinct from row(
    new.supplier_sku, new.product_url, new.unit_price, new.delivery_price,
    new.minimum_order, new.comparison_price, new.availability, new.price_type,
    new.verification_status, new.retail_store_id, new.retail_store_name,
    new.retail_zip_code, new.price_observed_at, new.verified_at, new.expires_at, new.notes
  ) then
    return new;
  end if;

  insert into public.material_catalog_price_history (
    item_id, supplier_id, supplier_name_snapshot, supplier_sku, product_url,
    unit_price, delivery_price, minimum_order, comparison_price, availability,
    price_type, verification_status, retail_store_id, retail_store_name,
    retail_zip_code, price_observed_at, verified_at, expires_at, notes,
    changed_by, change_type
  ) values (
    old.item_id, old.supplier_id, old.supplier_name_snapshot, old.supplier_sku, old.product_url,
    old.unit_price, old.delivery_price, old.minimum_order, old.comparison_price, old.availability,
    old.price_type, old.verification_status, old.retail_store_id, old.retail_store_name,
    old.retail_zip_code, old.price_observed_at, old.verified_at, old.expires_at, old.notes,
    old.updated_by, case when tg_op = 'DELETE' then 'deleted' else 'updated' end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.archive_material_catalog_price() from public;

drop trigger if exists archive_material_catalog_price_trigger on public.material_catalog_supplier_prices;
create trigger archive_material_catalog_price_trigger
before update or delete on public.material_catalog_supplier_prices
for each row execute function private.archive_material_catalog_price();

update public.material_catalog_supplier_prices
set
  price_type = case
    when supplier_id in ('home-depot-retail-catalog', 'lowes-retail-catalog') then 'retail'
    else 'supplier_quote'
  end,
  verification_status = case
    when availability = 'not_available' then 'unavailable'
    when unit_price is null then 'unverified'
    when supplier_id not in ('home-depot-retail-catalog', 'lowes-retail-catalog') then 'supplier_quote'
    when product_url is null or product_url = '' then 'possible_match'
    when coalesce(price_observed_at, updated_at) >= now() - interval '7 days' then 'recently_verified'
    else 'stale'
  end,
  verified_at = coalesce(verified_at, price_observed_at),
  comparison_price = unit_price
where true;

update public.material_catalog_items item
set
  package_unit = item.unit,
  comparison_unit = item.unit,
  review_status = case
    when item.name ~* '\m(any|standard|matching|regular|common|typical)\M' then 'ambiguous'
    when item.measurement = '' then 'needs_review'
    when not exists (
      select 1 from public.material_catalog_supplier_prices price
      where price.item_id = item.id and price.unit_price is not null and coalesce(price.product_url, '') <> ''
    ) then 'needs_review'
    else 'ready'
  end,
  quality_notes = case
    when item.name ~* '\m(any|standard|matching|regular|common|typical)\M' then 'Replace the generic name with one exact manufacturer product.'
    when item.measurement = '' then 'Add the exact dimensions or package coverage.'
    else item.quality_notes
  end
where true;

-- Replace generic entries only where the existing exact retailer page identifies the product.
update public.material_catalog_items set
  name = 'Schlage Millstreet satin-nickel privacy lever, 6-pack',
  brand = 'ESSENTIALS by Schlage', manufacturer_model_number = 'V40 V MST 619 6PK',
  measurement = 'Fits 1-3/8 to 1-3/4 in. doors', package_quantity = 6, package_unit = 'sets',
  comparison_quantity = 1, comparison_unit = 'set', review_status = 'ready', quality_notes = ''
where item_code = 'DOM-007';

update public.material_catalog_items set
  name = 'Schlage Millstreet satin-nickel passage lever, 6-pack',
  brand = 'ESSENTIALS by Schlage', manufacturer_model_number = 'V10 V MST 619 6PK',
  measurement = '6 door sets', package_quantity = 6, package_unit = 'sets',
  comparison_quantity = 1, comparison_unit = 'set', review_status = 'ready', quality_notes = ''
where item_code = 'DOM-008';

update public.material_catalog_items set
  name = 'Performance Accessories Warm Stone 4-in-1 laminate molding',
  brand = 'Performance Accessories', manufacturer_model_number = 'M4IN1-05699',
  measurement = '2.37 in. x 78.7 in.', thickness = '0.75 in.', package_unit = 'pcs',
  comparison_unit = 'pcs', review_status = 'ready', quality_notes = ''
where item_code = 'FLO-005';

update public.material_catalog_items set
  name = 'inhaus Coventry Lane waterproof reducer molding',
  brand = 'inhaus', manufacturer_model_number = 'RE-S24758',
  measurement = '1.74 in. x 72 in.', thickness = '0.37 in.', package_unit = 'pcs',
  comparison_unit = 'pcs', review_status = 'ready', quality_notes = ''
where item_code = 'FLO-006';

update public.material_catalog_items set
  name = 'STEPSOLUTION Navarra Maple vinyl stair tread, 2-pack',
  brand = 'STEPSOLUTION', manufacturer_model_number = '1009591304-SST',
  measurement = '46 in. x 7 in.', thickness = '7 mm', package_quantity = 2,
  package_unit = 'pcs', comparison_quantity = 1, comparison_unit = 'pc', review_status = 'ready', quality_notes = ''
where item_code = 'FLO-007';

update public.material_catalog_items set
  name = 'Apollo Tile Cirkel Orange porcelain mosaic, 9.87-sq.-ft. case',
  brand = 'Apollo Tile', manufacturer_model_number = 'ORB88013ORGA',
  measurement = '11.46 x 12.4 in.; 9.87 sq. ft. case', package_quantity = 9.87,
  package_unit = 'sq. ft.', comparison_quantity = 1, comparison_unit = 'sq. ft.', review_status = 'ready', quality_notes = ''
where item_code = 'TIL-002';

update public.material_catalog_items set
  name = 'Apollo Tile light-blue glass mosaic, 5-sq.-ft. case',
  brand = 'Apollo Tile', manufacturer_model_number = 'APLA88047 3X12A',
  measurement = '3 x 12 in.; 5 sq. ft. case', package_quantity = 5,
  package_unit = 'sq. ft.', comparison_quantity = 1, comparison_unit = 'sq. ft.', review_status = 'ready', quality_notes = ''
where item_code = 'TIL-003';

update public.material_catalog_items set
  name = 'Custom Polyblend #101 Quartz sanded grout, 25 lb.',
  brand = 'Custom Building Products', manufacturer_model_number = 'PBG10125',
  measurement = '25 lb. bag', package_quantity = 25, package_unit = 'lb.',
  comparison_quantity = 1, comparison_unit = 'lb.', review_status = 'ready', quality_notes = ''
where item_code = 'TIL-006';

update public.material_catalog_items set
  name = 'GAF Timberline HDZ Charcoal architectural shingles',
  brand = 'GAF', manufacturer_model_number = '0489180', measurement = '33.33 sq. ft. bundle',
  package_quantity = 33.33, package_unit = 'sq. ft.', comparison_quantity = 1,
  comparison_unit = 'sq. ft.', review_status = 'ready', quality_notes = ''
where item_code = 'ROO-001';

update public.material_catalog_items set
  name = 'GAF Seal-A-Ridge Charcoal ridge-cap shingles',
  brand = 'GAF', manufacturer_model_number = '0850180', measurement = '25 lin. ft. bundle',
  package_quantity = 25, package_unit = 'lin. ft.', comparison_quantity = 1,
  comparison_unit = 'lin. ft.', review_status = 'ready', quality_notes = ''
where item_code = 'ROO-002';

insert into public.material_catalog_supplier_prices (
  item_id, supplier_id, supplier_name_snapshot, supplier_sku, product_url, unit_price,
  availability, notes, retail_store_id, retail_store_name, retail_zip_code,
  price_observed_at, price_type, verification_status, verified_at,
  minimum_order, comparison_price, updated_at
)
select item.id, 'home-depot-retail-catalog', 'The Home Depot', source.sku, source.url,
  source.price, 'available', 'Exact public product-page price; confirm ZIP 11516 stock and checkout price.',
  '1216', 'Valley Stream', '11516', now(), 'retail', 'verified_today', now(), 1,
  source.price / item.package_quantity * item.comparison_quantity, now()
from (values
  ('ROO-001', '1005067402', 'https://www.homedepot.com/p/GAF-Timberline-HDZ-Charcoal-Algae-Resistant-Laminated-High-Definition-Shingles-33-33-sq-ft-per-Bundle-0489180/309755006', 42.97::numeric),
  ('ROO-002', '1002079388', 'https://www.homedepot.com/p/GAF-Seal-A-Ridge-Charcoal-Hip-and-Ridge-Cap-Roofing-Shingles-25-lin-ft-per-Bundle-0850180/206593176', 62.97::numeric)
) source(item_code, sku, url, price)
join public.material_catalog_items item on item.item_code = source.item_code
on conflict (item_id, supplier_id) do update set
  supplier_sku = excluded.supplier_sku,
  product_url = excluded.product_url,
  unit_price = excluded.unit_price,
  availability = excluded.availability,
  notes = excluded.notes,
  retail_store_id = excluded.retail_store_id,
  retail_store_name = excluded.retail_store_name,
  retail_zip_code = excluded.retail_zip_code,
  price_observed_at = excluded.price_observed_at,
  price_type = excluded.price_type,
  verification_status = excluded.verification_status,
  verified_at = excluded.verified_at,
  minimum_order = excluded.minimum_order,
  comparison_price = excluded.comparison_price,
  updated_at = excluded.updated_at;
