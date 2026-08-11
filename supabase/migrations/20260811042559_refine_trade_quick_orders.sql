update public.material_questions question
set is_active = false, updated_at = now()
from public.material_questionnaire_categories category
where category.id = question.category_id
  and (
    (category.department_key = 'Framing' and question.question_key = 'lumber_grade')
    or (category.department_key = 'Sheet rock' and question.question_key = 'drywall_product')
    or (category.department_key = 'Tile work' and question.question_key in ('thinset_type', 'tile_underlayment', 'tile_accessories'))
    or (category.department_key = 'Door and molding' and question.question_key in ('molding_type', 'molding_quantity', 'molding_length', 'molding_catalog_reference'))
  );

update public.material_questions question
set configuration = '{"itemMode":"lumber","itemSizes":["2x3","2x4","2x6","2x8","2x10","2x12"],"itemLengths":["8 ft.","10 ft.","12 ft.","16 ft."]}'::jsonb,
    updated_at = now()
from public.material_questionnaire_categories category
where category.id = question.category_id
  and category.department_key = 'Framing'
  and question.question_key = 'lumber_items';

update public.material_questions question
set configuration = case question.question_key
  when 'sheet_count' then '{"imageUrl":"/images/department-essentials/drywall-grid.webp","imagePosition":"0% 0%","imageSprite":true}'::jsonb
  when 'drywall_type' then '{"imageUrl":"/images/department-essentials/drywall-grid.webp","imagePosition":"33.333% 0%","imageSprite":true}'::jsonb
  when 'needs_screws' then '{"imageUrl":"/images/department-essentials/drywall-grid.webp","imagePosition":"33.333% 100%","imageSprite":true}'::jsonb
  when 'needs_compound' then '{"imageUrl":"/images/department-essentials/drywall-grid.webp","imagePosition":"66.667% 0%","imageSprite":true}'::jsonb
  when 'needs_corner_bead' then '{"imageUrl":"/images/department-essentials/drywall-grid.webp","imagePosition":"0% 100%","imageSprite":true}'::jsonb
  else question.configuration
end,
updated_at = now()
from public.material_questionnaire_categories category
where category.id = question.category_id
  and category.department_key = 'Sheet rock'
  and question.question_key in ('sheet_count', 'drywall_type', 'needs_screws', 'needs_compound', 'needs_corner_bead');

with category as (
  select id from public.material_questionnaire_categories where department_key = 'Sheet rock'
), seed(question_key, label, question_type, unit, sort_order, configuration) as (
  values
    ('needs_tape', 'Do you need drywall tape?', 'yes_no', null, 220, '{"imageUrl":"/images/department-essentials/drywall-grid.webp","imagePosition":"100% 0%","imageSprite":true}'::jsonb),
    ('tape_quantity', 'How many rolls of drywall tape do you need?', 'number', 'rolls', 230, '{}'::jsonb),
    ('needs_metal_studs', 'Do you need metal studs?', 'yes_no', null, 240, '{"imageUrl":"/images/department-essentials/drywall-grid.webp","imagePosition":"66.667% 100%","imageSprite":true}'::jsonb),
    ('metal_stud_quantity', 'How many metal studs do you need?', 'number', 'pieces', 250, '{}'::jsonb)
)
insert into public.material_questions (category_id, question_key, label, question_type, unit, is_active, sort_order, configuration)
select category.id, seed.question_key, seed.label, seed.question_type, seed.unit, true, seed.sort_order, seed.configuration
from category cross join seed
on conflict (category_id, question_key) do update set
  label = excluded.label, question_type = excluded.question_type, unit = excluded.unit,
  is_active = true, sort_order = excluded.sort_order, configuration = excluded.configuration, updated_at = now();

update public.material_questions child
set conditional_parent_question_id = parent.id, conditional_operator = 'equals', conditional_value = '"yes"'::jsonb
from public.material_questions parent
join public.material_questionnaire_categories category on category.id = parent.category_id
where category.department_key = 'Sheet rock'
  and child.category_id = category.id
  and ((parent.question_key = 'needs_tape' and child.question_key = 'tape_quantity')
    or (parent.question_key = 'needs_metal_studs' and child.question_key = 'metal_stud_quantity'));

update public.material_questions question
set label = 'How many bags of MAPEI Ultraflex thinset do you need?', updated_at = now()
from public.material_questionnaire_categories category
where category.id = question.category_id and category.department_key = 'Tile work' and question.question_key = 'thinset_quantity';

with category as (
  select id from public.material_questionnaire_categories where department_key = 'Tile work'
), seed(question_key, label, question_type, unit, sort_order) as (
  values
    ('needs_waterproofing', 'Do you need liquid waterproofing membrane?', 'yes_no', null, 60),
    ('waterproofing_gallons', 'How many gallons of waterproofing do you need?', 'gallons', 'gallons', 70)
)
insert into public.material_questions (category_id, question_key, label, question_type, unit, is_active, sort_order)
select category.id, seed.question_key, seed.label, seed.question_type, seed.unit, true, seed.sort_order
from category cross join seed
on conflict (category_id, question_key) do update set
  label = excluded.label, question_type = excluded.question_type, unit = excluded.unit,
  is_active = true, sort_order = excluded.sort_order, updated_at = now();

update public.material_questions child
set conditional_parent_question_id = parent.id, conditional_operator = 'equals', conditional_value = '"yes"'::jsonb
from public.material_questions parent
join public.material_questionnaire_categories category on category.id = parent.category_id
where category.department_key = 'Tile work'
  and parent.question_key = 'needs_waterproofing'
  and child.category_id = category.id
  and child.question_key = 'waterproofing_gallons';

with category as (
  select id from public.material_questionnaire_categories where department_key = 'Door and molding'
), seed(question_key, label, help_text, question_type, sort_order, configuration) as (
  values
    ('molding_items', 'Add the molding you need', 'Use one box for each molding profile.', 'item_list', 20, '{"itemMode":"molding","itemLengths":["8 ft.","16 ft."]}'::jsonb),
    ('door_thickness', 'What door thickness do you need?', '', 'single_select', 65, '{}'::jsonb)
)
insert into public.material_questions (category_id, question_key, label, help_text, question_type, is_active, sort_order, configuration)
select category.id, seed.question_key, seed.label, seed.help_text, seed.question_type, true, seed.sort_order, seed.configuration
from category cross join seed
on conflict (category_id, question_key) do update set
  label = excluded.label, help_text = excluded.help_text, question_type = excluded.question_type,
  is_active = true, sort_order = excluded.sort_order, configuration = excluded.configuration, updated_at = now();

update public.material_questions question
set label = 'What door style do you need?', allow_other = false, updated_at = now()
from public.material_questionnaire_categories category
where category.id = question.category_id and category.department_key = 'Door and molding' and question.question_key = 'door_type';

update public.material_question_options option
set is_active = false, updated_at = now()
from public.material_questions question
join public.material_questionnaire_categories category on category.id = question.category_id
where option.question_id = question.id
  and category.department_key = 'Door and molding'
  and question.question_key = 'door_type';

with option_seed(question_key, label, value, sort_order) as (
  values
    ('door_type', 'Flat / flush', 'flat', 10),
    ('door_type', '1-panel Shaker', 'one-shaker', 20),
    ('door_type', '2-panel Shaker', 'two-shaker', 30),
    ('door_type', '3-panel Shaker', 'three-shaker', 40),
    ('door_thickness', '1 3/8 in.', '1-3-8', 10),
    ('door_thickness', '1 3/4 in.', '1-3-4', 20)
)
insert into public.material_question_options (question_id, label, value, is_active, sort_order)
select question.id, option_seed.label, option_seed.value, true, option_seed.sort_order
from option_seed
join public.material_questionnaire_categories category on category.department_key = 'Door and molding'
join public.material_questions question on question.category_id = category.id and question.question_key = option_seed.question_key
on conflict (question_id, value) do update set label = excluded.label, is_active = true, sort_order = excluded.sort_order, updated_at = now();

update public.material_questions child
set conditional_parent_question_id = parent.id, conditional_operator = 'includes_any', conditional_value = case child.question_key
  when 'molding_items' then '["molding"]'::jsonb else '["door"]'::jsonb end
from public.material_questions parent
join public.material_questionnaire_categories category on category.id = parent.category_id
where category.department_key = 'Door and molding'
  and parent.question_key = 'request_type'
  and child.category_id = category.id
  and child.question_key in ('molding_items', 'door_thickness');
