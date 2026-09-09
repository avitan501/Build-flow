alter table public.manager_push_queue
  drop constraint if exists manager_push_queue_event_type_check;

alter table public.manager_push_queue
  add constraint manager_push_queue_event_type_check
  check (event_type = any (array[
    'new_order'::text,
    'call_message'::text,
    'supplier_update'::text,
    'quote_approval'::text,
    'delivery_update'::text,
    'system_alert'::text,
    'test'::text
  ]));

comment on constraint manager_push_queue_event_type_check on public.manager_push_queue is
  'Allows private operational health alerts alongside established manager notification events.';
