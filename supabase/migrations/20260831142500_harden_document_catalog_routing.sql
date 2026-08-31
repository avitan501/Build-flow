-- Keep one active supplier comparison per material request and align direct
-- catalog mutations with the same suppliers capability enforced by the app.

-- Production is preflighted before deployment. Refuse rather than mutate
-- linked document history if another environment contains old duplicates.
do $$
begin
  if exists (
    select 1
    from public.manager_documents document
    where document.source_sha256 is not null
      and document.status <> 'archived'
    group by document.source_sha256
    having count(*) > 1
  ) then
    raise exception 'duplicate_active_manager_document_sha256_preflight_failed';
  end if;
end;
$$;

create unique index if not exists manager_documents_active_source_sha256_uidx
  on public.manager_documents (source_sha256)
  where source_sha256 is not null and status <> 'archived';

comment on index public.manager_documents_active_source_sha256_uidx is
  'Makes concurrent uploads of the same file idempotent while retaining archived history.';

drop policy if exists material_catalog_items_manager_all
  on public.material_catalog_items;
create policy material_catalog_items_suppliers_all
  on public.material_catalog_items
  for all
  to authenticated
  using (
    (select private.is_admin())
    or (select private.has_staff_capability('suppliers'))
  )
  with check (
    (select private.is_admin())
    or (select private.has_staff_capability('suppliers'))
  );

drop policy if exists material_catalog_supplier_prices_manager_all
  on public.material_catalog_supplier_prices;
create policy material_catalog_supplier_prices_suppliers_all
  on public.material_catalog_supplier_prices
  for all
  to authenticated
  using (
    (select private.is_admin())
    or (select private.has_staff_capability('suppliers'))
  )
  with check (
    (select private.is_admin())
    or (select private.has_staff_capability('suppliers'))
  );

drop policy if exists material_catalog_item_departments_manager_all
  on public.material_catalog_item_departments;
create policy material_catalog_item_departments_suppliers_all
  on public.material_catalog_item_departments
  for all
  to authenticated
  using (
    (select private.is_admin())
    or (select private.has_staff_capability('suppliers'))
  )
  with check (
    (select private.is_admin())
    or (select private.has_staff_capability('suppliers'))
  );

drop policy if exists material_catalog_price_history_manager_read
  on public.material_catalog_price_history;
create policy material_catalog_price_history_suppliers_read
  on public.material_catalog_price_history
  for select
  to authenticated
  using (
    (select private.is_admin())
    or (select private.has_staff_capability('suppliers'))
  );

do $$
begin
  if exists (
    select 1
    from public.quote_comparisons comparison
    where comparison.request_id is not null
      and comparison.status in ('draft', 'review')
    group by comparison.request_id
    having count(*) > 1
  ) then
    raise exception 'duplicate_active_request_comparison_preflight_failed';
  end if;
end;
$$;

create unique index if not exists quote_comparisons_one_active_per_request_idx
  on public.quote_comparisons (request_id)
  where request_id is not null and status in ('draft', 'review');

comment on index public.quote_comparisons_one_active_per_request_idx is
  'Prevents concurrent document routes from creating duplicate active comparison workspaces for one request.';

do $$
begin
  if exists (
    select 1
    from public.quote_comparison_items item
    group by item.comparison_id, item.sort_order
    having count(*) > 1
  ) then
    raise exception 'duplicate_comparison_item_sort_order_preflight_failed';
  end if;
end;
$$;

create unique index if not exists quote_comparison_items_sort_order_uidx
  on public.quote_comparison_items (comparison_id, sort_order);

-- Give every routed supplier quote and quote line a stable source identity.
-- Existing rows remain valid because the new columns are nullable. The partial
-- unique indexes make retries idempotent without guessing from names or line
-- numbers, while still allowing legacy and manually entered quotes.
alter table public.supplier_quotes
  add column if not exists source_document_id uuid
    references public.manager_documents(id) on delete restrict,
  add column if not exists source_vendor_name text,
  add column if not exists source_contact_name text,
  add column if not exists source_delivery_charge numeric(14, 2);

alter table public.supplier_quotes
  drop constraint if exists supplier_quotes_source_vendor_name_check,
  add constraint supplier_quotes_source_vendor_name_check
    check (source_vendor_name is null or char_length(trim(source_vendor_name)) between 1 and 200),
  drop constraint if exists supplier_quotes_source_contact_name_check,
  add constraint supplier_quotes_source_contact_name_check
    check (source_contact_name is null or char_length(trim(source_contact_name)) between 1 and 200),
  drop constraint if exists supplier_quotes_source_delivery_charge_check,
  add constraint supplier_quotes_source_delivery_charge_check
    check (
      source_delivery_charge is null
      or (source_delivery_charge >= 0 and source_delivery_charge <= 100000000)
    );

-- Manager Documents originally migrated from supplier quotes retain a unique
-- legacy quote link and identical line numbers. Bind that trusted historical
-- relationship once so future retries use exact identities instead of names.
update public.supplier_quotes quote
set source_document_id = document.id,
    source_vendor_name = coalesce(
      quote.source_vendor_name,
      nullif(trim(document.party_name), ''),
      quote.supplier_name
    ),
    source_delivery_charge = coalesce(
      quote.source_delivery_charge,
      document.delivery_charge,
      quote.delivery_charge
    )
from public.manager_documents document
where document.legacy_supplier_quote_id = quote.id
  and quote.source_document_id is null;

create unique index if not exists supplier_quotes_source_document_uidx
  on public.supplier_quotes (source_document_id)
  where source_document_id is not null;

alter table public.supplier_quote_items
  add column if not exists source_document_item_id uuid
    references public.manager_document_items(id) on delete restrict;

update public.supplier_quote_items quote_item
set source_document_item_id = document_item.id
from public.manager_documents document
join public.manager_document_items document_item
  on document_item.document_id = document.id
where document.legacy_supplier_quote_id = quote_item.quote_id
  and document_item.line_number = quote_item.line_number
  and quote_item.source_document_item_id is null;

create unique index if not exists supplier_quote_items_source_document_item_uidx
  on public.supplier_quote_items (source_document_item_id)
  where source_document_item_id is not null;

-- Link a comparison column to the exact supplier quote that produced it. The
-- snapshots remain available even if the source quote is later archived or
-- removed, so vendor, contact, and quote-level delivery evidence do not drift
-- with the mutable Supplier Directory.
alter table public.quote_comparison_bids
  add column if not exists source_supplier_quote_id uuid
    references public.supplier_quotes(id) on delete restrict,
  add column if not exists source_vendor_name text,
  add column if not exists source_contact_name text,
  add column if not exists source_delivery_charge numeric(14, 2);

alter table public.quote_comparison_bids
  drop constraint if exists quote_comparison_bids_source_vendor_name_check,
  add constraint quote_comparison_bids_source_vendor_name_check
    check (source_vendor_name is null or char_length(trim(source_vendor_name)) between 1 and 200),
  drop constraint if exists quote_comparison_bids_source_contact_name_check,
  add constraint quote_comparison_bids_source_contact_name_check
    check (source_contact_name is null or char_length(trim(source_contact_name)) between 1 and 200),
  drop constraint if exists quote_comparison_bids_source_delivery_charge_check,
  add constraint quote_comparison_bids_source_delivery_charge_check
    check (
      source_delivery_charge is null
      or (source_delivery_charge >= 0 and source_delivery_charge <= 100000000)
    );

-- Older comparison columns used a deterministic supplier key. Backfill only
-- when the bid and quote identify one another unambiguously; ambiguous manual
-- columns remain nullable for manager review rather than being guessed.
with bid_quote_candidates as (
  select
    bid.id as bid_id,
    quote.id as quote_id,
    quote.supplier_name,
    quote.source_vendor_name,
    quote.source_contact_name,
    quote.delivery_charge,
    quote.source_delivery_charge,
    count(*) over (partition by bid.id) as bid_match_count,
    count(*) over (partition by quote.id) as quote_match_count
  from public.quote_comparison_bids bid
  join public.quote_comparisons comparison
    on comparison.id = bid.comparison_id
  join public.supplier_quotes quote
    on quote.comparison_id = comparison.id
   and quote.supplier_id is not null
   and bid.supplier_id = case
     when comparison.request_id is not null
       then left(quote.supplier_id || ':' || quote.id::text, 160)
     else quote.supplier_id
   end
  where bid.source_supplier_quote_id is null
)
update public.quote_comparison_bids bid
set source_supplier_quote_id = candidate.quote_id,
    source_vendor_name = coalesce(
      candidate.source_vendor_name,
      candidate.supplier_name
    ),
    source_contact_name = candidate.source_contact_name,
    source_delivery_charge = coalesce(
      candidate.source_delivery_charge,
      candidate.delivery_charge
    )
from bid_quote_candidates candidate
where bid.id = candidate.bid_id
  and candidate.bid_match_count = 1
  and candidate.quote_match_count = 1;

create unique index if not exists quote_comparison_bids_source_quote_uidx
  on public.quote_comparison_bids (comparison_id, source_supplier_quote_id)
  where source_supplier_quote_id is not null;

-- Catalog prices keep the exact document line plus immutable source snapshots.
-- A current supplier price may legitimately be replaced by a newer quote, so
-- the archive trigger below copies every prior snapshot into price history.
alter table public.material_catalog_supplier_prices
  add column if not exists source_document_item_id uuid
    references public.manager_document_items(id) on delete restrict,
  add column if not exists source_vendor_name text,
  add column if not exists source_contact_name text,
  add column if not exists source_delivery_charge numeric(14, 2);

alter table public.material_catalog_supplier_prices
  drop constraint if exists material_catalog_prices_source_vendor_name_check,
  add constraint material_catalog_prices_source_vendor_name_check
    check (source_vendor_name is null or char_length(trim(source_vendor_name)) between 1 and 200),
  drop constraint if exists material_catalog_prices_source_contact_name_check,
  add constraint material_catalog_prices_source_contact_name_check
    check (source_contact_name is null or char_length(trim(source_contact_name)) between 1 and 200),
  drop constraint if exists material_catalog_prices_source_delivery_charge_check,
  add constraint material_catalog_prices_source_delivery_charge_check
    check (
      source_delivery_charge is null
      or (source_delivery_charge >= 0 and source_delivery_charge <= 100000000)
    );

create unique index if not exists material_catalog_prices_source_document_item_idx
  on public.material_catalog_supplier_prices (source_document_item_id)
  where source_document_item_id is not null;

alter table public.material_catalog_price_history
  add column if not exists source_document_item_id uuid,
  add column if not exists source_vendor_name text,
  add column if not exists source_contact_name text,
  add column if not exists source_delivery_charge numeric(14, 2);

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
    old.notes, old.source_document_id, old.source_document_item_id,
    old.source_file_name, old.source_quote_number, old.source_document_date,
    old.source_quantity, old.source_unit, old.source_line_total,
    old.source_page, old.source_text, old.source_vendor_name,
    old.source_contact_name, old.source_delivery_charge
  ) is not distinct from row(
    new.supplier_sku, new.product_url, new.unit_price, new.delivery_price,
    new.minimum_order, new.comparison_price, new.availability, new.price_type,
    new.verification_status, new.retail_store_id, new.retail_store_name,
    new.retail_zip_code, new.price_observed_at, new.verified_at, new.expires_at,
    new.notes, new.source_document_id, new.source_document_item_id,
    new.source_file_name, new.source_quote_number, new.source_document_date,
    new.source_quantity, new.source_unit, new.source_line_total,
    new.source_page, new.source_text, new.source_vendor_name,
    new.source_contact_name, new.source_delivery_charge
  ) then
    return new;
  end if;

  insert into public.material_catalog_price_history (
    item_id, supplier_id, supplier_name_snapshot, supplier_sku, product_url,
    unit_price, delivery_price, minimum_order, comparison_price, availability,
    price_type, verification_status, retail_store_id, retail_store_name,
    retail_zip_code, price_observed_at, verified_at, expires_at, notes,
    source_document_id, source_document_item_id, source_file_name,
    source_quote_number, source_document_date, source_quantity, source_unit,
    source_line_total, source_page, source_text, source_vendor_name,
    source_contact_name, source_delivery_charge, changed_by, change_type
  ) values (
    old.item_id, old.supplier_id, old.supplier_name_snapshot, old.supplier_sku,
    old.product_url, old.unit_price, old.delivery_price, old.minimum_order,
    old.comparison_price, old.availability, old.price_type,
    old.verification_status, old.retail_store_id, old.retail_store_name,
    old.retail_zip_code, old.price_observed_at, old.verified_at, old.expires_at,
    old.notes, old.source_document_id, old.source_document_item_id,
    old.source_file_name, old.source_quote_number, old.source_document_date,
    old.source_quantity, old.source_unit, old.source_line_total,
    old.source_page, old.source_text, old.source_vendor_name,
    old.source_contact_name, old.source_delivery_charge, old.updated_by,
    case when tg_op = 'DELETE' then 'deleted' else 'updated' end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.archive_material_catalog_price() from public;

-- Source snapshots may be populated once for a legacy row, but cannot later be
-- cleared or rewritten. Catalog price rows are intentionally excluded: a newer
-- observation replaces the current row and the archive trigger above freezes
-- the prior observation in the read-only history table.
create or replace function private.protect_supplier_quote_source_provenance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.source_document_id is not null
     and row(
       new.source_document_id,
       new.source_vendor_name,
       new.source_contact_name,
       new.source_delivery_charge
     ) is distinct from row(
       old.source_document_id,
       old.source_vendor_name,
       old.source_contact_name,
       old.source_delivery_charge
     ) then
    raise exception 'supplier_quote_source_provenance_is_immutable';
  end if;
  return new;
end;
$$;

create or replace function private.protect_supplier_quote_item_source()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.source_document_item_id is not null
     and new.source_document_item_id is distinct from old.source_document_item_id then
    raise exception 'supplier_quote_item_source_is_immutable';
  end if;
  return new;
end;
$$;

create or replace function private.protect_quote_comparison_bid_source()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.source_supplier_quote_id is not null
     and row(
       new.source_supplier_quote_id,
       new.source_vendor_name,
       new.source_contact_name,
       new.source_delivery_charge
     ) is distinct from row(
       old.source_supplier_quote_id,
       old.source_vendor_name,
       old.source_contact_name,
       old.source_delivery_charge
     ) then
    raise exception 'quote_comparison_bid_source_provenance_is_immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_supplier_quote_source_provenance_trigger
  on public.supplier_quotes;
create trigger protect_supplier_quote_source_provenance_trigger
before update on public.supplier_quotes
for each row execute function private.protect_supplier_quote_source_provenance();

drop trigger if exists protect_supplier_quote_item_source_trigger
  on public.supplier_quote_items;
create trigger protect_supplier_quote_item_source_trigger
before update on public.supplier_quote_items
for each row execute function private.protect_supplier_quote_item_source();

drop trigger if exists protect_quote_comparison_bid_source_trigger
  on public.quote_comparison_bids;
create trigger protect_quote_comparison_bid_source_trigger
before update on public.quote_comparison_bids
for each row execute function private.protect_quote_comparison_bid_source();

revoke all on function private.protect_supplier_quote_source_provenance()
  from public;
revoke all on function private.protect_supplier_quote_item_source()
  from public;
revoke all on function private.protect_quote_comparison_bid_source()
  from public;

-- Direct import supports one or many explicitly chosen rows. It temporarily
-- selects only those rows needed by the reviewed base importer, restores every
-- original checkbox flag, and applies the single quote-level delivery choice
-- to every imported price observation in the same transaction.
create or replace function public.staff_quick_import_manager_document_item_to_catalog(
  p_document_id uuid,
  p_item_ids uuid[],
  p_catalog_department text,
  p_expected_document_updated_at timestamptz,
  p_supplier jsonb default null,
  p_create_supplier boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document public.manager_documents%rowtype;
  v_originally_selected_ids uuid[] := array[]::uuid[];
  v_requested_count integer;
  v_valid_count integer;
  v_import_updated_at timestamptz;
  v_result jsonb;
  v_delivery_mode text := coalesce(p_supplier ->> 'deliveryMode', '');
  v_delivery_amount numeric;
  v_source_vendor_name text := nullif(trim(coalesce(p_supplier ->> 'name', '')), '');
  v_source_contact_name text := nullif(trim(coalesce(p_supplier ->> 'contactName', '')), '');
  v_duplicate_catalog_item uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.';
  end if;
  if not (select private.has_staff_capability('suppliers'))
     and not (select private.is_admin()) then
    raise exception 'Supplier management permission is required.';
  end if;

  v_requested_count := cardinality(p_item_ids);
  if p_document_id is null
     or p_item_ids is null
     or v_requested_count < 1
     or v_requested_count > 200
     or v_requested_count <> (
       select count(distinct requested.requested_id)
       from unnest(p_item_ids) as requested(requested_id)
     )
     or length(trim(coalesce(p_catalog_department, ''))) not between 2 and 120
     or v_delivery_mode not in ('free', 'amount') then
    return jsonb_build_object(
      'ok', false, 'code', 'invalid_input', 'lines', '[]'::jsonb
    );
  end if;

  begin
    v_delivery_amount := (p_supplier ->> 'deliveryAmount')::numeric;
  exception when others then
    return jsonb_build_object(
      'ok', false, 'code', 'invalid_delivery', 'lines', '[]'::jsonb
    );
  end;
  if v_delivery_amount is null
     or v_delivery_amount < 0
     or v_delivery_amount > 1000000
     or (v_delivery_mode = 'free' and v_delivery_amount <> 0)
     or (v_delivery_mode = 'amount' and v_delivery_amount <= 0) then
    return jsonb_build_object(
      'ok', false, 'code', 'invalid_delivery', 'lines', '[]'::jsonb
    );
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('manager-document-catalog:' || p_document_id::text, 0)
  );
  select * into v_document
  from public.manager_documents
  where id = p_document_id
  for update;
  if not found then
    return jsonb_build_object(
      'ok', false, 'code', 'document_not_found', 'lines', '[]'::jsonb
    );
  end if;
  if v_document.status in ('archived', 'error', 'processing') then
    return jsonb_build_object(
      'ok', false, 'code', 'document_not_ready', 'lines', '[]'::jsonb
    );
  end if;
  if p_expected_document_updated_at is distinct from v_document.updated_at then
    return jsonb_build_object(
      'ok', false, 'code', 'stale_document', 'lines', '[]'::jsonb
    );
  end if;

  -- Lock all exact requested rows, record their checkbox state, and reject the
  -- whole batch before any write when even one row is absent or unreviewed.
  perform item.id
  from public.manager_document_items item
  where item.document_id = p_document_id
    and item.id = any(p_item_ids)
  order by item.id
  for update;

  select
    count(*),
    coalesce(
      array_agg(item.id order by item.id) filter (where item.selected),
      array[]::uuid[]
    )
  into v_valid_count, v_originally_selected_ids
  from public.manager_document_items item
  where item.document_id = p_document_id
    and item.id = any(p_item_ids)
    and item.validation_status = 'valid'
    and trim(item.description) <> '';

  if v_valid_count <> v_requested_count then
    return jsonb_build_object(
      'ok', false,
      'code', 'review_required',
      'lines', coalesce((
        select jsonb_agg(jsonb_build_object(
          'lineId', requested.id,
          'lineNumber', item.line_number,
          'reason', case
            when item.id is null then 'line_not_found'
            else 'invalid_line'
          end
        ) order by requested.ordinality)
        from unnest(p_item_ids) with ordinality requested(id, ordinality)
        left join public.manager_document_items item
          on item.id = requested.id
         and item.document_id = p_document_id
        where item.id is null
           or item.validation_status <> 'valid'
           or trim(item.description) = ''
      ), '[]'::jsonb)
    );
  end if;

  update public.manager_document_items
  set selected = true
  where document_id = p_document_id
    and id = any(p_item_ids)
    and selected = false;

  update public.manager_documents
  set status = 'ready'
  where id = p_document_id
    and status <> 'ready';
  select updated_at into v_import_updated_at
  from public.manager_documents
  where id = p_document_id;

  v_result := public.staff_import_manager_document_items_to_catalog(
    p_document_id,
    p_item_ids,
    p_catalog_department,
    v_import_updated_at,
    p_supplier,
    p_create_supplier
  );

  if coalesce((v_result ->> 'ok')::boolean, false) then
    -- One source line must never resolve to multiple current catalog prices,
    -- and one current price cannot truthfully claim multiple source lines.
    select (entry ->> 'catalogItemId')::uuid
    into v_duplicate_catalog_item
    from jsonb_array_elements(coalesce(v_result -> 'lines', '[]'::jsonb)) entry
    where nullif(entry ->> 'catalogItemId', '') is not null
    group by (entry ->> 'catalogItemId')::uuid
    having count(distinct (entry ->> 'lineId')::uuid) > 1
    limit 1;
    if v_duplicate_catalog_item is not null then
      raise exception 'multiple_document_lines_resolved_to_one_catalog_price';
    end if;

    update public.material_catalog_supplier_prices price
    set delivery_price = v_delivery_amount,
        source_document_item_id = (entry.value ->> 'lineId')::uuid,
        source_vendor_name = coalesce(v_source_vendor_name, v_document.party_name),
        source_contact_name = v_source_contact_name,
        source_delivery_charge = v_delivery_amount,
        notes = case v_delivery_mode
          when 'free' then
            'Imported supplier document price; availability not verified. Free delivery.'
          else
            'Imported supplier document price; availability not verified. Delivery fee: $'
            || to_char(v_delivery_amount, 'FM999999990.00') || '.'
        end
    from jsonb_array_elements(coalesce(v_result -> 'lines', '[]'::jsonb)) entry(value)
    where price.source_document_id = p_document_id
      and price.item_id = (entry.value ->> 'catalogItemId')::uuid
      and (entry.value ->> 'priceStatus') in ('saved', 'already_saved');
  end if;

  update public.manager_document_items item
  set selected = item.id = any(v_originally_selected_ids)
  where item.document_id = p_document_id
    and item.id = any(p_item_ids)
    and item.selected is distinct from (item.id = any(v_originally_selected_ids));

  if v_document.status not in ('ready', 'routed') then
    update public.manager_documents
    set status = v_document.status,
        supplier_id = v_document.supplier_id
    where id = p_document_id;
  end if;
  return v_result;
end;
$$;

revoke all on function public.staff_quick_import_manager_document_item_to_catalog(
  uuid, uuid[], text, timestamptz, jsonb, boolean
) from public, anon;
grant execute on function public.staff_quick_import_manager_document_item_to_catalog(
  uuid, uuid[], text, timestamptz, jsonb, boolean
) to authenticated;

-- Atomically connect a reviewed document, its durable supplier quote, and an
-- optional request comparison. This is the sole relink boundary: it refuses to
-- overwrite an established relationship or attach a comparison belonging to a
-- different material request.
create or replace function public.staff_link_manager_document_supplier_quote(
  p_document_id uuid,
  p_quote_id uuid,
  p_request_id uuid,
  p_comparison_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document public.manager_documents%rowtype;
  v_quote public.supplier_quotes%rowtype;
  v_comparison public.quote_comparisons%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.';
  end if;
  if not (select private.has_staff_capability('suppliers'))
     and not (select private.is_admin()) then
    raise exception 'Supplier management permission is required.';
  end if;
  if p_document_id is null or p_quote_id is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('manager-document-routing:' || p_document_id::text, 0)
  );

  select * into v_document
  from public.manager_documents
  where id = p_document_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'document_not_found');
  end if;
  if v_document.status not in ('ready', 'routed') then
    return jsonb_build_object('ok', false, 'code', 'document_not_approved');
  end if;

  select * into v_quote
  from public.supplier_quotes
  where id = p_quote_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'supplier_quote_not_found');
  end if;
  if not exists (
    select 1
    from public.supplier_quote_items quote_item
    join public.manager_document_items document_item
      on document_item.id = quote_item.source_document_item_id
    where quote_item.quote_id = p_quote_id
      and document_item.document_id = p_document_id
  ) then
    return jsonb_build_object('ok', false, 'code', 'exact_source_items_required');
  end if;
  if exists (
    select 1
    from public.supplier_quote_items quote_item
    left join public.manager_document_items document_item
      on document_item.id = quote_item.source_document_item_id
    where quote_item.quote_id = p_quote_id
      and (
        quote_item.source_document_item_id is null
        or document_item.id is null
        or document_item.document_id <> p_document_id
      )
  ) then
    return jsonb_build_object(
      'ok', false,
      'code', 'mixed_or_missing_source_items'
    );
  end if;

  if v_document.legacy_supplier_quote_id is not null
     and v_document.legacy_supplier_quote_id <> p_quote_id then
    return jsonb_build_object('ok', false, 'code', 'document_quote_mismatch');
  end if;
  if v_quote.source_document_id is not null
     and v_quote.source_document_id <> p_document_id then
    return jsonb_build_object('ok', false, 'code', 'quote_document_mismatch');
  end if;
  if exists (
    select 1
    from public.supplier_quotes existing_quote
    where existing_quote.source_document_id = p_document_id
      and existing_quote.id <> p_quote_id
  ) then
    return jsonb_build_object(
      'ok', false,
      'code', 'document_already_routed_to_another_quote'
    );
  end if;
  if v_document.request_id is not null
     and v_document.request_id is distinct from p_request_id then
    return jsonb_build_object('ok', false, 'code', 'document_request_mismatch');
  end if;
  if v_quote.comparison_id is not null
     and v_quote.comparison_id is distinct from p_comparison_id then
    return jsonb_build_object('ok', false, 'code', 'quote_comparison_mismatch');
  end if;

  if p_comparison_id is not null then
    select * into v_comparison
    from public.quote_comparisons
    where id = p_comparison_id
    for update;
    if not found then
      return jsonb_build_object('ok', false, 'code', 'comparison_not_found');
    end if;
    if v_comparison.status not in ('draft', 'review') then
      return jsonb_build_object('ok', false, 'code', 'comparison_closed');
    end if;
    if v_comparison.request_id is distinct from p_request_id then
      return jsonb_build_object('ok', false, 'code', 'comparison_request_mismatch');
    end if;
  elsif p_request_id is not null then
    return jsonb_build_object(
      'ok', false,
      'code', 'comparison_required_for_request'
    );
  end if;

  update public.manager_documents
  set request_id = p_request_id,
      legacy_supplier_quote_id = p_quote_id,
      status = 'routed',
      updated_by = auth.uid()
  where id = p_document_id;

  insert into public.manager_document_events (
    document_id,
    event_type,
    summary,
    details,
    created_by
  )
  select
    p_document_id,
    'routed',
    'Approved rows sent to supplier pricing.',
    jsonb_build_object('supplier_quote_id', p_quote_id),
    auth.uid()
  where not exists (
    select 1
    from public.manager_document_events existing_event
    where existing_event.document_id = p_document_id
      and existing_event.event_type = 'routed'
      and existing_event.details ->> 'supplier_quote_id' = p_quote_id::text
  );

  update public.supplier_quotes
  set source_document_id = p_document_id,
      comparison_id = p_comparison_id,
      source_vendor_name = coalesce(
        source_vendor_name,
        nullif(trim(v_document.party_name), ''),
        supplier_name
      ),
      source_delivery_charge = coalesce(
        source_delivery_charge,
        v_document.delivery_charge,
        delivery_charge
      ),
      updated_by = auth.uid()
  where id = p_quote_id;

  return jsonb_build_object(
    'ok', true,
    'documentId', p_document_id,
    'quoteId', p_quote_id,
    'requestId', p_request_id,
    'comparisonId', p_comparison_id
  );
end;
$$;

revoke all on function public.staff_link_manager_document_supplier_quote(
  uuid, uuid, uuid, uuid
) from public, anon;
grant execute on function public.staff_link_manager_document_supplier_quote(
  uuid, uuid, uuid, uuid
) to authenticated;

comment on column public.supplier_quotes.source_document_id is
  'Exact reviewed manager document used to create this supplier quote.';
comment on column public.supplier_quote_items.source_document_item_id is
  'Exact reviewed manager document line used to create this quote line.';
comment on column public.quote_comparison_bids.source_supplier_quote_id is
  'Exact supplier quote that produced this immutable comparison column provenance.';
comment on column public.material_catalog_supplier_prices.source_document_item_id is
  'Exact reviewed manager document line supporting the current supplier price observation.';
