create or replace function public.staff_create_client_request(
  p_customer_id uuid,
  p_department text,
  p_title text,
  p_lines jsonb,
  p_notes text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  customer_record public.profiles%rowtype;
  project_id uuid;
  request_id uuid;
  request_title text;
  stored_department text;
  clean_notes text;
  manager_name text;
  line_record jsonb;
  line_number integer := 0;
  line_name text;
  line_unit text;
  line_quantity numeric;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required';
  end if;

  if not (select private.has_staff_capability('customers'))
     and not (select private.is_admin()) then
    raise exception 'customer_management_permission_required';
  end if;

  select profile.*
  into customer_record
  from public.profiles profile
  where profile.id = p_customer_id;

  if customer_record.id is null or customer_record.role <> 'client' then
    raise exception 'client_not_available';
  end if;
  if not customer_record.is_active then
    raise exception 'client_inactive';
  end if;

  if jsonb_typeof(p_lines) <> 'array'
     or jsonb_array_length(p_lines) < 1
     or jsonb_array_length(p_lines) > 50 then
    raise exception 'invalid_material_lines';
  end if;

  stored_department := left(trim(coalesce(p_department, '')), 100);
  if stored_department = '' then stored_department := 'Unassigned'; end if;
  request_title := left(trim(coalesce(p_title, '')), 180);
  if request_title = '' then
    request_title := case when stored_department = 'Unassigned' then 'Material request' else stored_department || ' request' end;
  end if;
  clean_notes := left(trim(coalesce(p_notes, '')), 4000);

  select project.id
  into project_id
  from public.projects project
  where project.owner_id = p_customer_id
    and project.name = 'Material Requests'
    and project.status <> 'archived'
  order by project.updated_at desc
  limit 1;

  if project_id is null then
    insert into public.projects (owner_id, name, status)
    values (p_customer_id, 'Material Requests', 'active')
    returning id into project_id;
  end if;

  insert into public.quote_requests (project_id, owner_id, title, status, submitted_at)
  values (project_id, p_customer_id, request_title, 'submitted', now())
  returning id into request_id;

  for line_record in select value from jsonb_array_elements(p_lines)
  loop
    line_number := line_number + 1;
    line_name := left(trim(coalesce(line_record ->> 'name', '')), 300);
    line_unit := left(trim(coalesce(line_record ->> 'unit', '')), 40);
    if line_unit = '' then line_unit := 'each'; end if;

    begin
      line_quantity := (line_record ->> 'quantity')::numeric;
    exception when others then
      raise exception 'invalid_material_quantity';
    end;

    if line_name = '' then raise exception 'invalid_material_name'; end if;
    if line_quantity <= 0 or line_quantity > 1000000 then raise exception 'invalid_material_quantity'; end if;

    insert into public.quote_request_items (
      request_id,
      project_id,
      owner_id,
      catalog_item_id,
      name,
      department,
      item_type,
      quantity,
      unit,
      unit_price,
      qualification_status,
      metadata
    ) values (
      request_id,
      project_id,
      p_customer_id,
      null,
      line_name,
      stored_department,
      'custom_priced',
      line_quantity,
      line_unit,
      0,
      'not_required',
      jsonb_build_object(
        'created_by_manager', true,
        'created_by', (select auth.uid())
      ) || case
        when line_number = 1 and clean_notes <> '' then jsonb_build_object('request_details', clean_notes)
        else '{}'::jsonb
      end
    );
  end loop;

  select coalesce(nullif(trim(profile.full_name), ''), nullif(trim(profile.email), ''), 'a staff member')
  into manager_name
  from public.profiles profile
  where profile.id = (select auth.uid());

  insert into public.project_events (
    project_id,
    owner_id,
    event_type,
    source,
    title,
    description,
    metadata
  ) values (
    project_id,
    p_customer_id,
    'material_added',
    'admin',
    request_title || ' created by manager',
    'Created on behalf of the client by ' || coalesce(manager_name, 'a staff member') || '.',
    jsonb_build_object('quote_request_id', request_id, 'created_by_manager', (select auth.uid()))
  );

  return request_id;
end;
$$;

revoke all on function public.staff_create_client_request(uuid, text, text, jsonb, text)
  from public, anon;
grant execute on function public.staff_create_client_request(uuid, text, text, jsonb, text)
  to authenticated;
