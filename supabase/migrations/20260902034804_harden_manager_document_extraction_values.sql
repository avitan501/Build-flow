create or replace function public.staff_apply_manager_document_extraction(
  p_document_id uuid,
  p_lease_token uuid,
  p_document jsonb,
  p_items jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_document public.manager_documents%rowtype;
  v_item_count integer;
  v_existing_count integer;
  v_incoming_count integer;
  v_document_date date;
  v_due_date date;
  v_expires_on date;
  v_raw_value text;
begin
  if not (private.is_admin() or private.has_staff_capability('suppliers')) then
    raise exception 'Approved manager access is required';
  end if;
  if jsonb_typeof(coalesce(p_document, '{}'::jsonb)) <> 'object' then
    raise exception 'Document metadata must be an object';
  end if;
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then
    raise exception 'Document items must be an array';
  end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) > 500 then
    raise exception 'Document extraction is limited to 500 lines';
  end if;

  select * into v_document
  from public.manager_documents
  where id = p_document_id
  for update;
  if not found then raise exception 'Document not found'; end if;
  if v_document.status <> 'processing'
     or v_document.extraction_lease_token is distinct from p_lease_token
     or v_document.updated_by is distinct from auth.uid() then
    raise exception 'Document extraction lease is no longer active';
  end if;

  -- AI dates are untrusted strings. A bad calendar date becomes unknown rather
  -- than aborting the atomic save and stranding a successfully uploaded file.
  begin
    v_raw_value := nullif(p_document->>'document_date', '');
    v_document_date := case when v_raw_value is null then null else v_raw_value::date end;
  exception when others then v_document_date := null;
  end;
  begin
    v_raw_value := nullif(p_document->>'due_date', '');
    v_due_date := case when v_raw_value is null then null else v_raw_value::date end;
  exception when others then v_due_date := null;
  end;
  begin
    v_raw_value := nullif(p_document->>'expires_on', '');
    v_expires_on := case when v_raw_value is null then null else v_raw_value::date end;
  exception when others then v_expires_on := null;
  end;

  select count(*) into v_existing_count
  from public.manager_document_items where document_id = p_document_id;
  select count(*) into v_incoming_count
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as entry(value)
  where jsonb_typeof(entry.value) = 'object'
    and nullif(trim(entry.value->>'description'), '') is not null;
  if v_existing_count > 0 and v_incoming_count = 0 then
    raise exception 'An empty extraction cannot replace existing document lines';
  end if;

  delete from public.manager_document_items where document_id = p_document_id;
  insert into public.manager_document_items (
    document_id, line_number, item_code, description, specification, quantity,
    unit, unit_price, line_total, source_page, source_text, confidence,
    validation_status, selected
  )
  select
    p_document_id,
    entry.ordinality::integer,
    left(coalesce(entry.value->>'item_code', ''), 120),
    left(trim(entry.value->>'description'), 500),
    left(coalesce(entry.value->>'specification', ''), 1000),
    case
      when coalesce(entry.value->>'quantity', '') ~ '^[0-9]+([.][0-9]+)?$'
       and (entry.value->>'quantity')::numeric > 0
       and (entry.value->>'quantity')::numeric <= 100000000
      then round((entry.value->>'quantity')::numeric, 3)
      else null
    end,
    left(coalesce(entry.value->>'unit', ''), 40),
    case
      when coalesce(entry.value->>'unit_price', '') ~ '^[0-9]+([.][0-9]+)?$'
       and (entry.value->>'unit_price')::numeric <= 100000000
      then round((entry.value->>'unit_price')::numeric, 4)
      else null
    end,
    case
      when coalesce(entry.value->>'line_total', '') ~ '^[0-9]+([.][0-9]+)?$'
       and (entry.value->>'line_total')::numeric <= 100000000
      then round((entry.value->>'line_total')::numeric, 2)
      else null
    end,
    case
      when coalesce(entry.value->>'source_page', '') ~ '^[0-9]+$'
       and (entry.value->>'source_page')::numeric between 1 and 2147483647
      then (entry.value->>'source_page')::integer
      else null
    end,
    left(coalesce(entry.value->>'source_text', ''), 1000),
    case
      when coalesce(entry.value->>'confidence', '') ~ '^[0-9]+([.][0-9]+)?$'
      then least(1, greatest(0, (entry.value->>'confidence')::numeric))
      else 0
    end,
    case
      when entry.value->>'validation_status' in ('valid', 'needs_review', 'mismatch')
      then entry.value->>'validation_status'
      else 'needs_review'
    end,
    true
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as entry(value, ordinality)
  where jsonb_typeof(entry.value) = 'object'
    and nullif(trim(entry.value->>'description'), '') is not null;
  get diagnostics v_item_count = row_count;

  update public.manager_documents set
    document_type = case
      when p_document->>'document_type' in ('supplier_quote', 'supplier_invoice', 'receipt', 'catalog_price_list', 'client_estimate', 'material_list', 'purchase_order', 'project_document', 'unknown')
      then p_document->>'document_type'
      else document_type
    end,
    status = 'needs_review',
    title = coalesce(nullif(left(p_document->>'title', 240), ''), title),
    party_name = left(coalesce(p_document->>'party_name', ''), 200),
    document_number = left(coalesce(p_document->>'document_number', ''), 100),
    document_date = v_document_date,
    due_date = v_due_date,
    expires_on = v_expires_on,
    suggested_department = nullif(left(p_document->>'suggested_department', 120), ''),
    currency = case
      when upper(coalesce(p_document->>'currency', '')) ~ '^[A-Z]{3,8}$'
      then upper(p_document->>'currency')
      else 'USD'
    end,
    subtotal = case
      when coalesce(p_document->>'subtotal', '') ~ '^[0-9]+([.][0-9]+)?$'
       and (p_document->>'subtotal')::numeric <= 999999999999.99
      then round((p_document->>'subtotal')::numeric, 2) else null end,
    discount = case
      when coalesce(p_document->>'discount', '') ~ '^[0-9]+([.][0-9]+)?$'
       and (p_document->>'discount')::numeric <= 999999999999.99
      then round((p_document->>'discount')::numeric, 2) else 0 end,
    delivery_charge = case
      when coalesce(p_document->>'delivery_charge', '') ~ '^[0-9]+([.][0-9]+)?$'
       and (p_document->>'delivery_charge')::numeric <= 999999999999.99
      then round((p_document->>'delivery_charge')::numeric, 2) else 0 end,
    tax_amount = case
      when coalesce(p_document->>'tax_amount', '') ~ '^[0-9]+([.][0-9]+)?$'
       and (p_document->>'tax_amount')::numeric <= 999999999999.99
      then round((p_document->>'tax_amount')::numeric, 2) else null end,
    tax_percent = case
      when coalesce(p_document->>'tax_percent', '') ~ '^[0-9]+([.][0-9]+)?$'
      then least(100, round((p_document->>'tax_percent')::numeric, 4))
      else null end,
    total = case
      when coalesce(p_document->>'total', '') ~ '^[0-9]+([.][0-9]+)?$'
       and (p_document->>'total')::numeric <= 999999999999.99
      then round((p_document->>'total')::numeric, 2) else null end,
    raw_text = coalesce(p_document->>'raw_text', raw_text),
    classification_confidence = case
      when coalesce(p_document->>'classification_confidence', '') ~ '^[0-9]+([.][0-9]+)?$'
      then least(1, greatest(0, (p_document->>'classification_confidence')::numeric))
      else 0 end,
    extraction_note = v_item_count || ' lines found on the latest AI read. Review before approval.',
    evidence = case when jsonb_typeof(p_document->'evidence') = 'array' then p_document->'evidence' else '[]'::jsonb end,
    warnings = case when jsonb_typeof(p_document->'warnings') = 'array' then p_document->'warnings' else '[]'::jsonb end,
    suggested_actions = case when jsonb_typeof(p_document->'suggested_actions') = 'array' then p_document->'suggested_actions' else '[]'::jsonb end,
    approved_by = null,
    approved_at = null,
    extraction_lease_token = null,
    updated_by = auth.uid()
  where id = p_document_id;

  insert into public.manager_document_events(document_id, event_type, summary, details, created_by)
  values (p_document_id, 'extracted', 'Document re-read with AI.', jsonb_build_object('item_count', v_item_count), auth.uid());
  return v_item_count;
end;
$$;

revoke all on function public.staff_apply_manager_document_extraction(uuid, uuid, jsonb, jsonb) from public, anon;
grant execute on function public.staff_apply_manager_document_extraction(uuid, uuid, jsonb, jsonb) to authenticated;
