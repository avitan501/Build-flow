create index if not exists project_question_answers_question_idx
on public.project_question_answers(question_id);

create index if not exists quote_request_items_project_idx
on public.quote_request_items(project_id);

create index if not exists quote_request_attachments_project_idx
on public.quote_request_attachments(project_id);

create index if not exists quote_request_attachments_item_idx
on public.quote_request_attachments(item_id);

create index if not exists supplier_packages_approved_by_idx
on public.supplier_packages(approved_by);

create index if not exists workflow_manager_settings_updated_by_idx
on public.workflow_manager_settings(updated_by);

create index if not exists workflow_public_catalog_updated_by_idx
on public.workflow_public_catalog(updated_by);

drop policy if exists "workflow_public_catalog_admin_all" on public.workflow_public_catalog;

create policy "workflow_public_catalog_admin_insert" on public.workflow_public_catalog
for insert to authenticated with check ((select private.is_admin()));
create policy "workflow_public_catalog_admin_update" on public.workflow_public_catalog
for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "workflow_public_catalog_admin_delete" on public.workflow_public_catalog
for delete to authenticated using ((select private.is_admin()));
