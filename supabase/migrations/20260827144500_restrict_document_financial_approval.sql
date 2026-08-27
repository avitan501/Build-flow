create or replace function private.enforce_manager_document_approval()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (new.status in ('ready', 'routed') or new.approved_by is not null or new.approved_at is not null)
      and not (select private.is_admin()) then
      raise exception 'Only the owner can approve or route a manager document.';
    end if;
  elsif (
    new.status is distinct from old.status
    or new.approved_by is distinct from old.approved_by
    or new.approved_at is distinct from old.approved_at
  ) and (new.status in ('ready', 'routed') or new.approved_by is not null or new.approved_at is not null)
    and not (select private.is_admin()) then
    raise exception 'Only the owner can approve or route a manager document.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_manager_document_approval on public.manager_documents;
create trigger enforce_manager_document_approval
before insert or update on public.manager_documents
for each row execute function private.enforce_manager_document_approval();

revoke all on function private.enforce_manager_document_approval() from public, anon, authenticated;
