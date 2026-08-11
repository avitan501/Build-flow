-- Add the standard milling choice introduced after the initial quick-order migration.
-- Existing material-request snapshots and answers are intentionally untouched.

with target_question as (
  select question.id
  from public.material_questions question
  join public.material_questionnaire_categories category on category.id = question.category_id
  where category.slug = 'hardwood-flooring'
    and question.question_key = 'milling_cut'
)
update public.material_question_options option
set sort_order = case option.value
  when 'rift-and-quartered' then 20
  when 'rift-only' then 30
  when 'quartered-only' then 40
  else option.sort_order
end
from target_question target
where option.question_id = target.id
  and option.value in ('rift-and-quartered', 'rift-only', 'quartered-only');

with target_question as (
  select question.id
  from public.material_questions question
  join public.material_questionnaire_categories category on category.id = question.category_id
  where category.slug = 'hardwood-flooring'
    and question.question_key = 'milling_cut'
)
insert into public.material_question_options (question_id, label, value, is_active, sort_order)
select target.id, 'Plain Sawn / Standard', 'plain-sawn-standard', true, 10
from target_question target
on conflict (question_id, value) do update set
  label = excluded.label,
  is_active = true,
  sort_order = excluded.sort_order;
