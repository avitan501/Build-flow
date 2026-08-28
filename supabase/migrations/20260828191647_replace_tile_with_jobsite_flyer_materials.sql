-- A catalog item can appear in more than one department while retaining one
-- canonical item ID and one set of supplier prices.
create table if not exists public.material_catalog_item_departments (
  item_id uuid not null references public.material_catalog_items(id) on delete cascade,
  department text not null,
  created_at timestamptz not null default now(),
  primary key (item_id, department)
);

create index if not exists material_catalog_item_departments_department_idx
  on public.material_catalog_item_departments (department, item_id);

alter table public.material_catalog_item_departments enable row level security;
revoke all on public.material_catalog_item_departments from anon;
grant select, insert, update, delete on public.material_catalog_item_departments to authenticated;

drop policy if exists material_catalog_item_departments_manager_all on public.material_catalog_item_departments;
create policy material_catalog_item_departments_manager_all
on public.material_catalog_item_departments
for all
to authenticated
using ((select private.is_admin_or_staff()))
with check ((select private.is_admin_or_staff()));

insert into public.material_catalog_item_departments (item_id, department)
select id, category from public.material_catalog_items
on conflict (item_id, department) do nothing;

-- Preserve historical rows and supplier-price history, but remove every old
-- item from the active Tile assortment before inserting the attached flyer list.
update public.material_catalog_items
set status = 'inactive', updated_at = now()
where category = 'Tile';

delete from public.material_catalog_item_departments
where department = 'Tile';

-- If the earlier, unapplied flyer migration is ever replayed before this one,
-- restore the existing Sheet Rock quote item that reused SHR-013 by mistake.
update public.material_catalog_items
set name = '5/8 in. Mold Tough Type X drywall, 4 x 8 ft.',
    description = 'Mold-resistant, fire-rated Type X drywall panel quoted by Jack''s Building Materials.',
    measurement = '4 x 8 ft.',
    brand = 'USG Sheetrock',
    status = 'active',
    source = 'Jack''s Building Materials',
    updated_at = now()
where item_code = 'SHR-013'
  and name = 'Cement Backer Board'
  and source = 'Avantia tile flyer';

insert into public.material_catalog_items (
  category, item_code, name, description, measurement, thickness, brand,
  manufacturer_model_number, package_quantity, package_unit,
  comparison_quantity, comparison_unit, review_status, quality_notes,
  default_quantity, unit, image_url, status, source, sort_order
) values
  ('Tile','TIL-018','Galvanized Metal Lath','Galvanized wire lath for reinforcing tile mortar beds, stucco, and cement-based wall or floor assemblies.','27 in. x 96 in. sheet','2.5 lb. lath','', '4113145',1,'sheet',1,'sheet','ready','Flyer material; exact public Home Depot product matched.',1,'sheets','/images/materials/tile-flyer/galvanized-metal-lath.jpg','active','Avantia One Call Jobsite flyer',10),
  ('Tile','TIL-015','MAPEI Ultraflex 1 White Thinset','White polymer-modified thinset mortar for ceramic tile and most natural stone on compatible floors and walls.','50 lb. bag','', 'MAPEI','2905736',1,'bag',1,'bag','ready','Flyer brand, series, color, and package size matched to the Lowe''s product page.',1,'bags','/images/materials/tile-flyer/mapei-ultraflex-1.jpg','active','Avantia One Call Jobsite flyer',20),
  ('Tile','TIL-004','Cement Backer Board','Water-durable cement backer board for tile walls, floors, countertops, showers, and other wet-area assemblies.','3 ft. x 5 ft. sheet','1/2 in.','', '',1,'sheet',1,'sheet','ready','Shared with Sheet Rock through the same catalog item ID.',1,'sheets','/images/materials/tile-flyer/durock-cement-board.jpg','active','Avantia One Call Jobsite flyer',30),
  ('Tile','TIL-026','LATICRETE Primer Plus','Concentrated primer for compatible self-leveling underlayments and tile-preparation systems.','5 gallon pail','', 'LATICRETE','Primer Plus',1,'pail',1,'pail','needs_review','Exact Home Depot and Lowe''s listings were not available; update when a supplier code is received.',1,'pails','/images/materials/tile-flyer/primer-plus-5gal.png','active','Avantia One Call Jobsite flyer',40),
  ('Tile','TIL-028','Lehigh Portland Cement Type I','Portland cement for mortar beds and field-mixed concrete or masonry applications.','94 lb. bag','', 'Lehigh Heidelberg Materials','Type I',1,'bag',1,'bag','ready','Flyer product; public Type I/II retail equivalents are recorded where exact pages were available.',1,'bags','/images/materials/tile-flyer/portland-cement.jpg','active','Avantia One Call Jobsite flyer',50),
  ('Tile','TIL-016','Fine Sand','Fine masonry aggregate for mortar beds, tile preparation, leveling mixes, and cement-based assemblies.','25 lb. bag','', '', '',1,'bag',1,'bag','needs_review','Flyer specifies a 25 lb. bag; do not substitute a different package without a supplier code.',1,'bags','/images/materials/tile-flyer/fine-sand.png','active','Avantia One Call Jobsite flyer',60),
  ('Tile','TIL-034','Concrete-Mix Materials','Sand, aggregate, and cementitious jobsite materials supplied together for field concrete mixing.','1-yard bulk bag','', '', '',1,'bulk bag',1,'bulk bag','needs_review','Bulk composition and supplier code must be confirmed before pricing.',1,'bags','/images/materials/bulk-bags/one-yard-sand-bag.webp','active','Avantia One Call Jobsite flyer',70),
  ('Tile','TIL-035','Crushed Stone','Clean crushed aggregate for concrete, drainage, base, and general jobsite use.','1-yard bulk bag','', '', '',1,'bulk bag',1,'bulk bag','needs_review','Stone size and supplier code must be confirmed before pricing.',1,'bags','/images/materials/bulk-bags/one-yard-crushed-stone-bag.webp','active','Avantia One Call Jobsite flyer',80),
  ('Tile','TIL-036','Pumped Concrete','Ready-mix concrete supplied by the cubic yard with pump coordination available for the jobsite.','Per cubic yard','', '', '',1,'cu. yd.',1,'cu. yd.','needs_review','Mix design, delivery, pump, minimum load, and site conditions require a quote.',1,'cu. yd.','/images/materials/photos/concrete.jpg','active','Avantia One Call Jobsite flyer',90),
  ('Tile','TIL-037','Driveway Reinforcing Mesh','Welded steel wire mesh for reinforcing concrete driveways, slabs, walks, and similar flatwork.','42 in. x 84 in. sheet','10 gauge','', '5901028',1,'sheet',1,'sheet','ready','Bottom-list material matched to an exact Home Depot remesh sheet.',1,'sheets','/images/materials/products-real/concrete-remesh-sheet-real.jpg','active','Avantia One Call Jobsite flyer',100),
  ('Tile','TIL-038','Bluestone','Natural bluestone for exterior paving, steps, patios, walkways, and landscape construction.','Supplier-selected size and finish','', '', '',1,'sq. ft.',1,'sq. ft.','needs_review','Size, thickness, finish, coverage, and supplier code are required before pricing.',1,'sq. ft.','/images/materials/photos/tile.jpg','active','Avantia One Call Jobsite flyer',110),
  ('Tile','TIL-039','Drywall Framing','Metal framing members and accessories for non-load-bearing interior drywall assemblies.','Supplier-selected member','', '', '',1,'each',1,'each','needs_review','Shared with Sheet Rock through the same catalog item ID; gauge and member size require a supplier code.',1,'each','/images/materials/photos/drywall.jpg','active','Avantia One Call Jobsite flyer',120),
  ('Tile','TIL-040','Tile Adhesive / Glue','Ready-to-use Type I tile adhesive or mastic for compatible interior ceramic tile installations.','1 gallon pail','', '', '',1,'pail',1,'pail','ready','Exact one-gallon ceramic tile adhesive pages matched at Home Depot and Lowe''s.',1,'pails','/images/materials/tile-flyer/premium-mastic.png','active','Avantia One Call Jobsite flyer',130),
  ('Tile','TIL-041','Direct-Liquidation Tile','Manufacturer-direct tile offered through liquidation inventory; size, finish, and lot vary by availability.','Priced per sq. ft.','', '', '',1,'sq. ft.',1,'sq. ft.','needs_review','The flyer shows an example starting price; confirm the exact lot and supplier code before publishing.',1,'sq. ft.','/images/materials/photos/tile.jpg','active','Avantia One Call Jobsite flyer',140),
  ('Tile','TIL-042','Exterior Pavers & Stone','Exterior pavers and natural or manufactured stone sourced for patios, walkways, steps, and landscape work.','Priced per sq. ft.','', '', '',1,'sq. ft.',1,'sq. ft.','needs_review','The flyer shows an example starting price; confirm the exact product and supplier code before publishing.',1,'sq. ft.','/images/materials/photos/tile.jpg','active','Avantia One Call Jobsite flyer',150)
on conflict (item_code) do update set
  category = excluded.category,
  name = excluded.name,
  description = excluded.description,
  measurement = excluded.measurement,
  thickness = excluded.thickness,
  brand = excluded.brand,
  manufacturer_model_number = excluded.manufacturer_model_number,
  package_quantity = excluded.package_quantity,
  package_unit = excluded.package_unit,
  comparison_quantity = excluded.comparison_quantity,
  comparison_unit = excluded.comparison_unit,
  review_status = excluded.review_status,
  quality_notes = excluded.quality_notes,
  default_quantity = excluded.default_quantity,
  unit = excluded.unit,
  image_url = excluded.image_url,
  status = excluded.status,
  source = excluded.source,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.material_catalog_item_departments (item_id, department)
select id, 'Tile' from public.material_catalog_items
where item_code in ('TIL-018','TIL-015','TIL-004','TIL-026','TIL-028','TIL-016','TIL-034','TIL-035','TIL-036','TIL-037','TIL-038','TIL-039','TIL-040','TIL-041','TIL-042')
on conflict (item_id, department) do nothing;

insert into public.material_catalog_item_departments (item_id, department)
select id, 'Sheet Rock' from public.material_catalog_items
where item_code in ('TIL-004','TIL-039')
on conflict (item_id, department) do nothing;

insert into public.material_catalog_item_departments (item_id, department)
select id, 'Concrete & Masonry' from public.material_catalog_items
where item_code in ('TIL-018','TIL-028','TIL-016','TIL-034','TIL-035','TIL-036','TIL-037','TIL-038','TIL-042')
on conflict (item_id, department) do nothing;

insert into public.material_catalog_item_departments (item_id, department)
select id, 'Liquidation' from public.material_catalog_items
where item_code in ('TIL-041','TIL-042')
on conflict (item_id, department) do nothing;

-- Home Depot and Lowe's start every flyer item with either an exact product
-- page and observed price or an explicit Not available state. No category or
-- search URLs are stored.
with retail_rows(item_code, supplier_id, supplier_name, supplier_sku, product_url, unit_price, availability, notes, verification_status, store_id, store_name) as (
  values
    ('TIL-018','home-depot-retail-catalog','The Home Depot','4113145','https://www.homedepot.com/p/27-in-x-96-in-2-5-Metal-Lath-Galvanized-4113145/312485681',20.58,'available','Exact product page; public price observed 2026-08-28. Confirm ZIP 11516 stock and checkout price.','verified_today','1216','Valley Stream'),
    ('TIL-018','lowes-retail-catalog','Lowe''s','',null,null,'not_available','Not available: no dependable exact Lowe''s product page and ZIP 11516 price found.','unavailable',null,null),
    ('TIL-015','home-depot-retail-catalog','The Home Depot','',null,null,'not_available','Not available: MAPEI Ultraflex 1 exact product was not found at Home Depot.','unavailable','1216','Valley Stream'),
    ('TIL-015','lowes-retail-catalog','Lowe''s','193422','https://www.lowes.com/pd/MAPEI-UltraFlex-1-50-lb-White-Thinset-Tile-Mortar/5014029391',null,'not_available','Exact product page found; ZIP-specific price was not publicly available.','unavailable',null,null),
    ('TIL-004','home-depot-retail-catalog','The Home Depot','172954','https://www.homedepot.com/p/USG-Durock-Brand-1-2-in-x-3-ft-x-5-ft-Cement-Board-with-EdgeGuard-172954/304163165',15.85,'available','Exact size and thickness; public price observed 2026-08-28. Confirm ZIP 11516 stock and checkout price.','verified_today','1216','Valley Stream'),
    ('TIL-004','lowes-retail-catalog','Lowe''s','60358','https://www.lowes.com/pd/James-Hardie-HardieBacker-3-ft-x-5-ft-x-1-2-in-Fiber-Cement-Backer-Board/3067737',17.50,'available','Exact size and thickness retail equivalent; public price observed 2026-08-28.','verified_today',null,null),
    ('TIL-026','home-depot-retail-catalog','The Home Depot','',null,null,'not_available','Not available: exact 5-gallon LATICRETE Primer Plus product page was not found.','unavailable','1216','Valley Stream'),
    ('TIL-026','lowes-retail-catalog','Lowe''s','',null,null,'not_available','Not available: exact 5-gallon LATICRETE Primer Plus product page was not found.','unavailable',null,null),
    ('TIL-028','home-depot-retail-catalog','The Home Depot','65150083','https://www.homedepot.com/p/SAKRETE-94-lbs-Type-I-II-Portland-Cement-Concrete-Mix-65150083/310851407',18.97,'available','Exact 94 lb. Type I/II retail equivalent; public price observed 2026-08-28.','verified_today','1216','Valley Stream'),
    ('TIL-028','lowes-retail-catalog','Lowe''s','487845','https://www.lowes.com/pd/Sakrete-94-lb-Portland-Type-I-II-Cement/4747733',null,'not_available','Exact 94 lb. Type I/II product page found; ZIP-specific price was not publicly available.','unavailable',null,null),
    ('TIL-016','home-depot-retail-catalog','The Home Depot','',null,null,'not_available','Not available: flyer specifies a 25 lb. bag and no exact retail page was found.','unavailable','1216','Valley Stream'),
    ('TIL-016','lowes-retail-catalog','Lowe''s','',null,null,'not_available','Not available: flyer specifies a 25 lb. bag and no exact retail page was found.','unavailable',null,null),
    ('TIL-034','home-depot-retail-catalog','The Home Depot','',null,null,'not_available','Not available: exact one-yard concrete-mix bulk bag requires a supplier quote.','unavailable','1216','Valley Stream'),
    ('TIL-034','lowes-retail-catalog','Lowe''s','',null,null,'not_available','Not available: exact one-yard concrete-mix bulk bag requires a supplier quote.','unavailable',null,null),
    ('TIL-035','home-depot-retail-catalog','The Home Depot','',null,null,'not_available','Not available: exact one-yard crushed-stone bulk bag requires a supplier quote.','unavailable','1216','Valley Stream'),
    ('TIL-035','lowes-retail-catalog','Lowe''s','',null,null,'not_available','Not available: exact one-yard crushed-stone bulk bag requires a supplier quote.','unavailable',null,null),
    ('TIL-036','home-depot-retail-catalog','The Home Depot','',null,null,'not_available','Not applicable: pumped concrete is quoted by mix, load, distance, and pump requirements.','unavailable','1216','Valley Stream'),
    ('TIL-036','lowes-retail-catalog','Lowe''s','',null,null,'not_available','Not applicable: pumped concrete is quoted by mix, load, distance, and pump requirements.','unavailable',null,null),
    ('TIL-037','home-depot-retail-catalog','The Home Depot','5901028','https://www.homedepot.com/p/42-in-x-84-in-Remesh-Sheet-5901028/206261747',10.87,'available','Exact remesh sheet; public price observed 2026-08-28. Confirm ZIP 11516 stock and checkout price.','verified_today','1216','Valley Stream'),
    ('TIL-037','lowes-retail-catalog','Lowe''s','',null,null,'not_available','Not available: no dependable exact Lowe''s product page and ZIP 11516 price found.','unavailable',null,null),
    ('TIL-038','home-depot-retail-catalog','The Home Depot','',null,null,'not_available','Not available: bluestone size, thickness, finish, and supplier code are not specified.','unavailable','1216','Valley Stream'),
    ('TIL-038','lowes-retail-catalog','Lowe''s','',null,null,'not_available','Not available: bluestone size, thickness, finish, and supplier code are not specified.','unavailable',null,null),
    ('TIL-039','home-depot-retail-catalog','The Home Depot','',null,null,'not_available','Not available: drywall framing member size and gauge are not specified.','unavailable','1216','Valley Stream'),
    ('TIL-039','lowes-retail-catalog','Lowe''s','',null,null,'not_available','Not available: drywall framing member size and gauge are not specified.','unavailable',null,null),
    ('TIL-040','home-depot-retail-catalog','The Home Depot','5900-1','https://www.homedepot.com/p/ROBERTS-1-Gal-Ceramic-Tile-Adhesive-5900-1/308420628',19.99,'available','Exact one-gallon Type I ceramic tile adhesive; public price observed 2026-08-28.','verified_today','1216','Valley Stream'),
    ('TIL-040','lowes-retail-catalog','Lowe''s','309061','https://www.lowes.com/pd/MAPEI-Premium-Mortar-Ceramic-tile-Mastic-1-Gallons/5014025073',26.98,'available','Exact one-gallon ceramic tile mastic; public price observed 2026-08-28.','verified_today',null,null),
    ('TIL-041','home-depot-retail-catalog','The Home Depot','',null,null,'not_available','Not applicable: liquidation tile varies by manufacturer, lot, size, and finish.','unavailable','1216','Valley Stream'),
    ('TIL-041','lowes-retail-catalog','Lowe''s','',null,null,'not_available','Not applicable: liquidation tile varies by manufacturer, lot, size, and finish.','unavailable',null,null),
    ('TIL-042','home-depot-retail-catalog','The Home Depot','',null,null,'not_available','Not available: exact paver or stone product is not specified.','unavailable','1216','Valley Stream'),
    ('TIL-042','lowes-retail-catalog','Lowe''s','',null,null,'not_available','Not available: exact paver or stone product is not specified.','unavailable',null,null)
)
insert into public.material_catalog_supplier_prices (
  item_id, supplier_id, supplier_name_snapshot, supplier_sku, product_url,
  unit_price, availability, notes, price_type, verification_status,
  retail_store_id, retail_store_name, retail_zip_code, price_observed_at,
  verified_at, comparison_price, minimum_order, updated_at
)
select item.id, row.supplier_id, row.supplier_name, row.supplier_sku,
  row.product_url, row.unit_price, row.availability, row.notes, 'retail',
  row.verification_status, row.store_id, row.store_name, '11516',
  case when row.unit_price is null then null else timestamptz '2026-08-28 12:00:00+00' end,
  case when row.unit_price is null then null else timestamptz '2026-08-28 12:00:00+00' end,
  row.unit_price, 1, now()
from retail_rows row
join public.material_catalog_items item on item.item_code = row.item_code
on conflict (item_id, supplier_id) do update set
  supplier_name_snapshot = excluded.supplier_name_snapshot,
  supplier_sku = excluded.supplier_sku,
  product_url = excluded.product_url,
  unit_price = excluded.unit_price,
  availability = excluded.availability,
  notes = excluded.notes,
  price_type = excluded.price_type,
  verification_status = excluded.verification_status,
  retail_store_id = excluded.retail_store_id,
  retail_store_name = excluded.retail_store_name,
  retail_zip_code = excluded.retail_zip_code,
  price_observed_at = excluded.price_observed_at,
  verified_at = excluded.verified_at,
  comparison_price = excluded.comparison_price,
  minimum_order = excluded.minimum_order,
  updated_at = now();
