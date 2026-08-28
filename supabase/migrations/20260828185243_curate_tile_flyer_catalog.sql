-- Keep the previous Tile rows for history, but remove them from the active
-- department list when they are not part of the approved flyer assortment.
update public.material_catalog_items
set status = 'inactive', updated_at = now()
where category = 'Tile'
  and item_code not in ('TIL-004','TIL-015','TIL-016','TIL-018','TIL-026','TIL-027','TIL-028','TIL-029','TIL-030','TIL-031','TIL-032','TIL-033');

insert into public.material_catalog_items (
  category, item_code, name, description, measurement, brand,
  package_quantity, package_unit, comparison_quantity, comparison_unit,
  review_status, quality_notes, default_quantity, unit, image_url,
  status, source, sort_order
) values
  ('Tile','TIL-018','Galvanized Wire Mesh','Galvanized reinforcement for tile mortar-bed assemblies.','27 in. x 96 in. sheet','',1,'sheet',1,'sheet','ready','Supplier prices remain editable in Material Catalog.',1,'sheets','/images/materials/tile-flyer/galvanized-metal-lath.jpg','active','Avantia tile flyer',10),
  ('Tile','TIL-015','MAPEI Ultraflex 1 White Thinset','White polymer-modified thinset mortar for compatible tile installations.','50 lb. bag','MAPEI',1,'bag',1,'bag','ready','Supplier prices remain editable in Material Catalog.',1,'bags','/images/materials/tile-flyer/mapei-ultraflex-1.jpg','active','Avantia tile flyer',20),
  ('Tile','TIL-004','Cement Backer Board','Cement backer board for tile walls, floors, and wet-area assemblies.','3 ft. x 5 ft. sheet','',1,'sheet',1,'sheet','ready','Also listed in Sheet Rock.',1,'sheets','/images/materials/tile-flyer/durock-cement-board.jpg','active','Avantia tile flyer',30),
  ('Tile','TIL-026','Primer Plus','Primer for compatible self-leveling and tile-preparation systems.','5 gallon pail','',1,'pail',1,'pail','needs_review','Confirm exact manufacturer model with the supplier quote.',1,'pails','/images/materials/tile-flyer/primer-plus-5gal.png','active','Avantia tile flyer',40),
  ('Tile','TIL-027','Hydro Ban Waterproofing','Liquid waterproofing membrane for compatible wet-area tile assemblies.','5 gallon pail','LATICRETE',1,'pail',1,'pail','ready','Supplier prices remain editable in Material Catalog.',1,'pails','/images/materials/tile-flyer/hydro-ban-5-gal.jpg','active','Avantia tile flyer',50),
  ('Tile','TIL-028','Portland Cement Type I/II','Portland cement for mortar beds and cement-based tile-preparation mixes.','94 lb. bag','',1,'bag',1,'bag','ready','Supplier prices remain editable in Material Catalog.',1,'bags','/images/materials/tile-flyer/portland-cement.jpg','active','Avantia tile flyer',60),
  ('Tile','TIL-029','NXT Level Self Leveling','Cement-based self-leveling underlayment for compatible floor-preparation systems.','50 lb. bag','LATICRETE',1,'bag',1,'bag','ready','Supplier prices remain editable in Material Catalog.',1,'bags','/images/materials/tile-flyer/nxt-level-50lb.png','active','Avantia tile flyer',70),
  ('Tile','TIL-030','Strata Mat Uncoupling Membrane','Uncoupling membrane for compatible tile floor assemblies.','54 sq. ft. roll','LATICRETE',54,'sq. ft.',1,'sq. ft.','ready','Supplier prices remain editable in Material Catalog.',1,'rolls','/images/materials/tile-flyer/strata-mat-54.png','active','Avantia tile flyer',80),
  ('Tile','TIL-016','Fine Sand','Fine aggregate for tile preparation, mud work, and mortar-bed assemblies.','50 lb. bag','',1,'bag',1,'bag','ready','Supplier prices remain editable in Material Catalog.',1,'bags','/images/materials/tile-flyer/fine-sand.png','active','Avantia tile flyer',90),
  ('Tile','TIL-031','Permacolor Grout','High-performance grout for compatible tile joints and installations.','8 lb. bag','LATICRETE',1,'bag',1,'bag','ready','Confirm color with each request.',1,'bags','/images/materials/tile-flyer/permacolor-grout.png','active','Avantia tile flyer',100),
  ('Tile','TIL-032','Laticrete 209 Floor Mud','Factory-prepared floor mud for compatible mortar beds and tile substrate work.','60 lb. bag','LATICRETE',1,'bag',1,'bag','ready','Supplier prices remain editable in Material Catalog.',1,'bags','/images/materials/tile-flyer/laticrete-209-floor-mud.jpg','active','Avantia tile flyer',110),
  ('Tile','TIL-033','Premium Tile Mastic','Premixed tile adhesive for compatible interior tile applications.','1 gallon pail','LATICRETE',1,'pail',1,'pail','ready','Supplier prices remain editable in Material Catalog.',1,'pails','/images/materials/tile-flyer/premium-mastic.png','active','Avantia tile flyer',120),
  ('Sheet Rock','SHR-013','Cement Backer Board','Cement backer board shared with Tile for wet-area and substrate assemblies.','3 ft. x 5 ft. sheet','',1,'sheet',1,'sheet','ready','Shared Tile and Sheet Rock item.',1,'sheets','/images/materials/tile-flyer/durock-cement-board.jpg','active','Avantia tile flyer',130)
on conflict (item_code) do update set
  category = excluded.category,
  name = excluded.name,
  description = excluded.description,
  measurement = excluded.measurement,
  brand = excluded.brand,
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
