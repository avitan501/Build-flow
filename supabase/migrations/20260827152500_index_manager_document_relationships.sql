create index if not exists manager_documents_approved_by_idx
  on public.manager_documents(approved_by)
  where approved_by is not null;

create index if not exists manager_documents_created_by_idx
  on public.manager_documents(created_by);

create index if not exists manager_documents_project_id_idx
  on public.manager_documents(project_id)
  where project_id is not null;

create index if not exists manager_documents_request_id_idx
  on public.manager_documents(request_id)
  where request_id is not null;

create index if not exists manager_documents_updated_by_idx
  on public.manager_documents(updated_by);

create index if not exists manager_document_events_created_by_idx
  on public.manager_document_events(created_by);
