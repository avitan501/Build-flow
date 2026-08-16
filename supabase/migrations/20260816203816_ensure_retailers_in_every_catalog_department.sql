do $$
declare
  all_departments jsonb := '["Framing", "Electrical", "Tile", "Sheet Rock", "Door & Molding", "Flooring", "Siding", "Roofing", "Windows", "Others"]'::jsonb;
begin
  update public.workflow_manager_settings settings
  set state = jsonb_set(
    settings.state,
    '{qualificationSettings,suppliers}',
    (
      select jsonb_agg(
        case
          when supplier ->> 'id' in ('home-depot-retail-catalog', 'lowes-retail-catalog')
            then jsonb_set(
              jsonb_set(supplier, '{catalogDepartments}', all_departments, true),
              '{catalogEnabledDepartments}',
              all_departments,
              true
            )
          else supplier
        end
        order by ordinal
      )
      from jsonb_array_elements(coalesce(settings.state #> '{qualificationSettings,suppliers}', '[]'::jsonb))
        with ordinality as suppliers(supplier, ordinal)
    ),
    true
  ),
  updated_at = now()
  where settings.id = 'singleton';
end $$;
