alter table public.manager_documents
  add column if not exists suggested_department text not null default '';

update public.manager_documents
set department = 'Test'
where status in ('processing', 'error')
  and legacy_supplier_quote_id is null;

create index if not exists manager_documents_suggested_department_idx
  on public.manager_documents(suggested_department)
  where suggested_department <> '';
