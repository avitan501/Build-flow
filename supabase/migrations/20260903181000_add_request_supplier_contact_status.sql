alter table public.quote_request_supplier_recommendations
  add column if not exists contact_status text not null default 'not_contacted';

alter table public.quote_request_supplier_recommendations
  drop constraint if exists quote_request_supplier_recommendations_contact_status_check;

alter table public.quote_request_supplier_recommendations
  add constraint quote_request_supplier_recommendations_contact_status_check
  check (contact_status in (
    'not_contacted',
    'request_sent',
    'supplier_replied',
    'awaiting_supplier_reply',
    'quote_received'
  ));

create index if not exists quote_request_supplier_recommendations_contact_status_idx
  on public.quote_request_supplier_recommendations (request_id, contact_status, updated_at desc);
