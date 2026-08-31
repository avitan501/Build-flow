alter table public.aura_sms_request_states
  add column if not exists intake_phase text not null default 'items',
  add column if not exists list_completion_communication_id uuid
    references public.aura_communications(id) on delete restrict,
  add column if not exists list_completed_at timestamptz;

alter table public.aura_sms_request_states
  drop constraint if exists aura_sms_request_states_intake_phase_check;
alter table public.aura_sms_request_states
  add constraint aura_sms_request_states_intake_phase_check
  check (intake_phase in (
    'items', 'additional_items', 'delivery_address',
    'summary_confirmation', 'manager_review', 'confirmed'
  ));

update public.aura_sms_request_states
set list_complete = false,
    list_completion_communication_id = null,
    list_completed_at = null
where list_complete = true and list_completion_communication_id is null;

alter table public.aura_sms_request_states
  add constraint aura_sms_request_states_completion_evidence_check
  check (
    (list_complete = true and list_completion_communication_id is not null and list_completed_at is not null)
    or
    (list_complete = false and list_completion_communication_id is null and list_completed_at is null)
  );

alter table public.aura_sms_request_pending_confirmations
  add column if not exists state_id uuid
    references public.aura_sms_request_states(id) on delete restrict,
  add column if not exists list_completion_communication_id uuid
    references public.aura_communications(id) on delete restrict;

-- Legacy phone-only snapshots cannot satisfy the new exact-state proof. Fail
-- closed and release any stale pointer before the existing one-pending-per-
-- phone index can block a new state-bound summary.
update public.aura_sms_request_states as state
set status = case when state.status = 'awaiting_confirmation' then 'collecting' else state.status end,
    pending_confirmation_id = null,
    state_version = state_version + 1,
    updated_at = now()
from public.aura_sms_request_pending_confirmations as pending
where state.pending_confirmation_id = pending.id
  and pending.state_id is null;

update public.aura_sms_request_pending_confirmations
set status = 'superseded', updated_at = now()
where status = 'pending' and state_id is null;

alter table public.aura_sms_request_pending_confirmations
  add constraint aura_sms_pending_state_evidence_pair_check
  check (
    (state_id is null and list_completion_communication_id is null)
    or
    (state_id is not null and list_completion_communication_id is not null)
  );

create index if not exists aura_sms_request_states_completion_communication_idx
  on public.aura_sms_request_states(list_completion_communication_id)
  where list_completion_communication_id is not null;
create index if not exists aura_sms_pending_state_idx
  on public.aura_sms_request_pending_confirmations(state_id)
  where state_id is not null;
create index if not exists aura_sms_pending_completion_communication_idx
  on public.aura_sms_request_pending_confirmations(list_completion_communication_id)
  where list_completion_communication_id is not null;

create unique index if not exists aura_sms_pending_one_per_state_uidx
  on public.aura_sms_request_pending_confirmations(state_id)
  where status = 'pending' and state_id is not null;

alter table public.aura_sms_request_drafts
  add column if not exists list_complete boolean not null default false;

update public.aura_sms_request_states
set intake_phase = case
  when status = 'confirmed' then 'confirmed'
  when list_complete then 'delivery_address'
  else 'items'
end
where intake_phase = 'items';

comment on column public.aura_sms_request_states.intake_phase is
  'Canonical deterministic intake phase. A request advances from items through explicit list completion, full address, summary confirmation, and manager review.';
comment on column public.aura_sms_request_states.list_completion_communication_id is
  'Inbound customer message that explicitly finished the material list after the additional-items question.';
comment on column public.aura_sms_request_pending_confirmations.state_id is
  'Exact canonical request state whose immutable summary is awaiting confirmation.';
