-- Remove installation-method selection from new Flooring quick orders.
-- Existing request snapshots and saved answers are intentionally unchanged.

update public.material_questions question
set is_active = false,
    updated_at = now()
from public.material_questionnaire_categories category
where question.category_id = category.id
  and category.slug = 'hardwood-flooring'
  and question.question_key = 'installation_method';
