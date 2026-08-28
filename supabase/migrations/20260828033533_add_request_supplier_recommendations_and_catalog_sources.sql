alter table public.quote_requests
  add column if not exists manager_notes text not null default '';

create table if not exists public.quote_request_supplier_recommendations (
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  supplier_id text not null,
  supplier_name_snapshot text not null,
  is_recommended boolean not null default true,
  should_contact boolean not null default false,
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (request_id, supplier_id),
  check (char_length(supplier_id) between 1 and 180),
  check (char_length(supplier_name_snapshot) between 1 and 300)
);

create index if not exists quote_request_supplier_recommendations_request_idx
  on public.quote_request_supplier_recommendations (request_id, should_contact desc, is_recommended desc, updated_at desc);

alter table public.quote_request_supplier_recommendations enable row level security;
revoke all on public.quote_request_supplier_recommendations from anon;
grant select, insert, update, delete on public.quote_request_supplier_recommendations to authenticated;

drop policy if exists quote_request_supplier_recommendations_manager_all
  on public.quote_request_supplier_recommendations;
create policy quote_request_supplier_recommendations_manager_all
on public.quote_request_supplier_recommendations
for all
to authenticated
using ((select private.is_admin_or_staff()))
with check ((select private.is_admin_or_staff()));

alter table public.material_catalog_supplier_prices
  add column if not exists source_document_id uuid references public.manager_documents(id) on delete set null,
  add column if not exists source_file_name text,
  add column if not exists source_quote_number text,
  add column if not exists source_document_date date;

create index if not exists material_catalog_supplier_prices_source_document_idx
  on public.material_catalog_supplier_prices (source_document_id)
  where source_document_id is not null;

alter table public.material_catalog_price_history
  add column if not exists source_document_id uuid,
  add column if not exists source_file_name text,
  add column if not exists source_quote_number text,
  add column if not exists source_document_date date;

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
    old.source_quote_number, old.source_document_date
  ) is not distinct from row(
    new.supplier_sku, new.product_url, new.unit_price, new.delivery_price,
    new.minimum_order, new.comparison_price, new.availability, new.price_type,
    new.verification_status, new.retail_store_id, new.retail_store_name,
    new.retail_zip_code, new.price_observed_at, new.verified_at, new.expires_at,
    new.notes, new.source_document_id, new.source_file_name,
    new.source_quote_number, new.source_document_date
  ) then
    return new;
  end if;

  insert into public.material_catalog_price_history (
    item_id, supplier_id, supplier_name_snapshot, supplier_sku, product_url,
    unit_price, delivery_price, minimum_order, comparison_price, availability,
    price_type, verification_status, retail_store_id, retail_store_name,
    retail_zip_code, price_observed_at, verified_at, expires_at, notes,
    source_document_id, source_file_name, source_quote_number, source_document_date,
    changed_by, change_type
  ) values (
    old.item_id, old.supplier_id, old.supplier_name_snapshot, old.supplier_sku, old.product_url,
    old.unit_price, old.delivery_price, old.minimum_order, old.comparison_price, old.availability,
    old.price_type, old.verification_status, old.retail_store_id, old.retail_store_name,
    old.retail_zip_code, old.price_observed_at, old.verified_at, old.expires_at, old.notes,
    old.source_document_id, old.source_file_name, old.source_quote_number, old.source_document_date,
    old.updated_by, case when tg_op = 'DELETE' then 'deleted' else 'updated' end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.archive_material_catalog_price() from public;
