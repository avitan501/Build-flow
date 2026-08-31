alter table public.aura_sms_request_states
  add column if not exists list_complete boolean not null default false;

comment on column public.aura_sms_request_states.list_complete is
  'True only after Aura asked whether the customer needs anything else and the customer explicitly finished the list.';
