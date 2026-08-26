alter table public.aura_intakes
  drop constraint if exists aura_intakes_source_check;

alter table public.aura_intakes
  add constraint aura_intakes_source_check
  check (source in ('whatsapp', 'manual', 'email', 'sms'));
