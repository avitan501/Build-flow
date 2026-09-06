create or replace function public.set_request_client_document_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.document_data is distinct from old.document_data
    or new.document_number is distinct from old.document_number then
    new.version := old.version + 1;
  else
    new.version := old.version;
  end if;
  new.updated_at := now();
  new.public_token := old.public_token;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end;
$$;

comment on function public.set_request_client_document_version() is
'Keeps resend and delivery-status updates on the current version; increments only when client-visible document content changes.';
