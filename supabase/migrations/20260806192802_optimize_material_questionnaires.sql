create index if not exists material_questionnaire_responses_category_idx on public.material_questionnaire_responses(category_id);
create index if not exists material_questionnaire_responses_project_idx on public.material_questionnaire_responses(project_id, created_at desc);
create index if not exists material_questions_parent_idx on public.material_questions(conditional_parent_question_id);
create index if not exists material_request_answers_question_idx on public.material_request_answers(question_id);

drop policy if exists "material_categories_owner_manage" on public.material_questionnaire_categories;
create policy "material_categories_owner_insert" on public.material_questionnaire_categories
for insert to authenticated with check ((select private.is_material_questionnaire_owner()));
create policy "material_categories_owner_update" on public.material_questionnaire_categories
for update to authenticated using ((select private.is_material_questionnaire_owner())) with check ((select private.is_material_questionnaire_owner()));
create policy "material_categories_owner_delete" on public.material_questionnaire_categories
for delete to authenticated using ((select private.is_material_questionnaire_owner()));

drop policy if exists "material_questions_owner_manage" on public.material_questions;
create policy "material_questions_owner_insert" on public.material_questions
for insert to authenticated with check ((select private.is_material_questionnaire_owner()));
create policy "material_questions_owner_update" on public.material_questions
for update to authenticated using ((select private.is_material_questionnaire_owner())) with check ((select private.is_material_questionnaire_owner()));
create policy "material_questions_owner_delete" on public.material_questions
for delete to authenticated using ((select private.is_material_questionnaire_owner()));

drop policy if exists "material_options_owner_manage" on public.material_question_options;
create policy "material_options_owner_insert" on public.material_question_options
for insert to authenticated with check ((select private.is_material_questionnaire_owner()));
create policy "material_options_owner_update" on public.material_question_options
for update to authenticated using ((select private.is_material_questionnaire_owner())) with check ((select private.is_material_questionnaire_owner()));
create policy "material_options_owner_delete" on public.material_question_options
for delete to authenticated using ((select private.is_material_questionnaire_owner()));
