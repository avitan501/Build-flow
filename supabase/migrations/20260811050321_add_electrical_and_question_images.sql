insert into public.material_questionnaire_categories
  (name, slug, department_key, description, is_active, sort_order)
values
  ('Electrical Cable Quick Order', 'electrical-cable-quick-order', 'Electrical', 'Build a repeatable Romex or BX cable list.', true, 25)
on conflict (department_key) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = true,
  updated_at = now();

with category as (
  select id from public.material_questionnaire_categories where department_key = 'Electrical'
), seed(question_key, label, help_text, placeholder, question_type, is_required, sort_order, configuration) as (
  values
    (
      'cable_items',
      'Add the cable you need',
      'Use one row for each cable type and size.',
      '',
      'item_list',
      true,
      10,
      '{"itemMode":"cable","itemSizes":["Romex","BX"],"cableNumbers":["14/2","14/3","12/2","12/3","10/2","10/3","8/3","6/3"],"itemLengths":["25 ft.","50 ft.","100 ft.","250 ft.","500 ft.","1000 ft."],"imageUrl":"/images/buildflow-retail/electrical-cable-department-v1.png"}'::jsonb
    ),
    (
      'electrical_notes',
      'Any wire color, conductor, or delivery notes?',
      '',
      'Add copper or aluminum, color, voltage, packaging, or delivery details.',
      'long_text',
      false,
      20,
      '{}'::jsonb
    )
)
insert into public.material_questions
  (category_id, question_key, label, help_text, placeholder, question_type, is_required, is_active, sort_order, configuration)
select category.id, seed.question_key, seed.label, seed.help_text, seed.placeholder, seed.question_type, seed.is_required, true, seed.sort_order, seed.configuration
from category cross join seed
on conflict (category_id, question_key) do update set
  label = excluded.label,
  help_text = excluded.help_text,
  placeholder = excluded.placeholder,
  question_type = excluded.question_type,
  is_required = excluded.is_required,
  is_active = true,
  sort_order = excluded.sort_order,
  configuration = excluded.configuration,
  updated_at = now();

update public.material_questions question
set configuration = coalesce(question.configuration, '{}'::jsonb) || image.configuration,
    updated_at = now()
from public.material_questionnaire_categories category
join (
  values
    ('Wood Floor', 'flooring_product', '{"imageUrl":"/images/department-essentials/flooring-grid.webp","imagePosition":"0% 0%","imageSprite":true}'::jsonb),
    ('Wood Floor', 'wood_type', '{"imageUrl":"/images/department-essentials/flooring-grid.webp","imagePosition":"33.333% 0%","imageSprite":true}'::jsonb),
    ('Wood Floor', 'flooring_area', '{"imageUrl":"/images/department-essentials/flooring-grid.webp","imagePosition":"0% 0%","imageSprite":true}'::jsonb),
    ('Wood Floor', 'flooring_accessories', '{"imageUrl":"/images/department-essentials/flooring-grid.webp","imagePosition":"100% 0%","imageSprite":true}'::jsonb),
    ('Tile work', 'thinset_quantity', '{"imageUrl":"/images/materials/products-real/mapei-ultraflex-thinset.jpg"}'::jsonb),
    ('Tile work', 'fine_sand_yards', '{"imageUrl":"/images/materials/products-real/yardas-fine-sand.jpg"}'::jsonb),
    ('Tile work', 'portland_cement_quantity', '{"imageUrl":"/images/materials/products-real/lehigh-portland-cement-type-i-ii.jpg"}'::jsonb),
    ('Tile work', 'wire_mesh_area', '{"imageUrl":"/images/materials/products-real/tile-wire-mesh-v2.jpg"}'::jsonb),
    ('Tile work', 'needs_waterproofing', '{"imageUrl":"/images/department-essentials/tile-grid.webp","imagePosition":"0% 100%","imageSprite":true}'::jsonb),
    ('Door and molding', 'request_type', '{"imageUrl":"/images/buildflow-retail/door-molding-department.webp"}'::jsonb),
    ('Door and molding', 'molding_items', '{"imageUrl":"/images/department-essentials/moldings-grid.webp","imagePosition":"0% 0%","imageSprite":true}'::jsonb),
    ('Door and molding', 'door_type', '{"imageUrl":"/images/materials/photos/doors.jpg"}'::jsonb),
    ('Framing', 'lumber_items', '{"imageUrl":"/images/materials/products-real/2x4-premium-lumber.jpg"}'::jsonb),
    ('Window', 'specific_manufacturer', '{"imageUrl":"/images/department-essentials/windows-grid.webp","imagePosition":"33.333% 0%","imageSprite":true}'::jsonb),
    ('Window', 'window_plans', '{"imageUrl":"/images/buildflow-retail/windows-department.webp"}'::jsonb),
    ('Window', 'frame_material', '{"imageUrl":"/images/department-essentials/windows-grid.webp","imagePosition":"0% 0%","imageSprite":true}'::jsonb),
    ('Window', 'needs_grilles', '{"imageUrl":"/images/department-essentials/windows-grid.webp","imagePosition":"33.333% 0%","imageSprite":true}'::jsonb)
) as image(department_key, question_key, configuration)
  on image.department_key = category.department_key
where question.category_id = category.id
  and question.question_key = image.question_key;

update public.material_questions child
set conditional_parent_question_id = parent.id,
    conditional_operator = 'is_answered',
    conditional_value = null,
    updated_at = now()
from public.material_questions parent
join public.material_questionnaire_categories category on category.id = parent.category_id
where category.department_key = 'Door and molding'
  and parent.question_key = 'request_type'
  and child.category_id = category.id
  and child.question_key = 'order_notes';
