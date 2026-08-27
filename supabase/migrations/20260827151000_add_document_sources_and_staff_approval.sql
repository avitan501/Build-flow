alter table public.manager_documents
  drop constraint if exists manager_documents_document_type_check;
alter table public.manager_documents
  add constraint manager_documents_document_type_check
  check (document_type in ('supplier_quote', 'supplier_invoice', 'client_invoice', 'receipt', 'catalog_price_list', 'client_estimate', 'material_list', 'purchase_order', 'project_document', 'unknown'));

alter table public.manager_documents
  add column if not exists source_channel text not null default 'website_upload'
    check (source_channel in ('website_upload', 'email', 'whatsapp', 'sms', 'camera', 'project', 'other')),
  add column if not exists source_label text not null default 'Website upload' check (char_length(source_label) <= 200),
  add column if not exists source_reference text not null default '' check (char_length(source_reference) <= 500),
  add column if not exists source_group_id text not null default '' check (char_length(source_group_id) <= 200);

create index if not exists manager_documents_source_group_idx
  on public.manager_documents(source_channel, source_group_id)
  where source_group_id <> '';

create or replace function private.enforce_manager_document_approval()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (new.status in ('ready', 'routed') or new.approved_by is not null or new.approved_at is not null)
      and not ((select private.is_admin()) or (select private.has_staff_capability('suppliers'))) then
      raise exception 'Only approved manager staff can approve or route a manager document.';
    end if;
  elsif (
    new.status is distinct from old.status
    or new.approved_by is distinct from old.approved_by
    or new.approved_at is distinct from old.approved_at
  ) and (new.status in ('ready', 'routed') or new.approved_by is not null or new.approved_at is not null)
    and not ((select private.is_admin()) or (select private.has_staff_capability('suppliers'))) then
    raise exception 'Only approved manager staff can approve or route a manager document.';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_manager_document_approval() from public, anon;
grant execute on function private.enforce_manager_document_approval() to authenticated;
