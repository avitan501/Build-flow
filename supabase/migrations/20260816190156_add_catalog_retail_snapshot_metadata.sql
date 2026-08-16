alter table public.material_catalog_supplier_prices
  add column if not exists retail_store_id text,
  add column if not exists retail_store_name text,
  add column if not exists retail_zip_code text,
  add column if not exists price_observed_at timestamptz;

comment on column public.material_catalog_supplier_prices.retail_store_id is
  'Retail store identifier used for a location-specific price snapshot.';
comment on column public.material_catalog_supplier_prices.retail_store_name is
  'Retail store name used for a location-specific price snapshot.';
comment on column public.material_catalog_supplier_prices.retail_zip_code is
  'Delivery or store ZIP used when the retail price was observed.';
comment on column public.material_catalog_supplier_prices.price_observed_at is
  'Time the retail price was verified; distinct from general row updates.';
