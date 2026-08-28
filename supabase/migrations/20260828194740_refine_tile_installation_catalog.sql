alter table public.material_catalog_items
  add column if not exists admin_notes text not null default '';

-- This assortment includes setting materials, backer board, cement, sand,
-- aggregates and related installation services. Keep every item ID and price
-- record, but give the department a name that describes the full assortment.
update public.material_catalog_items
set category = 'Tile Installation & Masonry', updated_at = now()
where category = 'Tile';

insert into public.material_catalog_item_departments (item_id, department)
select item_id, 'Tile Installation & Masonry'
from public.material_catalog_item_departments
where department = 'Tile'
on conflict (item_id, department) do nothing;

delete from public.material_catalog_item_departments
where department = 'Tile';

-- Retain internal item codes for stable joins and price history. The manager UI
-- no longer presents them as product information. Canonical display data below
-- uses retailer/manufacturer naming, brands and models where they are known.
with product_updates(item_code, name, description, brand, model_number, image_url, measurement, thickness) as (
  values
    ('TIL-018','27 in. x 96 in. 2.5 Metal Lath Galvanized','Flat expanded galvanized metal lath for plaster, stucco and reinforced mortar-bed assemblies. Home Depot model 4113145; Store SKU 722000.','Unbranded','4113145','/images/materials/tile-flyer/galvanized-metal-lath.jpg','27 in. x 96 in. sheet','2.5 lb. galvanized lath'),
    ('TIL-015','MAPEI Ultraflex 1 White Thinset Tile Mortar','White, polymer-modified thinset mortar for ceramic, porcelain and most natural stone on compatible floors and walls. Lowe''s Item 193422.','MAPEI','2905736','/images/materials/tile-flyer/mapei-ultraflex-1.jpg','50 lb. bag',''),
    ('TIL-004','USG Durock Cement Board with EdgeGuard','Water-durable and mold-resistant cement backer board for tile floors, walls, countertops, tubs and showers. Home Depot Store SKU 1002991354.','USG Durock','172954','/images/materials/tile-flyer/durock-cement-board.jpg','3 ft. x 5 ft. sheet','1/2 in.'),
    ('TIL-026','LATICRETE Primer Plus','Concentrated premium primer for compatible self-leveling underlayments and interior substrate preparation.','LATICRETE','Primer Plus · 5 gal','/images/materials/tile-flyer/primer-plus-5gal.png','5 gallon pail',''),
    ('TIL-028','Lehigh Portland Cement Type I-II','ASTM C150 Portland cement for mortar beds, concrete and masonry mixes. Retailer rows may show a same-size Type I-II equivalent when Lehigh is unavailable.','Heidelberg Materials / Lehigh','Type I-II · 94 lb','/images/materials/products-real/heidelberg-lehigh-portland-cement-type-i-ii-real.jpg','94 lb. bag',''),
    ('TIL-016','Fine Masonry Sand','Fine aggregate for mortar beds, tile preparation, leveling mixes and cement-based assemblies. Exact brand is selected with the supplier quote.','Supplier-selected','','/images/materials/products-real/yardas-fine-sand.jpg','25 lb. bag',''),
    ('TIL-034','Bulk Concrete-Mix Materials','Sand, aggregate and cementitious jobsite materials supplied together for field concrete mixing. Mix composition is confirmed with the supplier.','Supplier-selected','','/images/materials/bulk-bags/one-yard-sand-bag.webp','1-yard bulk bag',''),
    ('TIL-035','Bulk Crushed Stone','Clean crushed aggregate supplied by the bulk bag for concrete, drainage, base and general jobsite use. Stone size is confirmed with the supplier.','Supplier-selected','','/images/materials/bulk-bags/one-yard-crushed-stone-bag.webp','1-yard bulk bag',''),
    ('TIL-036','Ready-Mix Concrete & Pump Service','Ready-mix concrete supplied by the cubic yard with jobsite pump coordination. Mix design, minimum load, delivery distance and pump requirements are quoted per job.','Local ready-mix supplier','','/images/shop-showroom/categories/cinematic-concrete-masonry.webp','Per cubic yard',''),
    ('TIL-037','42 in. x 84 in. 10-Gauge Remesh Sheet','Grade 40 welded steel remesh with a square grid for reinforcing concrete slabs, walks and driveways. Home Depot Store SKU 175404.','Unbranded','5901028','/images/materials/products-real/concrete-remesh-sheet-real.jpg','42 in. x 84 in. sheet','10 gauge'),
    ('TIL-038','Natural Bluestone','Natural bluestone for exterior paving, steps, patios and walkways. Size, thickness and finish are selected with the supplier quote.','Supplier-selected','','/images/materials/photos/tile.jpg','Supplier-selected size and finish',''),
    ('TIL-039','Metal Drywall Framing','Metal studs, track and accessories for non-load-bearing interior drywall assemblies. Member size and gauge are selected with the supplier quote.','Supplier-selected','','/images/materials/photos/drywall.jpg','Supplier-selected member',''),
    ('TIL-040','Premium Tile Adhesive / Mastic','Ready-to-use interior ceramic-tile adhesive. The retailer columns identify the exact brand, model and store item selected for pricing.','Multiple brands','','/images/materials/tile-flyer/premium-mastic.png','1 gallon pail',''),
    ('TIL-041','Direct-Liquidation Tile','Manufacturer-direct tile offered from changing liquidation lots. Brand, size, finish and dye lot are recorded when a specific lot is selected.','Varies by lot','','/images/shop-showroom/professional/liquidation-materials-v1.webp','Priced per sq. ft.',''),
    ('TIL-042','Exterior Pavers & Stone','Natural or manufactured pavers and stone for patios, walkways, steps and landscape work. Exact brand, series, size and finish are selected with the supplier quote.','Supplier-selected','','/images/materials/photos/tile.jpg','Priced per sq. ft.','')
)
update public.material_catalog_items item
set name = product.name,
    description = product.description,
    brand = product.brand,
    manufacturer_model_number = product.model_number,
    image_url = product.image_url,
    measurement = product.measurement,
    thickness = product.thickness,
    updated_at = now()
from product_updates product
where item.item_code = product.item_code
  and item.status = 'active';

-- Rename the department inside saved supplier routing without changing any
-- supplier identity, contact, trust or communication data.
with rebuilt as (
  select settings.id,
    jsonb_agg(
      case when supplier ? 'catalogEnabledDepartments' then
        jsonb_set(
          case when supplier ? 'catalogDepartments' then
            jsonb_set(supplier, '{catalogDepartments}', (
              select coalesce(jsonb_agg(to_jsonb(case when department = 'Tile' then 'Tile Installation & Masonry' else department end)), '[]'::jsonb)
              from jsonb_array_elements_text(supplier->'catalogDepartments') as departments(department)
            ), false)
          else supplier end,
          '{catalogEnabledDepartments}', (
            select coalesce(jsonb_agg(to_jsonb(case when department = 'Tile' then 'Tile Installation & Masonry' else department end)), '[]'::jsonb)
            from jsonb_array_elements_text(supplier->'catalogEnabledDepartments') as departments(department)
          ), false)
      when supplier ? 'catalogDepartments' then
        jsonb_set(supplier, '{catalogDepartments}', (
          select coalesce(jsonb_agg(to_jsonb(case when department = 'Tile' then 'Tile Installation & Masonry' else department end)), '[]'::jsonb)
          from jsonb_array_elements_text(supplier->'catalogDepartments') as departments(department)
        ), false)
      else supplier end
      order by ordinal
    ) as suppliers
  from public.workflow_manager_settings settings
  cross join lateral jsonb_array_elements(coalesce(settings.state #> '{qualificationSettings,suppliers}', '[]'::jsonb)) with ordinality entries(supplier, ordinal)
  where settings.id = 'singleton'
  group by settings.id
)
update public.workflow_manager_settings settings
set state = jsonb_set(settings.state, '{qualificationSettings,suppliers}', rebuilt.suppliers, false),
    updated_at = now()
from rebuilt
where settings.id = rebuilt.id;
