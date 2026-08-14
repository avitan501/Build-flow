create index if not exists material_catalog_items_created_by_idx
  on public.material_catalog_items (created_by);

create index if not exists material_catalog_items_updated_by_idx
  on public.material_catalog_items (updated_by);

create index if not exists material_catalog_supplier_prices_updated_by_idx
  on public.material_catalog_supplier_prices (updated_by);
