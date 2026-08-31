alter table public.manager_documents
  add column if not exists extraction_lease_token uuid;

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
begin
  if not (private.is_admin() or private.has_staff_capability('suppliers')) then
    raise exception 'Approved manager access is required';
  end if;
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then
    raise exception 'Document items must be an array';
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

  select count(*) into v_existing_count
  from public.manager_document_items where document_id = p_document_id;
  select count(*) into v_incoming_count
  from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(description text)
  where nullif(trim(item.description), '') is not null;
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
    p_document_id, row_number() over (), coalesce(item.item_code, ''),
    item.description, coalesce(item.specification, ''), item.quantity,
    coalesce(item.unit, ''), item.unit_price, item.line_total, item.source_page,
    coalesce(item.source_text, ''), item.confidence,
    coalesce(item.validation_status, 'needs_review'), true
  from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(
    item_code text, description text, specification text, quantity numeric,
    unit text, unit_price numeric, line_total numeric, source_page integer,
    source_text text, confidence numeric, validation_status text
  )
  where nullif(trim(item.description), '') is not null;
  get diagnostics v_item_count = row_count;

  update public.manager_documents set
    document_type = coalesce(nullif(p_document->>'document_type', ''), document_type),
    status = 'needs_review',
    title = coalesce(nullif(p_document->>'title', ''), title),
    party_name = coalesce(p_document->>'party_name', ''),
    document_number = coalesce(p_document->>'document_number', ''),
    document_date = nullif(p_document->>'document_date', '')::date,
    due_date = nullif(p_document->>'due_date', '')::date,
    expires_on = nullif(p_document->>'expires_on', '')::date,
    suggested_department = nullif(p_document->>'suggested_department', ''),
    currency = coalesce(nullif(p_document->>'currency', ''), 'USD'),
    subtotal = nullif(p_document->>'subtotal', '')::numeric,
    discount = coalesce(nullif(p_document->>'discount', '')::numeric, 0),
    delivery_charge = coalesce(nullif(p_document->>'delivery_charge', '')::numeric, 0),
    tax_amount = nullif(p_document->>'tax_amount', '')::numeric,
    tax_percent = nullif(p_document->>'tax_percent', '')::numeric,
    total = nullif(p_document->>'total', '')::numeric,
    raw_text = coalesce(p_document->>'raw_text', raw_text),
    classification_confidence = nullif(p_document->>'classification_confidence', '')::numeric,
    extraction_note = v_item_count || ' lines found on the latest AI read. Review before approval.',
    evidence = coalesce(p_document->'evidence', '[]'::jsonb),
    warnings = coalesce(p_document->'warnings', '[]'::jsonb),
    suggested_actions = coalesce(p_document->'suggested_actions', '[]'::jsonb),
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
