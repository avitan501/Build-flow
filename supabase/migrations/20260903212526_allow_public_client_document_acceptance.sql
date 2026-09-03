create or replace function public.accept_request_client_document_public(
  p_public_token uuid,
  p_document_version integer,
  p_signer_name text,
  p_signer_email text default null
)
returns table (
  acceptance_id uuid,
  accepted_document_version integer,
  accepted_terms_version text,
  accepted_terms_hash text,
  accepted_signer_name text,
  accepted_signer_email text,
  accepted_timestamp timestamptz,
  accepted_timezone text,
  was_created boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_terms text;
  saved_terms_hash text;
begin
  select btrim(pg_catalog.regexp_replace(coalesce(document.document_data ->> 'terms', ''), E'\r\n?', E'\n', 'g'))
  into saved_terms
  from public.request_client_documents as document
  where document.public_token = p_public_token;

  if not found then
    raise exception 'client_document_not_found';
  end if;
  if saved_terms = '' then
    raise exception 'client_document_terms_invalid';
  end if;

  saved_terms_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(saved_terms, 'UTF8'), 'sha256'),
    'hex'
  );

  return query
  select result.*
  from public.accept_request_client_document(
    p_public_token,
    p_document_version,
    'avantia-client-document-terms-v2',
    saved_terms_hash,
    saved_terms,
    p_signer_name,
    p_signer_email
  ) as result;
end;
$$;

revoke all on function public.accept_request_client_document_public(uuid, integer, text, text) from public;
grant execute on function public.accept_request_client_document_public(uuid, integer, text, text) to anon, authenticated;

comment on function public.accept_request_client_document_public(uuid, integer, text, text) is
'Records acknowledgement of the exact stored document terms. The caller cannot submit or replace legal wording.';
