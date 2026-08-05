create policy "projects_admin_read" on public.projects
for select to authenticated using ((select private.is_admin_or_staff()));
create policy "projects_admin_update" on public.projects
for update to authenticated using ((select private.is_admin_or_staff())) with check ((select private.is_admin_or_staff()));

create policy "project_events_admin_read" on public.project_events
for select to authenticated using ((select private.is_admin_or_staff()));
create policy "project_events_admin_insert" on public.project_events
for insert to authenticated with check ((select private.is_admin_or_staff()));

create policy "project_question_answers_admin_all" on public.project_question_answers
for all to authenticated using ((select private.is_admin_or_staff())) with check ((select private.is_admin_or_staff()));

create policy "supplier_packages_customer_insert" on public.supplier_packages
for insert to authenticated with check (
  exists (
    select 1 from public.quote_requests request
    where request.id = request_id
      and request.owner_id = (select auth.uid())
      and request.status = 'draft'
  )
);
