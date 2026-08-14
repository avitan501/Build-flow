do $$
declare
  current_state jsonb;
  current_suppliers jsonb;
  all_departments jsonb := '["Framing", "Electrical", "Tile", "Sheet Rock", "Door & Molding", "Flooring", "Siding", "Roofing", "Windows", "Others"]'::jsonb;
  lowes_supplier jsonb;
  home_depot_supplier jsonb;
begin
  select state
  into current_state
  from public.workflow_manager_settings
  where id = 'singleton'
  for update;

  if current_state is null then
    raise exception 'Supplier directory settings are unavailable.';
  end if;

  current_suppliers := coalesce(current_state #> '{qualificationSettings,suppliers}', '[]'::jsonb);
  if jsonb_typeof(current_suppliers) <> 'array' then
    raise exception 'Supplier directory is invalid.';
  end if;

  lowes_supplier := jsonb_build_object(
    'id', 'lowes-retail-catalog',
    'name', 'Lowe''s',
    'contactLabel', 'Online store',
    'contactName', 'Lowe''s Pro',
    'portalUrl', 'https://www.lowes.com/',
    'preferredDeliveryMethod', 'portal',
    'deliveryNotes', 'Use the website link to compare current store pricing and availability.',
    'notes', 'Retail catalog pricing source.',
    'trustLevel', 'first-time',
    'catalogDepartments', all_departments,
    'catalogEnabledDepartments', all_departments,
    'materials', 'Residential building materials and supplies'
  );

  home_depot_supplier := jsonb_build_object(
    'id', 'home-depot-retail-catalog',
    'name', 'The Home Depot',
    'contactLabel', 'Online store',
    'contactName', 'The Home Depot Pro',
    'portalUrl', 'https://www.homedepot.com/',
    'preferredDeliveryMethod', 'portal',
    'deliveryNotes', 'Use the website link to compare current store pricing and availability.',
    'notes', 'Retail catalog pricing source.',
    'trustLevel', 'first-time',
    'catalogDepartments', all_departments,
    'catalogEnabledDepartments', all_departments,
    'materials', 'Residential building materials and supplies'
  );

  if not exists (
    select 1 from jsonb_array_elements(current_suppliers) supplier
    where supplier ->> 'id' = 'lowes-retail-catalog'
  ) then
    current_suppliers := current_suppliers || jsonb_build_array(lowes_supplier);
  end if;

  if not exists (
    select 1 from jsonb_array_elements(current_suppliers) supplier
    where supplier ->> 'id' = 'home-depot-retail-catalog'
  ) then
    current_suppliers := current_suppliers || jsonb_build_array(home_depot_supplier);
  end if;

  update public.workflow_manager_settings
  set state = jsonb_set(current_state, '{qualificationSettings,suppliers}', current_suppliers, true),
      updated_at = now()
  where id = 'singleton';
end $$;
