with home_depot_snapshot(item_code, supplier_sku, product_url, unit_price) as (
  values
    ('FRA-001', '314732316', 'https://www.homedepot.com/p/314732316', 6.98::numeric),
    ('FRA-002', '312528837', 'https://www.homedepot.com/p/312528837', 9.82::numeric),
    ('FRA-003', '321712025', 'https://www.homedepot.com/p/321712025', 8.42::numeric),
    ('FRA-004', '312528849', 'https://www.homedepot.com/p/312528849', 15.57::numeric),
    ('FRA-008', '202529681', 'https://www.homedepot.com/p/202529681', 18.82::numeric),
    ('FRA-013', '312528776', 'https://www.homedepot.com/p/312528776', 4.15::numeric),
    ('FRA-014', '312528815', 'https://www.homedepot.com/p/312528815', 8.46::numeric),
    ('FRA-015', '334216730', 'https://www.homedepot.com/p/334216730', 6.83::numeric),
    ('FRA-016', '312528843', 'https://www.homedepot.com/p/312528843', 11.66::numeric),
    ('FRA-017', '202085928', 'https://www.homedepot.com/p/202085928', 21.12::numeric),
    ('FRA-018', '100095731', 'https://www.homedepot.com/p/100095731', 30.68::numeric)
)
insert into public.material_catalog_supplier_prices (
  item_id,
  supplier_id,
  supplier_name_snapshot,
  supplier_sku,
  product_url,
  unit_price,
  availability,
  notes,
  retail_store_id,
  retail_store_name,
  retail_zip_code,
  price_observed_at,
  updated_at
)
select
  item.id,
  'home-depot-retail-catalog',
  'The Home Depot',
  snapshot.supplier_sku,
  snapshot.product_url,
  snapshot.unit_price,
  'available',
  'Official Home Depot page snapshot. Confirm local stock and checkout price before ordering.',
  '1216',
  'Valley Stream',
  '11516',
  now(),
  now()
from home_depot_snapshot snapshot
join public.material_catalog_items item on item.item_code = snapshot.item_code
where item.category = 'Framing'
on conflict (item_id, supplier_id) do update
set supplier_name_snapshot = excluded.supplier_name_snapshot,
    supplier_sku = excluded.supplier_sku,
    product_url = excluded.product_url,
    unit_price = excluded.unit_price,
    availability = excluded.availability,
    notes = excluded.notes,
    retail_store_id = excluded.retail_store_id,
    retail_store_name = excluded.retail_store_name,
    retail_zip_code = excluded.retail_zip_code,
    price_observed_at = excluded.price_observed_at,
    updated_at = excluded.updated_at;
