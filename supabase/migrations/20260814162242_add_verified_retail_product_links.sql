alter table public.material_catalog_supplier_prices
  add column if not exists product_url text;

comment on column public.material_catalog_supplier_prices.product_url is
  'Verified supplier product-detail URL for the exact catalog specification. Search and category URLs are not allowed by the application.';
