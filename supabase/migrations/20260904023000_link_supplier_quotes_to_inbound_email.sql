alter table public.supplier_quotes
  add column if not exists source_communication_id uuid
    references public.aura_communications(id) on delete set null,
  add column if not exists source_attachment_id text;

alter table public.supplier_quotes
  drop constraint if exists supplier_quotes_source_attachment_id_check,
  add constraint supplier_quotes_source_attachment_id_check
    check (
      source_attachment_id is null
      or source_attachment_id ~ '^[A-Za-z0-9_-]{1,160}$'
    );

create unique index if not exists supplier_quotes_inbound_attachment_uidx
  on public.supplier_quotes(source_communication_id, source_attachment_id)
  where source_communication_id is not null and source_attachment_id is not null;

comment on column public.supplier_quotes.source_communication_id is
  'Inbound email communication that supplied this private quote document.';
comment on column public.supplier_quotes.source_attachment_id is
  'Provider attachment identifier, unique within the source communication.';
