alter table public.aura_sms_request_drafts
  add column if not exists customer_address text,
  add column if not exists draft_kind text not null default 'create',
  add column if not exists source_communication_ids jsonb not null default '[]'::jsonb,
  add column if not exists review_note text,
  add column if not exists ai_model text;

alter table public.aura_sms_request_drafts
  drop constraint if exists aura_sms_request_drafts_kind_check;

alter table public.aura_sms_request_drafts
  add constraint aura_sms_request_drafts_kind_check
  check (draft_kind in ('create', 'update'));

alter table public.aura_sms_request_drafts
  drop constraint if exists aura_sms_request_drafts_source_ids_check;

alter table public.aura_sms_request_drafts
  add constraint aura_sms_request_drafts_source_ids_check
  check (jsonb_typeof(source_communication_ids) = 'array');

comment on column public.aura_sms_request_drafts.customer_address is
  'Customer or job address extracted from the SMS conversation and awaiting manager review.';
comment on column public.aura_sms_request_drafts.draft_kind is
  'Whether the reviewed SMS proposes a new request or an update to an existing request.';
comment on column public.aura_sms_request_drafts.source_communication_ids is
  'SMS messages used by AI to prepare the review proposal.';
