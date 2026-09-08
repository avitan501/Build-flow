alter table public.quote_request_supplier_recommendations
  drop constraint if exists quote_request_supplier_recommendations_contact_status_check;

alter table public.quote_request_supplier_recommendations
  add constraint quote_request_supplier_recommendations_contact_status_check
  check (contact_status in (
    'not_contacted',
    'request_sent',
    'supplier_replied',
    'awaiting_supplier_reply',
    'quote_received',
    'unavailable'
  ));
