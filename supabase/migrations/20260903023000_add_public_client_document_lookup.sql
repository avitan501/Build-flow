create or replace function public.get_request_client_document(p_public_token uuid)
returns table (
  document_type text,
  document_number text,
  document_data jsonb,
  version integer,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    document.document_type,
    document.document_number,
    document.document_data,
    document.version,
    document.updated_at
  from public.request_client_documents as document
  where document.public_token = p_public_token
  limit 1;
$$;

revoke all on function public.get_request_client_document(uuid) from public;
grant execute on function public.get_request_client_document(uuid) to anon, authenticated;

comment on function public.get_request_client_document(uuid) is
'Returns only the live client document matching an unguessable public token; it cannot list or search documents.';
