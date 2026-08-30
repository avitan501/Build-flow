alter table public.material_catalog_supplier_prices
  add column if not exists source_quantity numeric(14, 3),
  add column if not exists source_unit text,
  add column if not exists source_line_total numeric(14, 2),
  add column if not exists source_page integer,
  add column if not exists source_text text;

alter table public.material_catalog_supplier_prices
  drop constraint if exists material_catalog_supplier_prices_source_quantity_check,
  add constraint material_catalog_supplier_prices_source_quantity_check
    check (source_quantity is null or (source_quantity > 0 and source_quantity <= 100000000)),
  drop constraint if exists material_catalog_supplier_prices_source_unit_check,
  add constraint material_catalog_supplier_prices_source_unit_check
    check (source_unit is null or char_length(source_unit) <= 40),
  drop constraint if exists material_catalog_supplier_prices_source_line_total_check,
  add constraint material_catalog_supplier_prices_source_line_total_check
    check (source_line_total is null or (source_line_total >= 0 and source_line_total <= 100000000)),
  drop constraint if exists material_catalog_supplier_prices_source_page_check,
  add constraint material_catalog_supplier_prices_source_page_check
    check (source_page is null or source_page > 0),
  drop constraint if exists material_catalog_supplier_prices_source_text_check,
  add constraint material_catalog_supplier_prices_source_text_check
    check (source_text is null or char_length(source_text) <= 1000);

alter table public.material_catalog_price_history
  add column if not exists source_quantity numeric(14, 3),
  add column if not exists source_unit text,
  add column if not exists source_line_total numeric(14, 2),
  add column if not exists source_page integer,
  add column if not exists source_text text;

comment on column public.material_catalog_supplier_prices.source_quantity is
  'Reviewed quantity printed on the originating supplier document line.';
comment on column public.material_catalog_supplier_prices.source_unit is
  'Reviewed unit printed on the originating supplier document line.';
comment on column public.material_catalog_supplier_prices.source_line_total is
  'Reviewed line total printed on the originating supplier document line.';
comment on column public.material_catalog_supplier_prices.source_page is
  'One-based page containing the originating supplier document line.';
comment on column public.material_catalog_supplier_prices.source_text is
  'Reviewed source snippet retained as evidence for the catalog price.';

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
    old.retail_zip_code, old.price_observed_at, old.verified_at, old.expires_at,
    old.notes, old.source_document_id, old.source_file_name,
    old.source_quote_number, old.source_document_date, old.source_quantity,
    old.source_unit, old.source_line_total, old.source_page, old.source_text
  ) is not distinct from row(
    new.supplier_sku, new.product_url, new.unit_price, new.delivery_price,
    new.minimum_order, new.comparison_price, new.availability, new.price_type,
    new.verification_status, new.retail_store_id, new.retail_store_name,
    new.retail_zip_code, new.price_observed_at, new.verified_at, new.expires_at,
    new.notes, new.source_document_id, new.source_file_name,
    new.source_quote_number, new.source_document_date, new.source_quantity,
    new.source_unit, new.source_line_total, new.source_page, new.source_text
  ) then
    return new;
  end if;

  insert into public.material_catalog_price_history (
    item_id, supplier_id, supplier_name_snapshot, supplier_sku, product_url,
    unit_price, delivery_price, minimum_order, comparison_price, availability,
    price_type, verification_status, retail_store_id, retail_store_name,
    retail_zip_code, price_observed_at, verified_at, expires_at, notes,
    source_document_id, source_file_name, source_quote_number, source_document_date,
    source_quantity, source_unit, source_line_total, source_page, source_text,
    changed_by, change_type
  ) values (
    old.item_id, old.supplier_id, old.supplier_name_snapshot, old.supplier_sku, old.product_url,
    old.unit_price, old.delivery_price, old.minimum_order, old.comparison_price, old.availability,
    old.price_type, old.verification_status, old.retail_store_id, old.retail_store_name,
    old.retail_zip_code, old.price_observed_at, old.verified_at, old.expires_at, old.notes,
    old.source_document_id, old.source_file_name, old.source_quote_number, old.source_document_date,
    old.source_quantity, old.source_unit, old.source_line_total, old.source_page, old.source_text,
    old.updated_by, case when tg_op = 'DELETE' then 'deleted' else 'updated' end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.archive_material_catalog_price() from public;
