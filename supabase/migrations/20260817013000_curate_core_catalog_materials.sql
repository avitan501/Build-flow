-- Keep the most frequently ordered drywall products compact and put compounds first.
update public.material_catalog_items
set name = 'SHEETROCK All Purpose joint compound - green lid',
    description = 'Premixed all-purpose joint compound for taping, filling, and finishing.',
    measurement = '4.5 gal. pail', brand = 'SHEETROCK',
    package_quantity = 1, package_unit = 'pails', comparison_quantity = 1, comparison_unit = 'pails',
    review_status = 'ready', quality_notes = '', sort_order = 10, updated_at = now()
where item_code = 'SHR-004';

insert into public.material_catalog_items (
  category, item_code, name, description, measurement, thickness, brand,
  package_quantity, package_unit, comparison_quantity, comparison_unit,
  review_status, quality_notes, default_quantity, unit, image_url, status, source, sort_order
) values (
  'Sheet Rock', 'SHR-011', 'Lightweight joint compound - blue lid',
  'Premixed lightweight joint compound for finish coats and easy sanding.',
  '4.5 gal. pail', '', '', 1, 'pails', 1, 'pails', 'needs_review',
  'Add an exact manufacturer model and retailer match before marking ready.',
  1, 'pails', '/images/materials/catalog/shr-011-blue-joint-compound.png', 'active', 'curated', 20
)
on conflict (item_code) do update set
  name = excluded.name, description = excluded.description, measurement = excluded.measurement,
  package_quantity = excluded.package_quantity, package_unit = excluded.package_unit,
  comparison_quantity = excluded.comparison_quantity, comparison_unit = excluded.comparison_unit,
  review_status = excluded.review_status, quality_notes = excluded.quality_notes,
  image_url = excluded.image_url, status = 'active', sort_order = excluded.sort_order, updated_at = now();

update public.material_catalog_items
set name = '20-minute setting-type joint compound',
    description = 'Fast-setting powdered joint compound for patching and same-day finishing.',
    sort_order = 30, updated_at = now()
where item_code = 'SHR-010';

update public.material_catalog_items
set name = '1/4 in. regular drywall, 4 x 8 ft.', measurement = '4 x 8 ft. sheet', thickness = '1/4 in.',
    description = 'Thin gypsum panel commonly used for curved surfaces and covering existing walls.',
    package_quantity = 1, package_unit = 'sheets', comparison_quantity = 1, comparison_unit = 'sheet',
    review_status = 'needs_review', quality_notes = 'Add an exact manufacturer model and retailer match.',
    sort_order = 40, updated_at = now()
where item_code = 'SHR-001';

update public.material_catalog_items
set name = '1/2 in. regular drywall, 4 x 8 ft.', measurement = '4 x 8 ft. sheet', thickness = '1/2 in.',
    description = 'Standard interior wall and ceiling gypsum panel.',
    package_quantity = 1, package_unit = 'sheets', comparison_quantity = 1, comparison_unit = 'sheet',
    review_status = 'needs_review', quality_notes = 'Confirm the exact retailer model before marking ready.',
    sort_order = 50, updated_at = now()
where item_code = 'SHR-002';

insert into public.material_catalog_items (
  category, item_code, name, description, measurement, thickness,
  package_quantity, package_unit, comparison_quantity, comparison_unit,
  review_status, quality_notes, default_quantity, unit, image_url, status, source, sort_order
) values (
  'Sheet Rock', 'SHR-012', '1/2 in. moisture-resistant drywall, 4 x 8 ft.',
  'Moisture- and mold-resistant gypsum panel for bathrooms and other damp interior areas.',
  '4 x 8 ft. sheet', '1/2 in.', 1, 'sheets', 1, 'sheet', 'needs_review',
  'Add an exact manufacturer model and retailer match.', 1, 'sheets',
  '/images/materials/catalog/shr-002.jpg', 'active', 'curated', 60
)
on conflict (item_code) do update set
  name = excluded.name, description = excluded.description, measurement = excluded.measurement,
  thickness = excluded.thickness, package_quantity = excluded.package_quantity,
  package_unit = excluded.package_unit, comparison_quantity = excluded.comparison_quantity,
  comparison_unit = excluded.comparison_unit, review_status = excluded.review_status,
  quality_notes = excluded.quality_notes, image_url = excluded.image_url,
  status = 'active', sort_order = excluded.sort_order, updated_at = now();

update public.material_catalog_items
set name = '5/8 in. Type X fire-rated drywall, 4 x 8 ft.', measurement = '4 x 8 ft. sheet', thickness = '5/8 in.',
    description = 'Fire-rated Type X gypsum panel for assemblies requiring enhanced fire resistance.',
    package_quantity = 1, package_unit = 'sheets', comparison_quantity = 1, comparison_unit = 'sheet',
    sort_order = 70, updated_at = now()
where item_code = 'SHR-003';

update public.material_catalog_items
set sort_order = case item_code
  when 'SHR-005' then 80 when 'SHR-006' then 90 when 'SHR-007' then 100
  when 'SHR-008' then 110 when 'SHR-009' then 120 else sort_order end,
  updated_at = now()
where item_code in ('SHR-005','SHR-006','SHR-007','SHR-008','SHR-009');

-- Replace mismatched 4 x 12 retailer links; old rows are retained by the price-history trigger.
update public.material_catalog_supplier_prices price
set unit_price = null, product_url = null, supplier_sku = '', availability = 'unknown',
    verification_status = 'unverified', comparison_price = null, verified_at = null,
    expires_at = null, price_observed_at = null,
    notes = 'Catalog size changed to 4 x 8 ft.; add a newly verified exact product link.', updated_at = now()
from public.material_catalog_items item
where price.item_id = item.id
  and item.item_code = 'SHR-001'
  and price.supplier_id in ('home-depot-retail-catalog','lowes-retail-catalog');

update public.material_catalog_supplier_prices price
set unit_price = null, product_url = null, supplier_sku = '', availability = 'unknown',
    verification_status = 'unverified', comparison_price = null, verified_at = null,
    expires_at = null, price_observed_at = null,
    notes = 'The previous Home Depot link was a 4 x 12 ft. board; add a verified 4 x 8 ft. match.', updated_at = now()
from public.material_catalog_items item
where price.item_id = item.id and item.item_code = 'SHR-002'
  and price.supplier_id = 'home-depot-retail-catalog';

-- Keep three common plywood thicknesses in the framing comparison.
update public.material_catalog_items
set name = '3/4 in. tongue-and-groove plywood subfloor, 4 x 8 ft.',
    description = 'Tongue-and-groove plywood subfloor panel for framed floor systems.',
    measurement = '4 x 8 ft. sheet', thickness = '3/4 in.', image_url = '/images/materials/products-real/cdx-plywood-sheet.jpg',
    package_quantity = 1, package_unit = 'sheets', comparison_quantity = 1, comparison_unit = 'sheet',
    review_status = 'needs_review', quality_notes = 'Add an exact grade, manufacturer model, and retailer match.', updated_at = now()
where item_code = 'FRA-005';

update public.material_catalog_items
set name = '5/8 in. CDX plywood sheathing, 4 x 8 ft.',
    description = 'Common CDX plywood sheathing panel for wall and roof framing applications.',
    measurement = '4 x 8 ft. sheet', thickness = '5/8 in.', unit = 'sheets',
    image_url = '/images/materials/products-real/cdx-plywood-sheet.jpg',
    package_quantity = 1, package_unit = 'sheets', comparison_quantity = 1, comparison_unit = 'sheet',
    review_status = 'needs_review', quality_notes = 'Add an exact grade, manufacturer model, and retailer match.', updated_at = now()
where item_code = 'FRA-014';

update public.material_catalog_items
set name = '1/2 in. CDX plywood sheathing, 4 x 8 ft.',
    description = 'Common CDX plywood sheathing panel for general framing applications.',
    measurement = '4 x 8 ft. sheet', thickness = '1/2 in.', image_url = '/images/materials/products-real/cdx-plywood-sheet.jpg',
    package_quantity = 1, package_unit = 'sheets', comparison_quantity = 1, comparison_unit = 'sheet', updated_at = now()
where item_code = 'FRA-020';

update public.material_catalog_supplier_prices price
set unit_price = null, product_url = null, supplier_sku = '', availability = 'unknown',
    verification_status = 'unverified', comparison_price = null, verified_at = null,
    expires_at = null, price_observed_at = null,
    notes = 'Catalog item changed to plywood; add a newly verified exact product link.', updated_at = now()
from public.material_catalog_items item
where price.item_id = item.id and item.item_code in ('FRA-005','FRA-014')
  and price.supplier_id in ('home-depot-retail-catalog','lowes-retail-catalog');

update public.material_catalog_supplier_prices price
set unit_price = null, product_url = null, supplier_sku = '', availability = 'unknown',
    verification_status = 'unverified', comparison_price = null, verified_at = null,
    expires_at = null, price_observed_at = null,
    notes = 'Previous Lowe''s link was sanded plywood, not CDX; add a verified CDX match.', updated_at = now()
from public.material_catalog_items item
where price.item_id = item.id and item.item_code = 'FRA-020'
  and price.supplier_id = 'lowes-retail-catalog';

-- Use explicit flat/flush doors and corrected thumbnails instead of paneled or Shaker products.
update public.material_catalog_items
set name = case item_code
      when 'DOM-001' then '30 x 80 in. flat flush hollow-core slab door'
      when 'DOM-002' then '28 x 80 in. flat flush hollow-core slab door'
      when 'DOM-003' then '24 x 80 in. flat flush hollow-core slab door'
      when 'DOM-004' then '36 x 80 in. smooth flush steel exterior door'
      when 'DOM-005' then '60 x 80 in. flat-panel bifold closet door set'
      when 'DOM-006' then '72 x 80 in. flat-panel sliding closet door set'
    end,
    description = 'Plain smooth flat door with no Shaker rails, panels, grooves, or decorative profile.',
    measurement = case item_code
      when 'DOM-001' then '30 x 80 in.' when 'DOM-002' then '28 x 80 in.' when 'DOM-003' then '24 x 80 in.'
      when 'DOM-004' then '36 x 80 in.' when 'DOM-005' then '60 x 80 in.' else '72 x 80 in.' end,
    thickness = case when item_code in ('DOM-001','DOM-002','DOM-003') then '1-3/8 in.' else thickness end,
    image_url = '/images/materials/catalog/flat-flush-door.png',
    package_quantity = 1, package_unit = unit, comparison_quantity = 1, comparison_unit = unit,
    review_status = 'needs_review', quality_notes = 'Add an exact flat/flush retailer product before marking ready.', updated_at = now()
where item_code in ('DOM-001','DOM-002','DOM-003','DOM-004','DOM-005','DOM-006');

update public.material_catalog_supplier_prices price
set unit_price = null, product_url = null, supplier_sku = '', availability = 'unknown',
    verification_status = 'unverified', comparison_price = null, verified_at = null,
    expires_at = null, price_observed_at = null,
    notes = 'Previous retailer match was paneled; add an exact flat/flush door product.', updated_at = now()
from public.material_catalog_items item
where price.item_id = item.id and item.item_code in ('DOM-001','DOM-002','DOM-003','DOM-004','DOM-005','DOM-006')
  and price.supplier_id in ('home-depot-retail-catalog','lowes-retail-catalog');
