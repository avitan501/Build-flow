create or replace function public.get_request_current_client_document_acceptances(
  p_request_id uuid
)
returns table (
  acceptance_id uuid,
  request_id uuid,
  document_type text,
  document_number text,
  document_version integer,
  terms_version text,
  terms_hash text,
  signer_name text,
  signer_email text,
  accepted_at timestamptz,
  accepted_timezone text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
    or not (
      (select private.is_admin())
      or (select private.has_staff_capability('customers'))
    ) then
    raise insufficient_privilege using message = 'customer_management_permission_required';
  end if;

  return query
  select
    acceptance.id,
    document.request_id,
    document.document_type,
    document.document_number,
    document.version,
    acceptance.terms_version,
    acceptance.terms_hash,
    acceptance.signer_name,
    acceptance.signer_email,
    acceptance.accepted_at,
    acceptance.accepted_timezone
  from public.request_client_documents as document
  join public.request_client_document_acceptances as acceptance
    on acceptance.client_document_id = document.id
   and acceptance.document_version = document.version
  where document.request_id = p_request_id
  order by acceptance.accepted_at desc;
end;
$$;

revoke all on function public.get_request_current_client_document_acceptances(uuid) from public, anon;
grant execute on function public.get_request_current_client_document_acceptances(uuid) to authenticated;

comment on function public.get_request_current_client_document_acceptances(uuid) is
'Returns immutable acknowledgements only when they match the exact current request document version, restricted to authorized customer managers.';
