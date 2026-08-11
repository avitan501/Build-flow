-- Refine the configurable flooring and drywall Quick Order flows.
-- Existing material-request snapshots and answers are intentionally untouched.

with category as (
  select id from public.material_questionnaire_categories where slug = 'hardwood-flooring'
), question_seed as (
  select * from (values
    ('flooring_product', 'What material do you need?', 'single_select', null::text, true, 10, false),
    ('wood_type', 'What wood species do you need?', 'single_select', null::text, true, 20, false),
    ('flooring_thickness', 'What thickness do you need?', 'single_select', null::text, true, 30, false),
    ('milling_cut', 'What cut do you need?', 'single_select', null::text, false, 40, false),
    ('board_width', 'What board width do you need?', 'single_select', null::text, true, 50, false),
    ('board_length', 'What available length do you need?', 'single_select', null::text, false, 60, false),
    ('flooring_area', 'How much flooring do you need?', 'square_feet', 'sq. ft.', true, 70, false),
    ('flooring_accessories', 'What else should we include?', 'multi_select', null::text, false, 80, false),
    ('wood_grade', 'What wood grade do you prefer?', 'single_select', null::text, false, 90, false),
    ('installation_method', 'What installation method will be used?', 'single_select', null::text, false, 100, false),
    ('waste_allowance', 'Would you like us to include a recommended waste allowance?', 'yes_no', null::text, false, 110, false),
    ('specific_requirements', 'Do you have any specific requirements?', 'long_text', null::text, false, 120, false)
  ) as seed(question_key, label, question_type, unit, is_required, sort_order, allow_other)
)
insert into public.material_questions (
  category_id, question_key, label, help_text, placeholder, question_type, unit,
  is_required, is_active, sort_order, allow_other, configuration
)
select category.id, seed.question_key, seed.label,
  case when seed.question_key = 'waste_allowance' then 'Waste is commonly added for cuts, defects, and layout.' else '' end,
  case when seed.question_key = 'flooring_area' then 'Enter square footage'
       when seed.question_key = 'specific_requirements' then 'Add matching, finish, installation, or delivery details.'
       else '' end,
  seed.question_type, seed.unit, seed.is_required, true, seed.sort_order, seed.allow_other, '{}'::jsonb
from category cross join question_seed seed
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
  conditional_parent_question_id = null,
  conditional_operator = null,
  conditional_value = null,
  configuration = excluded.configuration,
  updated_at = now();

update public.material_questions question
set is_active = false, updated_at = now()
from public.material_questionnaire_categories category
where question.category_id = category.id
  and category.slug = 'hardwood-flooring'
  and question.question_key in (
    'flooring_type', 'finish_type', 'prefinished_details', 'needs_bullnose', 'bullnose_length',
    'needs_adhesive', 'adhesive_gallons', 'needs_underlayment', 'underlayment_area'
  );

with option_seed as (
  select * from (values
    ('flooring_product', 'Unfinished solid hardwood', 'unfinished-solid', 10),
    ('wood_type', 'Red Oak', 'red-oak', 10),
    ('wood_type', 'White Oak', 'white-oak', 20),
    ('flooring_thickness', '3/4″', '3-4', 10),
    ('milling_cut', 'Rift & Quartered', 'rift-and-quartered', 10),
    ('milling_cut', 'Rift Only', 'rift-only', 20),
    ('milling_cut', 'Quartered Only', 'quartered-only', 30),
    ('board_width', '1-1/2″', '1-1-2', 10),
    ('board_width', '2-1/4″', '2-1-4', 20),
    ('board_width', '3-1/4″', '3-1-4', 30),
    ('board_width', '4″', '4', 40),
    ('board_width', '5″', '5', 50),
    ('board_width', '6″', '6', 60),
    ('board_width', '7″', '7', 70),
    ('board_width', '8″', '8', 80),
    ('board_width', '9″', '9', 90),
    ('board_width', '10″', '10', 100),
    ('board_length', 'Standard 1′–7′', 'standard-1-7', 10),
    ('flooring_accessories', 'Flooring underlayment', 'underlayment', 10),
    ('flooring_accessories', 'Wood floor glue', 'wood-floor-glue', 20),
    ('flooring_accessories', 'Floor covering paper', 'floor-covering-paper', 30),
    ('flooring_accessories', 'Call me for stair nosing and transition-strip measurements', 'call-for-measurements', 40)
  ) as seed(question_key, label, value, sort_order)
), target_questions as (
  select question.id, question.question_key
  from public.material_questions question
  join public.material_questionnaire_categories category on category.id = question.category_id
  where category.slug = 'hardwood-flooring'
    and question.question_key in (select distinct question_key from option_seed)
)
insert into public.material_question_options (question_id, label, value, is_active, sort_order)
select target.id, seed.label, seed.value, true, seed.sort_order
from option_seed seed
join target_questions target on target.question_key = seed.question_key
on conflict (question_id, value) do update set
  label = excluded.label,
  is_active = true,
  sort_order = excluded.sort_order;

with target_questions as (
  select question.id, question.question_key
  from public.material_questions question
  join public.material_questionnaire_categories category on category.id = question.category_id
  where category.slug = 'hardwood-flooring'
    and question.question_key in ('flooring_product', 'wood_type', 'flooring_thickness', 'milling_cut', 'board_width', 'board_length', 'flooring_accessories')
), allowed as (
  select * from (values
    ('flooring_product', 'unfinished-solid'),
    ('wood_type', 'red-oak'), ('wood_type', 'white-oak'),
    ('flooring_thickness', '3-4'),
    ('milling_cut', 'rift-and-quartered'), ('milling_cut', 'rift-only'), ('milling_cut', 'quartered-only'),
    ('board_width', '1-1-2'), ('board_width', '2-1-4'), ('board_width', '3-1-4'), ('board_width', '4'), ('board_width', '5'),
    ('board_width', '6'), ('board_width', '7'), ('board_width', '8'), ('board_width', '9'), ('board_width', '10'),
    ('board_length', 'standard-1-7'),
    ('flooring_accessories', 'underlayment'), ('flooring_accessories', 'wood-floor-glue'),
    ('flooring_accessories', 'floor-covering-paper'), ('flooring_accessories', 'call-for-measurements')
  ) as item(question_key, value)
)
update public.material_question_options option
set is_active = false
from target_questions target
where option.question_id = target.id
  and not exists (
    select 1 from allowed
    where allowed.question_key = target.question_key and allowed.value = option.value
  );

with category as (
  select id from public.material_questionnaire_categories where slug = 'sheetrock-drywall'
), question_seed as (
  select * from (values
    ('drywall_product', 'What material do you need?', 'single_select', null::text, true, 10),
    ('sheet_count', 'How many sheets do you need?', 'number', 'sheets', true, 20),
    ('sheet_size', 'What sheet size do you need?', 'single_select', null::text, true, 30),
    ('drywall_type', 'What type of drywall do you need?', 'single_select', null::text, true, 40),
    ('thickness', 'What thickness do you need?', 'single_select', null::text, true, 50)
  ) as seed(question_key, label, question_type, unit, is_required, sort_order)
)
insert into public.material_questions (
  category_id, question_key, label, help_text, placeholder, question_type, unit,
  is_required, is_active, sort_order, allow_other, configuration
)
select category.id, seed.question_key, seed.label, '',
  case when seed.question_key = 'sheet_count' then 'Enter quantity' else '' end,
  seed.question_type, seed.unit, seed.is_required, true, seed.sort_order, false, '{}'::jsonb
from category cross join question_seed seed
on conflict (category_id, question_key) do update set
  label = excluded.label,
  placeholder = excluded.placeholder,
  question_type = excluded.question_type,
  unit = excluded.unit,
  is_required = excluded.is_required,
  is_active = true,
  sort_order = excluded.sort_order,
  allow_other = false,
  conditional_parent_question_id = null,
  conditional_operator = null,
  conditional_value = null,
  configuration = excluded.configuration,
  updated_at = now();

update public.material_questions question
set is_active = false, updated_at = now()
from public.material_questionnaire_categories category
where question.category_id = category.id
  and category.slug = 'sheetrock-drywall'
  and question.question_key in ('custom_width', 'custom_length');

update public.material_questions question
set sort_order = question.sort_order + 50, updated_at = now()
from public.material_questionnaire_categories category
where question.category_id = category.id
  and category.slug = 'sheetrock-drywall'
  and question.question_key in (
    'needs_screws', 'screw_length', 'screw_quantity', 'needs_compound', 'compound_type',
    'compound_quantity', 'needs_corner_bead', 'corner_bead_type', 'corner_bead_length',
    'corner_bead_pieces', 'drywall_notes'
  );

with option_seed as (
  select * from (values
    ('drywall_product', 'Drywall / Sheetrock', 'drywall-sheetrock', 10),
    ('sheet_size', '4′ × 8′', '4x8', 10),
    ('sheet_size', '4′ × 10′', '4x10', 20),
    ('sheet_size', '4′ × 12′', '4x12', 30),
    ('drywall_type', 'Regular', 'regular', 10),
    ('drywall_type', 'Green / Moisture Resistant', 'moisture-resistant', 20),
    ('drywall_type', 'Fire Resistant / Type X', 'type-x', 30),
    ('thickness', '3/8″', '3-8', 10),
    ('thickness', '1/2″', '1-2', 20),
    ('thickness', '5/8″', '5-8', 30)
  ) as seed(question_key, label, value, sort_order)
), target_questions as (
  select question.id, question.question_key
  from public.material_questions question
  join public.material_questionnaire_categories category on category.id = question.category_id
  where category.slug = 'sheetrock-drywall'
    and question.question_key in (select distinct question_key from option_seed)
)
insert into public.material_question_options (question_id, label, value, is_active, sort_order)
select target.id, seed.label, seed.value, true, seed.sort_order
from option_seed seed
join target_questions target on target.question_key = seed.question_key
on conflict (question_id, value) do update set
  label = excluded.label,
  is_active = true,
  sort_order = excluded.sort_order;

with target_questions as (
  select question.id, question.question_key
  from public.material_questions question
  join public.material_questionnaire_categories category on category.id = question.category_id
  where category.slug = 'sheetrock-drywall'
    and question.question_key in ('drywall_product', 'sheet_size', 'drywall_type', 'thickness')
), allowed as (
  select * from (values
    ('drywall_product', 'drywall-sheetrock'),
    ('sheet_size', '4x8'), ('sheet_size', '4x10'), ('sheet_size', '4x12'),
    ('drywall_type', 'regular'), ('drywall_type', 'moisture-resistant'), ('drywall_type', 'type-x'),
    ('thickness', '3-8'), ('thickness', '1-2'), ('thickness', '5-8')
  ) as item(question_key, value)
)
update public.material_question_options option
set is_active = false
from target_questions target
where option.question_id = target.id
  and not exists (
    select 1 from allowed
    where allowed.question_key = target.question_key and allowed.value = option.value
  );

update public.material_questionnaire_categories
set current_version = current_version + 1, updated_at = now()
where slug in ('hardwood-flooring', 'sheetrock-drywall');

-- Guests may read active definitions so the questionnaire can appear before login.
grant select on public.material_questionnaire_categories, public.material_questions, public.material_question_options to anon;

drop policy if exists "material_categories_public_read" on public.material_questionnaire_categories;
create policy "material_categories_public_read" on public.material_questionnaire_categories
for select to anon using (is_active);

drop policy if exists "material_questions_public_read" on public.material_questions;
create policy "material_questions_public_read" on public.material_questions
for select to anon using (
  is_active and exists (
    select 1 from public.material_questionnaire_categories category
    where category.id = category_id and category.is_active
  )
);

drop policy if exists "material_options_public_read" on public.material_question_options;
create policy "material_options_public_read" on public.material_question_options
for select to anon using (
  is_active and exists (
    select 1 from public.material_questions question
    join public.material_questionnaire_categories category on category.id = question.category_id
    where question.id = question_id and question.is_active and category.is_active
  )
);
