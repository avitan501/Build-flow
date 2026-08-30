-- Import reviewed document lines into the lazy catalog as one transaction.
-- Product identity may be saved without a supplier price. Name-only matches
-- are never trusted because equal wording can hide a different size/model.
create or replace function public.staff_import_manager_document_items_to_catalog(
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
  v_line public.manager_document_items%rowtype;
  v_line_count integer := 0;
  v_sku_matches integer;
  v_catalog_item_id uuid;
  v_supplier jsonb;
  v_match_supplier_id text := nullif(trim(coalesce(p_supplier ->> 'id', '')), '');
  v_match_supplier_name text := nullif(trim(coalesce(p_supplier ->> 'name', '')), '');
  v_price_supplier_id text;
  v_price_supplier_name text;
  v_has_prices boolean := false;
  v_supplier_source boolean := false;
  v_item_count integer := 0;
  v_price_count integer := 0;
  v_line_changed integer := 0;
  v_price_changed integer := 0;
  v_any_change boolean := false;
  v_candidate_observed_at timestamptz;
  v_candidate_expires_at timestamptz;
  v_current_observed_at timestamptz;
  v_results jsonb := '[]'::jsonb;
  v_blockers jsonb := '[]'::jsonb;
  v_identity_status text;
  v_price_status text;
  v_code text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.';
  end if;
  if not (select private.has_staff_capability('suppliers'))
     and not (select private.is_admin()) then
    raise exception 'Supplier management permission is required.';
  end if;
  if p_document_id is null
     or p_item_ids is null
     or cardinality(p_item_ids) < 1
     or cardinality(p_item_ids) > 200
     or length(trim(coalesce(p_catalog_department, ''))) not between 2 and 120 then
    return jsonb_build_object('ok', false, 'code', 'invalid_input', 'lines', '[]'::jsonb);
  end if;
  if cardinality(p_item_ids) <> (select count(distinct item_id) from unnest(p_item_ids) item_id) then
    return jsonb_build_object('ok', false, 'code', 'duplicate_selection', 'lines', '[]'::jsonb);
  end if;

  perform pg_advisory_xact_lock(hashtextextended('manager-document-catalog:' || p_document_id::text, 0));
  select * into v_document
  from public.manager_documents
  where id = p_document_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'document_not_found', 'lines', '[]'::jsonb);
  end if;
  if v_document.status not in ('ready', 'routed') then
    return jsonb_build_object('ok', false, 'code', 'document_not_ready', 'lines', '[]'::jsonb);
  end if;
  if p_expected_document_updated_at is distinct from v_document.updated_at
     and exists (
       select 1 from public.manager_document_items item
       where item.document_id = p_document_id and item.id = any(p_item_ids)
         and (item.catalog_import_status <> 'imported'
           or item.matched_catalog_item_id is null
           or not exists (select 1 from public.material_catalog_items catalog where catalog.id = item.matched_catalog_item_id))
     ) then
    return jsonb_build_object('ok', false, 'code', 'stale_document', 'lines', '[]'::jsonb);
  end if;
  v_supplier_source := v_document.document_type in ('supplier_quote', 'supplier_invoice', 'receipt', 'catalog_price_list');
  v_candidate_observed_at := coalesce(v_document.document_date::timestamp at time zone 'UTC', now());
  v_candidate_expires_at := case when v_document.expires_on is null then null else
    (v_document.expires_on::timestamp + interval '1 day' - interval '1 millisecond') at time zone 'UTC' end;

  -- Lock and validate the exact checkbox selection before any catalog write.
  for v_line in
    select * from public.manager_document_items
    where document_id = p_document_id and id = any(p_item_ids) and selected = true
    order by id
    for update
  loop
    v_line_count := v_line_count + 1;
    v_has_prices := v_has_prices or v_line.unit_price is not null;
    if v_line.validation_status <> 'valid' or trim(v_line.description) = '' then
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
        'lineId', v_line.id, 'lineNumber', v_line.line_number,
        'status', 'pending_review', 'reason', 'invalid_line'
      ));
      continue;
    end if;
    if v_line.matched_catalog_item_id is not null
       and exists (select 1 from public.material_catalog_items where id = v_line.matched_catalog_item_id) then
      continue;
    end if;
    if v_supplier_source and trim(v_line.item_code) <> '' and (
      select count(*) from public.manager_document_items other
      where other.document_id = p_document_id and other.id = any(p_item_ids)
        and other.selected = true and lower(trim(other.item_code)) = lower(trim(v_line.item_code))
    ) > 1 then
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
        'lineId', v_line.id, 'lineNumber', v_line.line_number,
        'status', 'pending_review', 'reason', 'duplicate_selected_sku'
      ));
      continue;
    end if;
    if v_supplier_source and v_match_supplier_id is not null and trim(v_line.item_code) <> '' then
      select count(distinct price.item_id), (min(price.item_id::text))::uuid
      into v_sku_matches, v_catalog_item_id
      from public.material_catalog_supplier_prices price
      where price.supplier_id = v_match_supplier_id
        and lower(trim(price.supplier_sku)) = lower(trim(v_line.item_code));
      if v_sku_matches > 1 then
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
          'lineId', v_line.id, 'lineNumber', v_line.line_number,
          'status', 'pending_review', 'reason', 'ambiguous_sku'
        ));
        continue;
      elsif v_sku_matches = 1 then
        if exists (
          select 1 from public.material_catalog_items item
          where item.id = v_catalog_item_id and item.category <> trim(p_catalog_department)
        ) then
          v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
            'lineId', v_line.id, 'lineNumber', v_line.line_number,
            'status', 'pending_review', 'reason', 'category_mismatch'
          ));
        end if;
        continue;
      end if;
    end if;
    if exists (
      select 1 from public.material_catalog_items
      where category = trim(p_catalog_department)
        and lower(trim(name)) = lower(trim(v_line.description))
    ) then
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
        'lineId', v_line.id, 'lineNumber', v_line.line_number,
        'status', 'pending_review', 'reason', 'name_conflict'
      ));
    end if;
  end loop;

  if v_line_count <> cardinality(p_item_ids) then
    return jsonb_build_object('ok', false, 'code', 'selection_changed', 'lines', '[]'::jsonb);
  end if;
  if jsonb_array_length(v_blockers) > 0 then
    update public.manager_document_items item
    set catalog_import_status = 'pending_review'
    where item.document_id = p_document_id
      and item.id in (select (entry ->> 'lineId')::uuid from jsonb_array_elements(v_blockers) entry);
    return jsonb_build_object('ok', false, 'code', 'review_required', 'lines', v_blockers);
  end if;

  if v_supplier_source and v_match_supplier_id is not null and v_match_supplier_name is not null then
    v_supplier := public.staff_upsert_supplier_directory_entry(p_supplier, p_create_supplier);
    v_match_supplier_id := v_supplier ->> 'id';
    v_match_supplier_name := v_supplier ->> 'name';
  end if;
  if v_supplier_source and v_has_prices and v_document.currency = 'USD' then
    v_price_supplier_id := v_match_supplier_id;
    v_price_supplier_name := v_match_supplier_name;
  end if;

  for v_line in
    select * from public.manager_document_items
    where document_id = p_document_id and id = any(p_item_ids) and selected = true
    order by line_number, id
  loop
    v_catalog_item_id := null;
    v_identity_status := 'created';
    if v_line.matched_catalog_item_id is not null
       and exists (select 1 from public.material_catalog_items where id = v_line.matched_catalog_item_id) then
      v_catalog_item_id := v_line.matched_catalog_item_id;
      v_identity_status := 'already_imported';
    elsif v_supplier_source and v_match_supplier_id is not null and trim(v_line.item_code) <> '' then
      select (min(price.item_id::text))::uuid into v_catalog_item_id
      from public.material_catalog_supplier_prices price
      where price.supplier_id = v_match_supplier_id
        and lower(trim(price.supplier_sku)) = lower(trim(v_line.item_code));
      if v_catalog_item_id is not null then v_identity_status := 'exact_supplier_sku'; end if;
    end if;

    if v_catalog_item_id is null then
      v_code := 'DOC-' || upper(substr(replace(p_document_id::text, '-', ''), 1, 12)) || '-' || v_line.line_number::text;
      insert into public.material_catalog_items (
        category, item_code, name, description, default_quantity, unit,
        package_quantity, package_unit, comparison_quantity, comparison_unit,
        review_status, quality_notes, status, source, created_by, updated_by
      ) values (
        trim(p_catalog_department), v_code, left(trim(v_line.description), 240), left(trim(v_line.specification), 1000),
        1, coalesce(nullif(trim(v_line.unit), ''), 'each'),
        1, coalesce(nullif(trim(v_line.unit), ''), 'each'), 1, coalesce(nullif(trim(v_line.unit), ''), 'each'),
        'needs_review', 'Imported from reviewed source ' || left(v_document.file_name, 180),
        'active', 'Manager document: ' || left(v_document.file_name, 180), auth.uid(), auth.uid()
      ) returning id into v_catalog_item_id;
      v_any_change := true;
    end if;

    v_price_status := case
      when v_line.unit_price is null then 'not_provided'
      when v_document.currency <> 'USD' then 'unsupported_currency'
      when not v_supplier_source then 'unsupported_source'
      when v_price_supplier_id is null then 'no_supplier'
      else 'saved'
    end;
    if v_price_status = 'saved' then
      insert into public.material_catalog_supplier_prices as current_price (
        item_id, supplier_id, supplier_name_snapshot, supplier_sku, unit_price,
        availability, notes, updated_by, price_observed_at, price_type,
        verification_status, verified_at, expires_at, source_document_id,
        source_file_name, source_quote_number, source_document_date,
        source_quantity, source_unit, source_line_total, source_page, source_text
      ) values (
        v_catalog_item_id, v_price_supplier_id, v_price_supplier_name, left(trim(v_line.item_code), 120),
        v_line.unit_price, 'unknown', 'Imported supplier document price; availability not verified.', auth.uid(),
        v_candidate_observed_at, 'supplier_quote',
        'supplier_quote', now(), v_candidate_expires_at, p_document_id,
        v_document.file_name, v_document.document_number, v_document.document_date,
        v_line.quantity, v_line.unit, v_line.line_total, v_line.source_page, v_line.source_text
      ) on conflict (item_id, supplier_id) do update set
        supplier_name_snapshot = excluded.supplier_name_snapshot,
        supplier_sku = excluded.supplier_sku,
        unit_price = excluded.unit_price,
        availability = excluded.availability,
        notes = excluded.notes,
        updated_by = excluded.updated_by,
        price_observed_at = excluded.price_observed_at,
        price_type = excluded.price_type,
        verification_status = excluded.verification_status,
        verified_at = excluded.verified_at,
        expires_at = excluded.expires_at,
        source_document_id = excluded.source_document_id,
        source_file_name = excluded.source_file_name,
        source_quote_number = excluded.source_quote_number,
        source_document_date = excluded.source_document_date,
        source_quantity = excluded.source_quantity,
        source_unit = excluded.source_unit,
        source_line_total = excluded.source_line_total,
        source_page = excluded.source_page,
        source_text = excluded.source_text
      where
        (current_price.price_observed_at is null or excluded.price_observed_at >= current_price.price_observed_at)
        and row(
          current_price.supplier_sku, current_price.unit_price, current_price.price_observed_at,
          current_price.expires_at, current_price.source_document_id, current_price.source_document_date,
          current_price.source_quantity, current_price.source_unit, current_price.source_line_total,
          current_price.source_page, current_price.source_text
        ) is distinct from row(
          excluded.supplier_sku, excluded.unit_price, excluded.price_observed_at,
          excluded.expires_at, excluded.source_document_id, excluded.source_document_date,
          excluded.source_quantity, excluded.source_unit, excluded.source_line_total,
          excluded.source_page, excluded.source_text
        );
      get diagnostics v_price_changed = row_count;
      if v_price_changed = 1 then
        v_price_count := v_price_count + 1;
        v_any_change := true;
      else
        select price_observed_at into v_current_observed_at
        from public.material_catalog_supplier_prices
        where item_id = v_catalog_item_id and supplier_id = v_price_supplier_id;
        v_price_status := case
          when v_current_observed_at > v_candidate_observed_at then 'older_observation_kept'
          else 'already_saved'
        end;
      end if;
    end if;

    update public.manager_document_items set
      matched_catalog_item_id = v_catalog_item_id,
      match_method = case v_identity_status when 'exact_supplier_sku' then 'exact_supplier_sku' when 'already_imported' then 'already_imported' else 'created_from_document' end,
      match_confidence = case when v_identity_status = 'exact_supplier_sku' then 1 else null end,
      catalog_import_status = 'imported'
    where id = v_line.id and document_id = p_document_id
      and row(
        matched_catalog_item_id, match_method, match_confidence, catalog_import_status
      ) is distinct from row(
        v_catalog_item_id,
        case v_identity_status when 'exact_supplier_sku' then 'exact_supplier_sku' when 'already_imported' then 'already_imported' else 'created_from_document' end,
        case when v_identity_status = 'exact_supplier_sku' then 1::numeric else null::numeric end,
        'imported'
      );
    get diagnostics v_line_changed = row_count;
    if v_line_changed = 1 then v_any_change := true; end if;
    v_item_count := v_item_count + 1;
    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'lineId', v_line.id, 'lineNumber', v_line.line_number,
      'catalogItemId', v_catalog_item_id, 'identityStatus', v_identity_status,
      'priceStatus', v_price_status,
      'matchMethod', case v_identity_status when 'exact_supplier_sku' then 'exact_supplier_sku' when 'already_imported' then 'already_imported' else 'created_from_document' end,
      'confidence', case when v_identity_status = 'exact_supplier_sku' then 1 else null end
    ));
  end loop;

  if v_any_change then
    update public.manager_documents set
      status = 'routed', supplier_id = coalesce(v_match_supplier_id, supplier_id), updated_by = auth.uid()
    where id = p_document_id;
    insert into public.manager_document_events (document_id, event_type, summary, details, created_by)
    values (
      p_document_id, 'routed',
      v_item_count || ' reviewed product' || case when v_item_count = 1 then '' else 's' end || ' imported to catalog.',
      jsonb_build_object('destination', 'catalog', 'item_count', v_item_count, 'price_count', v_price_count, 'supplier_id', v_price_supplier_id, 'lines', v_results),
      auth.uid()
    );
  end if;
  return jsonb_build_object(
    'ok', true, 'documentId', p_document_id, 'itemCount', v_item_count,
    'priceCount', v_price_count, 'supplierId', v_price_supplier_id,
    'supplierName', v_price_supplier_name, 'lines', v_results
  );
end;
$$;

revoke all on function public.staff_import_manager_document_items_to_catalog(uuid, uuid[], text, timestamptz, jsonb, boolean) from public, anon;
grant execute on function public.staff_import_manager_document_items_to_catalog(uuid, uuid[], text, timestamptz, jsonb, boolean) to authenticated;
