create table public.aura_sms_request_states (
  id uuid primary key default gen_random_uuid(),
  normalized_phone text not null
    check (normalized_phone ~ '^\+[1-9][0-9]{7,14}$'),
  contact_id uuid references public.aura_contacts(id) on delete set null,
  status text not null default 'collecting'
    check (status in (
      'collecting',
      'awaiting_confirmation',
      'human_review',
      'confirmed',
      'cancelled',
      'superseded'
    )),
  intent text not null default 'material_request'
    check (char_length(intent) between 1 and 80),
  language text not null default 'en'
    check (language in ('en', 'es', 'he', 'other')),
  exact_list_only boolean not null default false,
  last_event text not null default 'message'
    check (last_event in (
      'message',
      'duplicate',
      'correction',
      'cancellation',
      'opt_out',
      'new_request'
    )),
  last_inbound_communication_id uuid
    references public.aura_communications(id) on delete set null,
  last_outbound_communication_id uuid
    references public.aura_communications(id) on delete set null,
  last_asked_slots text[] not null default '{}'
    check (cardinality(last_asked_slots) <= 3),
  question_attempts jsonb not null default '{}'::jsonb
    check (jsonb_typeof(question_attempts) = 'object'),
  pending_confirmation_id uuid
    references public.aura_sms_request_pending_confirmations(id) on delete set null,
  created_request_id uuid
    references public.quote_requests(id) on delete set null,
  handoff_reason text
    check (handoff_reason is null or char_length(handoff_reason) <= 500),
  state_version bigint not null default 1
    check (state_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  check (closed_at is null or closed_at >= created_at)
);

comment on table public.aura_sms_request_states is
  'Shadow-ready structured state for one SMS material-request intake. Existing SMS draft and confirmation tables remain authoritative until broker rollout.';
comment on column public.aura_sms_request_states.last_asked_slots is
  'The zero to three genuinely relevant missing slots requested in the latest outbound turn.';
comment on column public.aura_sms_request_states.question_attempts is
  'Per-slot prompt history used to avoid repeating answered questions and to identify stalled intake.';

create table public.aura_sms_request_state_slots (
  id uuid primary key default gen_random_uuid(),
  state_id uuid not null
    references public.aura_sms_request_states(id) on delete cascade,
  slot_key text not null
    check (slot_key in (
      'customer_name',
      'delivery_address',
      'needed_by',
      'department',
      'request_title'
    )),
  value_text text not null
    check (char_length(trim(value_text)) between 1 and 1000),
  normalized_value text
    check (normalized_value is null or char_length(normalized_value) <= 1000),
  source_communication_id uuid
    references public.aura_communications(id) on delete set null,
  confidence numeric(4,3) not null
    check (confidence between 0 and 1),
  status text not null default 'observed'
    check (status in ('observed', 'confirmed', 'superseded', 'rejected')),
  supersedes_slot_id uuid
    references public.aura_sms_request_state_slots(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (supersedes_slot_id is null or supersedes_slot_id <> id)
);

comment on table public.aura_sms_request_state_slots is
  'Current and historical scalar request facts with source-message provenance. Corrections append a replacement and supersede prior evidence.';

create table public.aura_sms_request_state_items (
  id uuid primary key default gen_random_uuid(),
  state_id uuid not null
    references public.aura_sms_request_states(id) on delete cascade,
  ordinal integer not null check (ordinal > 0),
  name text not null check (char_length(trim(name)) between 1 and 300),
  quantity numeric(14,3) not null default 1 check (quantity > 0),
  unit text not null default 'each'
    check (char_length(trim(unit)) between 1 and 40),
  specifications jsonb not null default '{}'::jsonb
    check (jsonb_typeof(specifications) = 'object'),
  source_communication_id uuid
    references public.aura_communications(id) on delete set null,
  confidence numeric(4,3) not null
    check (confidence between 0 and 1),
  status text not null default 'active'
    check (status in ('active', 'superseded', 'removed')),
  supersedes_item_id uuid
    references public.aura_sms_request_state_items(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (supersedes_item_id is null or supersedes_item_id <> id)
);

comment on table public.aura_sms_request_state_items is
  'Current and historical SMS material lines. Corrections replace rows instead of overwriting the customer evidence.';

create unique index aura_sms_request_states_one_live_phone_uidx
  on public.aura_sms_request_states(normalized_phone)
  where status in ('collecting', 'awaiting_confirmation');
create unique index aura_sms_request_states_pending_confirmation_uidx
  on public.aura_sms_request_states(pending_confirmation_id)
  where pending_confirmation_id is not null;
create unique index aura_sms_request_states_created_request_uidx
  on public.aura_sms_request_states(created_request_id)
  where created_request_id is not null;
create index aura_sms_request_states_contact_updated_idx
  on public.aura_sms_request_states(contact_id, updated_at desc);
create index aura_sms_request_states_status_updated_idx
  on public.aura_sms_request_states(status, updated_at desc);
create index aura_sms_request_states_last_inbound_idx
  on public.aura_sms_request_states(last_inbound_communication_id)
  where last_inbound_communication_id is not null;
create index aura_sms_request_states_last_outbound_idx
  on public.aura_sms_request_states(last_outbound_communication_id)
  where last_outbound_communication_id is not null;

create unique index aura_sms_request_state_slots_one_current_uidx
  on public.aura_sms_request_state_slots(state_id, slot_key)
  where status in ('observed', 'confirmed');
create index aura_sms_request_state_slots_source_idx
  on public.aura_sms_request_state_slots(source_communication_id)
  where source_communication_id is not null;
create index aura_sms_request_state_slots_supersedes_idx
  on public.aura_sms_request_state_slots(supersedes_slot_id)
  where supersedes_slot_id is not null;

create unique index aura_sms_request_state_items_active_ordinal_uidx
  on public.aura_sms_request_state_items(state_id, ordinal)
  where status = 'active';
create index aura_sms_request_state_items_state_status_idx
  on public.aura_sms_request_state_items(state_id, status, ordinal);
create index aura_sms_request_state_items_source_idx
  on public.aura_sms_request_state_items(source_communication_id)
  where source_communication_id is not null;
create index aura_sms_request_state_items_supersedes_idx
  on public.aura_sms_request_state_items(supersedes_item_id)
  where supersedes_item_id is not null;

create trigger set_aura_sms_request_states_updated_at
before update on public.aura_sms_request_states
for each row execute function public.set_aura_updated_at();

create trigger set_aura_sms_request_state_slots_updated_at
before update on public.aura_sms_request_state_slots
for each row execute function public.set_aura_updated_at();

create trigger set_aura_sms_request_state_items_updated_at
before update on public.aura_sms_request_state_items
for each row execute function public.set_aura_updated_at();

alter table public.aura_sms_request_states enable row level security;
alter table public.aura_sms_request_state_slots enable row level security;
alter table public.aura_sms_request_state_items enable row level security;

revoke all on table public.aura_sms_request_states from public, anon, authenticated;
revoke all on table public.aura_sms_request_state_slots from public, anon, authenticated;
revoke all on table public.aura_sms_request_state_items from public, anon, authenticated;

grant all on table public.aura_sms_request_states to service_role;
grant all on table public.aura_sms_request_state_slots to service_role;
grant all on table public.aura_sms_request_state_items to service_role;

grant select, update on table public.aura_sms_request_states to authenticated;
grant select, update on table public.aura_sms_request_state_slots to authenticated;
grant select, update on table public.aura_sms_request_state_items to authenticated;

create policy "aura_sms_request_states_manager_read"
on public.aura_sms_request_states for select to authenticated
using ((select private.is_admin_or_staff()));

create policy "aura_sms_request_states_manager_update"
on public.aura_sms_request_states for update to authenticated
using ((select private.is_admin_or_staff()))
with check ((select private.is_admin_or_staff()));

create policy "aura_sms_request_state_slots_manager_read"
on public.aura_sms_request_state_slots for select to authenticated
using ((select private.is_admin_or_staff()));

create policy "aura_sms_request_state_slots_manager_update"
on public.aura_sms_request_state_slots for update to authenticated
using ((select private.is_admin_or_staff()))
with check ((select private.is_admin_or_staff()));

create policy "aura_sms_request_state_items_manager_read"
on public.aura_sms_request_state_items for select to authenticated
using ((select private.is_admin_or_staff()));

create policy "aura_sms_request_state_items_manager_update"
on public.aura_sms_request_state_items for update to authenticated
using ((select private.is_admin_or_staff()))
with check ((select private.is_admin_or_staff()));
