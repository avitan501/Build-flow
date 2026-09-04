-- Let one reviewed quote import product variants that share a generic product
-- name while retaining a different, source-grounded size/specification. Exact
-- name+spec matches are reused; a distinct nonblank spec receives a qualified
-- catalog name. The preparation and existing importer run in one transaction.
create or replace function public.staff_import_resolved_manager_document_items_to_catalog(
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
  v_catalog_item_id uuid;
  v_candidate_count integer;
  v_qualified_name text;
  v_item_code text;
  v_result jsonb;
  v_failure jsonb;
  v_failure_detail text;
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
     or cardinality(p_item_ids) <> (
       select count(distinct requested.id)
       from unnest(p_item_ids) requested(id)
     )
     or length(trim(coalesce(p_catalog_department, ''))) not between 2 and 120 then
    return jsonb_build_object(
      'ok', false, 'code', 'invalid_input', 'lines', '[]'::jsonb
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
  if cardinality(p_item_ids) <> (
    select count(*)
    from public.manager_document_items item
    where item.document_id = p_document_id
      and item.id = any(p_item_ids)
  ) then
    return jsonb_build_object(
      'ok', false, 'code', 'selection_changed', 'lines', '[]'::jsonb
    );
  end if;

  begin
    for v_line in
      select *
      from public.manager_document_items item
      where item.document_id = p_document_id
        and item.id = any(p_item_ids)
      order by item.id
      for update
    loop
      if v_line.validation_status <> 'valid'
         or trim(v_line.description) = ''
         or v_line.matched_catalog_item_id is not null then
        continue;
      end if;

      select count(*), (min(item.id::text))::uuid
      into v_candidate_count, v_catalog_item_id
      from public.material_catalog_items item
      where item.category = trim(p_catalog_department)
        and lower(trim(item.name)) = lower(trim(v_line.description))
        and trim(v_line.specification) <> ''
        and lower(trim(item.description)) = lower(trim(v_line.specification));

      if v_candidate_count = 1 then
        update public.manager_document_items
        set matched_catalog_item_id = v_catalog_item_id,
            match_method = 'exact_name_spec',
            match_confidence = 1
        where id = v_line.id and document_id = p_document_id;
        continue;
      elsif v_candidate_count > 1 then
        v_failure := jsonb_build_object(
          'ok', false,
          'code', 'review_required',
          'lines', jsonb_build_array(jsonb_build_object(
            'lineId', v_line.id,
            'lineNumber', v_line.line_number,
            'reason', 'ambiguous_name_spec'
          ))
        );
        raise exception using errcode = 'P5601', message = 'catalog_identity_ambiguous', detail = v_failure::text;
      end if;

      if not exists (
        select 1
        from public.material_catalog_items item
        where item.category = trim(p_catalog_department)
          and lower(trim(item.name)) = lower(trim(v_line.description))
      ) then
        continue;
      end if;
      if trim(v_line.specification) = '' then
        v_failure := jsonb_build_object(
          'ok', false,
          'code', 'review_required',
          'lines', jsonb_build_array(jsonb_build_object(
            'lineId', v_line.id,
            'lineNumber', v_line.line_number,
            'reason', 'name_conflict_missing_spec'
          ))
        );
        raise exception using errcode = 'P5601', message = 'catalog_identity_needs_spec', detail = v_failure::text;
      end if;

      v_qualified_name := left(
        trim(v_line.description) || ' — ' || trim(v_line.specification),
        240
      );
      select count(*), (min(item.id::text))::uuid
      into v_candidate_count, v_catalog_item_id
      from public.material_catalog_items item
      where item.category = trim(p_catalog_department)
        and lower(trim(item.name)) = lower(v_qualified_name)
        and lower(trim(item.description)) = lower(trim(v_line.specification));
      if v_candidate_count > 1 then
        v_failure := jsonb_build_object(
          'ok', false,
          'code', 'review_required',
          'lines', jsonb_build_array(jsonb_build_object(
            'lineId', v_line.id,
            'lineNumber', v_line.line_number,
            'reason', 'ambiguous_qualified_name'
          ))
        );
        raise exception using errcode = 'P5601', message = 'catalog_identity_ambiguous', detail = v_failure::text;
      end if;

      if v_candidate_count = 0 then
        v_item_code := 'DOC-' || upper(substr(replace(p_document_id::text, '-', ''), 1, 12)) || '-' || v_line.line_number::text;
        select item.id into v_catalog_item_id
        from public.material_catalog_items item
        where item.item_code = v_item_code;
        if v_catalog_item_id is null then
          insert into public.material_catalog_items (
            category, item_code, name, description, default_quantity, unit,
            package_quantity, package_unit, comparison_quantity,
            comparison_unit, review_status, quality_notes, status, source,
            created_by, updated_by
          ) values (
            trim(p_catalog_department), v_item_code, v_qualified_name,
            left(trim(v_line.specification), 1000), 1,
            coalesce(nullif(trim(v_line.unit), ''), 'each'), 1,
            coalesce(nullif(trim(v_line.unit), ''), 'each'), 1,
            coalesce(nullif(trim(v_line.unit), ''), 'each'), 'needs_review',
            'Imported from reviewed source ' || left(v_document.file_name, 180),
            'active', 'Manager document: ' || left(v_document.file_name, 180),
            auth.uid(), auth.uid()
          ) returning id into v_catalog_item_id;
        elsif not exists (
          select 1
          from public.material_catalog_items item
          where item.id = v_catalog_item_id
            and item.category = trim(p_catalog_department)
            and lower(trim(item.description)) = lower(trim(v_line.specification))
        ) then
          v_failure := jsonb_build_object(
            'ok', false,
            'code', 'review_required',
            'lines', jsonb_build_array(jsonb_build_object(
              'lineId', v_line.id,
              'lineNumber', v_line.line_number,
              'reason', 'document_line_code_conflict'
            ))
          );
          raise exception using errcode = 'P5601', message = 'catalog_identity_conflict', detail = v_failure::text;
        end if;
      end if;

      update public.manager_document_items
      set matched_catalog_item_id = v_catalog_item_id,
          match_method = 'qualified_name_spec',
          match_confidence = 1
      where id = v_line.id and document_id = p_document_id;
    end loop;

    v_result := public.staff_quick_import_manager_document_item_to_catalog(
      p_document_id,
      p_item_ids,
      p_catalog_department,
      p_expected_document_updated_at,
      p_supplier,
      p_create_supplier
    );
    if not coalesce((v_result ->> 'ok')::boolean, false) then
      raise exception using errcode = 'P5601', message = 'catalog_import_rejected', detail = v_result::text;
    end if;
    return v_result;
  exception when sqlstate 'P5601' then
    get stacked diagnostics v_failure_detail = pg_exception_detail;
    return coalesce(
      nullif(v_failure_detail, '')::jsonb,
      jsonb_build_object(
        'ok', false, 'code', 'review_required', 'lines', '[]'::jsonb
      )
    );
  end;
end;
$$;

revoke all on function public.staff_import_resolved_manager_document_items_to_catalog(
  uuid, uuid[], text, timestamptz, jsonb, boolean
) from public, anon;
grant execute on function public.staff_import_resolved_manager_document_items_to_catalog(
  uuid, uuid[], text, timestamptz, jsonb, boolean
) to authenticated;
