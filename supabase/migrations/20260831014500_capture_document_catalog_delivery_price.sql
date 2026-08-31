-- Preserve the delivery choice made at the moment a reviewed quote line is
-- added to the lazy catalog. A zero value is explicitly free delivery; a
-- positive value is the quote's delivery fee.
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
  v_item public.manager_document_items%rowtype;
  v_import_updated_at timestamptz;
  v_result jsonb;
  v_delivery_mode text := coalesce(p_supplier ->> 'deliveryMode', '');
  v_delivery_amount numeric;
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
     or cardinality(p_item_ids) <> 1
     or length(trim(coalesce(p_catalog_department, ''))) not between 2 and 120
     or v_delivery_mode not in ('free', 'amount') then
    return jsonb_build_object('ok', false, 'code', 'invalid_input', 'lines', '[]'::jsonb);
  end if;

  begin
    v_delivery_amount := (p_supplier ->> 'deliveryAmount')::numeric;
  exception when others then
    return jsonb_build_object('ok', false, 'code', 'invalid_delivery', 'lines', '[]'::jsonb);
  end;
  if v_delivery_amount < 0
     or v_delivery_amount > 1000000
     or (v_delivery_mode = 'free' and v_delivery_amount <> 0)
     or (v_delivery_mode = 'amount' and v_delivery_amount <= 0) then
    return jsonb_build_object('ok', false, 'code', 'invalid_delivery', 'lines', '[]'::jsonb);
  end if;

  perform pg_advisory_xact_lock(hashtextextended('manager-document-catalog:' || p_document_id::text, 0));
  select * into v_document
  from public.manager_documents
  where id = p_document_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'document_not_found', 'lines', '[]'::jsonb);
  end if;
  if v_document.status in ('archived', 'error', 'processing') then
    return jsonb_build_object('ok', false, 'code', 'document_not_ready', 'lines', '[]'::jsonb);
  end if;
  if p_expected_document_updated_at is distinct from v_document.updated_at then
    return jsonb_build_object('ok', false, 'code', 'stale_document', 'lines', '[]'::jsonb);
  end if;

  select * into v_item
  from public.manager_document_items
  where document_id = p_document_id and id = p_item_ids[1]
  for update;
  if not found or trim(v_item.description) = '' then
    return jsonb_build_object('ok', false, 'code', 'review_required', 'lines', '[]'::jsonb);
  end if;
  if v_item.validation_status <> 'valid' then
    return jsonb_build_object(
      'ok', false,
      'code', 'review_required',
      'lines', jsonb_build_array(jsonb_build_object(
        'lineId', v_item.id,
        'lineNumber', v_item.line_number,
        'reason', 'invalid_line'
      ))
    );
  end if;

  update public.manager_document_items
  set selected = true
  where id = v_item.id and document_id = p_document_id;
  update public.manager_documents
  set status = 'ready'
  where id = p_document_id;
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
    update public.material_catalog_supplier_prices price
    set delivery_price = v_delivery_amount,
        notes = case v_delivery_mode
          when 'free' then 'Imported supplier document price; availability not verified. Free delivery.'
          else 'Imported supplier document price; availability not verified. Delivery fee: $' || to_char(v_delivery_amount, 'FM999999990.00') || '.'
        end
    where price.source_document_id = p_document_id
      and price.item_id = (
        select item.matched_catalog_item_id
        from public.manager_document_items item
        where item.id = v_item.id and item.document_id = p_document_id
      );
  end if;

  update public.manager_document_items
  set selected = v_item.selected
  where id = v_item.id and document_id = p_document_id;
  if v_document.status not in ('ready', 'routed') then
    update public.manager_documents
    set status = v_document.status,
        supplier_id = v_document.supplier_id
    where id = p_document_id;
  end if;
  return v_result;
end;
$$;

revoke all on function public.staff_quick_import_manager_document_item_to_catalog(uuid, uuid[], text, timestamptz, jsonb, boolean) from public, anon;
grant execute on function public.staff_quick_import_manager_document_item_to_catalog(uuid, uuid[], text, timestamptz, jsonb, boolean) to authenticated;
