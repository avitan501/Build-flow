update public.material_questions
set configuration = jsonb_set(
  coalesce(configuration, '{}'::jsonb),
  '{imageUrl}',
  '"/images/buildflow-retail/electrical-cable-department-v1.webp"'::jsonb,
  true
),
updated_at = timezone('utc', now())
where question_key = 'cable_items'
  and category_id in (
    select id
    from public.material_questionnaire_categories
    where department_key = 'Electrical'
  );
