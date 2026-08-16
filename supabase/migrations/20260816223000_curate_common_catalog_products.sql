-- Correct catalog specifications and add only retailer prices verified on exact product pages.
update public.material_catalog_items
set measurement = '12 x 24 in.', updated_at = now()
where category = 'Tile' and item_code = 'TIL-001';

update public.material_catalog_items
set measurement = 'Medium grit', unit = 'pcs', updated_at = now()
where category = 'Sheet Rock' and item_code = 'SHR-009';

update public.material_catalog_items
set measurement = '18 lb. bag', unit = 'bags', updated_at = now()
where category = 'Sheet Rock' and item_code = 'SHR-010';

update public.material_catalog_items
set
  name = 'Project Source 100-sq. ft. 2-mm flooring underlayment',
  measurement = '100 sq. ft. roll',
  thickness = '2 mm',
  unit = 'rolls',
  updated_at = now()
where category = 'Flooring' and item_code = 'FLO-002';

update public.material_catalog_items
set
  name = 'Cali Bamboo 3-1/2-gal. hardwood flooring adhesive',
  measurement = '3-1/2 gal. pail',
  unit = 'pails',
  updated_at = now()
where category = 'Flooring' and item_code = 'FLO-003';

update public.material_catalog_items
set
  name = '7/16-in. x 4-ft. x 8-ft. OSB roof sheathing',
  measurement = '4 x 8 ft. sheet',
  thickness = '7/16 in.',
  updated_at = now()
where category = 'Framing' and item_code = 'FRA-007';

update public.material_catalog_items
set
  name = 'CANTEX 1-gang plastic new-work electrical box',
  measurement = 'Single gang',
  updated_at = now()
where category = 'Electrical' and item_code = 'ELE-010';

update public.material_catalog_items
set name = 'Bostitch 2-1/2-in. 16-gauge finish nails, 1,000-count', measurement = '1,000-count box', thickness = '16 gauge', updated_at = now()
where category = 'Door & Molding' and item_code = 'DOM-014';

update public.material_catalog_items
set name = 'Owens Corning VentSure 20-ft. roll ridge vent', measurement = '20 ft. roll', updated_at = now()
where category = 'Roofing' and item_code = 'ROO-007';

update public.material_catalog_items
set name = 'DAP 10.1-oz. black roof sealant', measurement = '10.1 oz. tube', updated_at = now()
where category = 'Roofing' and item_code = 'ROO-012';

update public.material_catalog_items
set name = 'SHEETROCK 4.5-gal. all-purpose joint compound', measurement = '4.5 gal. pail', updated_at = now()
where category = 'Sheet Rock' and item_code = 'SHR-004';

update public.material_catalog_items
set name = 'ProForm 2.09-in. x 500-ft. paper drywall tape', measurement = '500 ft. roll', updated_at = now()
where category = 'Sheet Rock' and item_code = 'SHR-005';

with verified(item_code, unit_price, product_url, supplier_sku) as (
  values
    ('DOM-002', 448.00::numeric, 'https://www.lowes.com/pd/AINLARRY-28-in-x-80-in-White-Quickly-Assemble-Jamb-Solid-core-2-panel-Left-hand-Smooth-Primed-MDF-Flat-Jamb-Single-Prehung-Interior-Door/5016810825', '7405219'),
    ('DOM-014', 27.98::numeric, 'https://www.lowes.com/pd/STANLEY-BOSTITCH-2-1-2-in-16-Gauge-Adhesive-Collated-Finish-Nails-1000-Per-Box/5013929521', '126079'),
    ('ELE-010', 1.98::numeric, 'https://www.lowes.com/pd/CANTEX-12-CU-IN-SINGLE-GANG-HANDY-BOX/5001905113', '2987588'),
    ('FLO-002', 39.98::numeric, 'https://www.lowes.com/pd/Project-Source-100-sq-ft-Standard-2-mm-Flooring-Underlayment/5001900621', '113768'),
    ('FRA-006', 12.90::numeric, 'https://www.lowes.com/pd/7-16-in-x-4-ft-x-8-ft-OSB-Sheathing/50382768', '12212'),
    ('FRA-007', 12.90::numeric, 'https://www.lowes.com/pd/7-16-in-x-4-ft-x-8-ft-OSB-Sheathing/50382768', '12212'),
    ('ROO-007', 34.99::numeric, 'https://www.lowes.com/pd/Owens-Corning-VentSure-7-in-x-240-in-Black-Plastic-Roll-Roof-Ridge-Vent/3151091', '147395'),
    ('ROO-012', 9.78::numeric, 'https://www.lowes.com/pd/DAP-Roof-Sealant-10-1-oz-Black-Paintable-Advanced-Sealant-Caulk/3025075', '220243'),
    ('SHR-004', 23.68::numeric, 'https://www.lowes.com/pd/SHEETROCK-Brand-4-5-Gallon-Premixed-All-purpose-Drywall-Joint-Compound/3009538', '11751'),
    ('SHR-005', 9.28::numeric, 'https://www.lowes.com/pd/ProForm-Paper-Tape-2-0937-in-x-500-ft-Solid-Joint-Tape/1002061636', '11752')
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
  retail_zip_code,
  price_observed_at,
  updated_at
)
select
  item.id,
  'lowes-retail-catalog',
  'Lowe''s',
  verified.supplier_sku,
  verified.product_url,
  verified.unit_price,
  'available',
  'Exact product-page price verified online; confirm ZIP 11516 checkout price and stock.',
  '11516',
  now(),
  now()
from verified
join public.material_catalog_items item on item.item_code = verified.item_code
on conflict (item_id, supplier_id) do update set
  supplier_name_snapshot = excluded.supplier_name_snapshot,
  supplier_sku = excluded.supplier_sku,
  product_url = excluded.product_url,
  unit_price = excluded.unit_price,
  availability = excluded.availability,
  notes = excluded.notes,
  retail_zip_code = excluded.retail_zip_code,
  price_observed_at = excluded.price_observed_at,
  updated_at = excluded.updated_at;
