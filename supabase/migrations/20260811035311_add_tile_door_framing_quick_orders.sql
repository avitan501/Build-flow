alter table public.material_questions
  drop constraint if exists material_questions_question_type_check;

alter table public.material_questions
  add constraint material_questions_question_type_check check (question_type in (
    'single_select', 'multi_select', 'yes_no', 'short_text', 'long_text',
    'number', 'quantity', 'square_feet', 'linear_feet', 'gallons', 'dropdown',
    'file_upload', 'item_list'
  ));

insert into public.material_questionnaire_categories
  (name, slug, department_key, description, is_active, sort_order)
values
  ('Tile Quick Order', 'tile-quick-order', 'Tile work', 'Configure tile-setting materials and jobsite accessories.', true, 20),
  ('Door & Molding Quick Order', 'door-molding-quick-order', 'Door and molding', 'Configure molding profiles and door requirements.', true, 40),
  ('Framing Lumber Quick Order', 'framing-lumber-quick-order', 'Framing', 'Build a repeatable lumber list with common sizes and lengths.', true, 10)
on conflict (department_key) do update set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  is_active = true,
  updated_at = now();

with seed(department_key, question_key, label, help_text, placeholder, question_type, unit, is_required, sort_order, allow_other, configuration) as (
  values
    ('Tile work', 'thinset_type', 'What thinset do you need?', '', '', 'single_select', null, true, 10, false, '{}'::jsonb),
    ('Tile work', 'thinset_quantity', 'How many bags of thinset do you need?', '', 'Enter bags', 'number', '50 lb. bags', true, 20, false, '{}'::jsonb),
    ('Tile work', 'fine_sand_yards', 'How much fine sand do you need?', '', 'Enter yards', 'number', 'cu. yd.', false, 30, false, '{}'::jsonb),
    ('Tile work', 'portland_cement_quantity', 'How many bags of Portland cement do you need?', '', 'Enter bags', 'number', '50 lb. bags', false, 40, false, '{}'::jsonb),
    ('Tile work', 'wire_mesh_area', 'How much tile wire mesh do you need?', '', 'Enter square footage', 'square_feet', 'sq. ft.', false, 50, false, '{}'::jsonb),
    ('Tile work', 'tile_underlayment', 'What tile underlayment should we include?', '', '', 'multi_select', null, false, 60, false, '{}'::jsonb),
    ('Tile work', 'tile_accessories', 'What other setting materials should we include?', 'Select every item that applies.', '', 'multi_select', null, false, 70, false, '{}'::jsonb),
    ('Tile work', 'tile_notes', 'Any tile, grout color, or delivery notes?', '', 'Add tile size, grout color, floor condition, or delivery details.', 'long_text', null, false, 80, false, '{}'::jsonb),

    ('Door and molding', 'request_type', 'What are you ordering?', '', '', 'multi_select', null, true, 10, false, '{}'::jsonb),
    ('Door and molding', 'molding_type', 'What type of molding do you need?', '', '', 'single_select', null, false, 20, true, '{}'::jsonb),
    ('Door and molding', 'molding_quantity', 'How many pieces of molding do you need?', '', 'Enter pieces', 'number', 'pieces', false, 30, false, '{}'::jsonb),
    ('Door and molding', 'molding_length', 'What molding length do you need?', '', '', 'single_select', null, false, 40, false, '{}'::jsonb),
    ('Door and molding', 'molding_catalog_reference', 'Garden State profile code or catalog link', 'Enter the profile number or paste the molding page link.', 'Example: WM 366 or catalog link', 'short_text', null, false, 50, false, '{}'::jsonb),
    ('Door and molding', 'door_type', 'What type of door do you need?', '', '', 'single_select', null, false, 60, true, '{}'::jsonb),
    ('Door and molding', 'door_quantity', 'How many doors do you need?', '', 'Enter quantity', 'number', 'doors', false, 70, false, '{}'::jsonb),
    ('Door and molding', 'door_measurement_method', 'How should we confirm the door measurements?', '', '', 'single_select', null, false, 80, false, '{}'::jsonb),
    ('Door and molding', 'door_measurements', 'Enter the door measurements', 'Include width, height, jamb depth, swing, and handing if known.', 'Example: 36 in. x 80 in., 4 9/16 in. jamb, left-hand inswing', 'long_text', null, false, 90, false, '{}'::jsonb),
    ('Door and molding', 'order_notes', 'Any matching, finish, or delivery notes?', '', 'Add species, paint grade, finish, matching, or delivery details.', 'long_text', null, false, 100, false, '{}'::jsonb),

    ('Framing', 'lumber_items', 'Add the lumber you need', 'Use one row for each size and length. Add as many rows as needed.', '', 'item_list', null, true, 10, false, '{"itemSizes":["1x2","1x3","1x4","1x6","1x8","1x10","1x12","2x3","2x4","2x6","2x8","2x10","2x12","3x4","4x4","4x6","6x6"],"itemLengths":["8 ft.","10 ft.","12 ft.","14 ft.","16 ft.","18 ft.","20 ft.","24 ft."]}'::jsonb),
    ('Framing', 'lumber_grade', 'What lumber grade or treatment do you need?', '', '', 'single_select', null, false, 20, true, '{}'::jsonb),
    ('Framing', 'framing_notes', 'Any plywood, hardware, grade, or delivery notes?', '', 'Add plywood, LVL, hangers, fasteners, treatment, or delivery details.', 'long_text', null, false, 30, false, '{}'::jsonb)
)
insert into public.material_questions
  (category_id, question_key, label, help_text, placeholder, question_type, unit, is_required, is_active, sort_order, allow_other, configuration)
select category.id, seed.question_key, seed.label, seed.help_text, seed.placeholder, seed.question_type, seed.unit, seed.is_required, true, seed.sort_order, seed.allow_other, seed.configuration
from seed
join public.material_questionnaire_categories category using (department_key)
on conflict (category_id, question_key) do update set
  label = excluded.label,
  help_text = excluded.help_text,
  placeholder = excluded.placeholder,
  question_type = excluded.question_type,
  unit = excluded.unit,
  is_required = excluded.is_required,
  is_active = true,
  sort_order = excluded.sort_order,
  allow_other = excluded.allow_other,
  configuration = excluded.configuration,
  updated_at = now();

with option_seed(department_key, question_key, label, value, sort_order) as (
  values
    ('Tile work', 'thinset_type', 'MAPEI Ultraflex', 'mapei-ultraflex', 10),
    ('Tile work', 'tile_underlayment', 'Cement backer board', 'cement-backer-board', 10),
    ('Tile work', 'tile_underlayment', 'Uncoupling membrane', 'uncoupling-membrane', 20),
    ('Tile work', 'tile_underlayment', 'Waterproofing membrane', 'waterproofing-membrane', 30),
    ('Tile work', 'tile_underlayment', 'Self-leveling underlayment', 'self-leveling-underlayment', 40),
    ('Tile work', 'tile_underlayment', 'Not sure', 'not-sure', 50),
    ('Tile work', 'tile_accessories', 'Grout', 'grout', 10),
    ('Tile work', 'tile_accessories', 'Tile spacers', 'tile-spacers', 20),
    ('Tile work', 'tile_accessories', 'Leveling clips', 'leveling-clips', 30),
    ('Tile work', 'tile_accessories', 'Waterproofing', 'waterproofing', 40),
    ('Tile work', 'tile_accessories', 'Primer', 'primer', 50),
    ('Tile work', 'tile_accessories', 'Matching silicone / caulk', 'matching-sealant', 60),

    ('Door and molding', 'request_type', 'Molding', 'molding', 10),
    ('Door and molding', 'request_type', 'Door', 'door', 20),
    ('Door and molding', 'molding_type', 'Crown molding', 'crown', 10),
    ('Door and molding', 'molding_type', 'Baseboard', 'baseboard', 20),
    ('Door and molding', 'molding_type', 'Casing', 'casing', 30),
    ('Door and molding', 'molding_type', 'Chair rail', 'chair-rail', 40),
    ('Door and molding', 'molding_type', 'Panel molding', 'panel-molding', 50),
    ('Door and molding', 'molding_type', 'Shoe / quarter round', 'shoe-quarter-round', 60),
    ('Door and molding', 'molding_type', 'Other', 'other', 70),
    ('Door and molding', 'molding_length', '8 ft.', '8-ft', 10),
    ('Door and molding', 'molding_length', '10 ft.', '10-ft', 20),
    ('Door and molding', 'molding_length', '12 ft.', '12-ft', 30),
    ('Door and molding', 'molding_length', '14 ft.', '14-ft', 40),
    ('Door and molding', 'molding_length', '16 ft.', '16-ft', 50),
    ('Door and molding', 'molding_length', 'Random lengths', 'random-lengths', 60),
    ('Door and molding', 'molding_length', 'Not sure', 'not-sure', 70),
    ('Door and molding', 'door_type', 'Interior prehung', 'interior-prehung', 10),
    ('Door and molding', 'door_type', 'Interior slab', 'interior-slab', 20),
    ('Door and molding', 'door_type', 'Exterior prehung', 'exterior-prehung', 30),
    ('Door and molding', 'door_type', 'Exterior slab', 'exterior-slab', 40),
    ('Door and molding', 'door_type', 'Other', 'other', 50),
    ('Door and molding', 'door_type', 'Not sure', 'not-sure', 60),
    ('Door and molding', 'door_measurement_method', 'I have the measurements', 'have-measurements', 10),
    ('Door and molding', 'door_measurement_method', 'Call me to arrange a jobsite measurement', 'jobsite-measurement', 20),

    ('Framing', 'lumber_grade', 'Standard framing lumber', 'standard-framing', 10),
    ('Framing', 'lumber_grade', 'Pressure treated', 'pressure-treated', 20),
    ('Framing', 'lumber_grade', 'Douglas Fir', 'douglas-fir', 30),
    ('Framing', 'lumber_grade', 'Select Structural', 'select-structural', 40),
    ('Framing', 'lumber_grade', 'Other', 'other', 50),
    ('Framing', 'lumber_grade', 'Not sure', 'not-sure', 60)
)
insert into public.material_question_options (question_id, label, value, is_active, sort_order)
select question.id, option_seed.label, option_seed.value, true, option_seed.sort_order
from option_seed
join public.material_questionnaire_categories category using (department_key)
join public.material_questions question on question.category_id = category.id and question.question_key = option_seed.question_key
on conflict (question_id, value) do update set
  label = excluded.label,
  is_active = true,
  sort_order = excluded.sort_order,
  updated_at = now();

update public.material_questions child
set conditional_parent_question_id = parent.id,
    conditional_operator = 'includes_any',
    conditional_value = '["molding"]'::jsonb
from public.material_questions parent
join public.material_questionnaire_categories category on category.id = parent.category_id
where category.department_key = 'Door and molding'
  and parent.question_key = 'request_type'
  and child.category_id = category.id
  and child.question_key in ('molding_type', 'molding_quantity', 'molding_length', 'molding_catalog_reference');

update public.material_questions child
set conditional_parent_question_id = parent.id,
    conditional_operator = 'includes_any',
    conditional_value = '["door"]'::jsonb
from public.material_questions parent
join public.material_questionnaire_categories category on category.id = parent.category_id
where category.department_key = 'Door and molding'
  and parent.question_key = 'request_type'
  and child.category_id = category.id
  and child.question_key in ('door_type', 'door_quantity', 'door_measurement_method');

update public.material_questions child
set conditional_parent_question_id = parent.id,
    conditional_operator = 'equals',
    conditional_value = '"have-measurements"'::jsonb
from public.material_questions parent
join public.material_questionnaire_categories category on category.id = parent.category_id
where category.department_key = 'Door and molding'
  and parent.question_key = 'door_measurement_method'
  and child.category_id = category.id
  and child.question_key = 'door_measurements';
